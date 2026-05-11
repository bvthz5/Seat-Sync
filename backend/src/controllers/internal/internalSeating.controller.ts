import { Request, Response } from 'express';
import { Op, QueryTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { 
    InternalRoom, 
    InternalSeat, 
    InternalExam, 
    InternalExamSeries, 
    InternalSeatAllocation, 
    InternalStudent, 
    Department,
    InternalBlock,
    InternalFloor,
    InternalExamRegistration,
    InternalExamDepartment
} from '../../models/index.js';
import { InternalSeatAllocator } from '../../engines/internal/internalSeatAllocator.engine.js';

export const internalSeatingController = {
    /** Get all active halls for internal exams */
    getHalls: async (req: Request, res: Response) => {
        try {
            const halls = await InternalRoom.findAll({
                where: { Status: 'Active', ExamUsable: true },
                include: [
                    { model: InternalBlock, as: 'Block' },
                    { model: InternalFloor, as: 'Floor' }
                ],
                order: [['RoomCode', 'ASC']]
            });
            return res.json(halls);
        } catch (error: any) {
            return res.status(500).json({ message: error.message });
        }
    },

    getExamDates: async (req: Request, res: Response) => {
        try {
            const { seriesId, session } = req.query;
            if (!seriesId) return res.json([]);

            // If session provided, filter dates to only those with exams in that session
            // UPPER() ensures case-insensitive match regardless of how data was stored
            const sessionFilter = session
                ? `AND UPPER(Session) = UPPER(:session)`
                : '';

            const results = await sequelize.query(
                `SELECT DISTINCT CONVERT(VARCHAR, ExamDate, 23) as examDate
                 FROM InternalExams 
                 WHERE InternalExamSeriesID = :seriesId
                 ${sessionFilter}
                 ORDER BY examDate ASC`,
                {
                    replacements: { seriesId: Number(seriesId), session: session || null },
                    type: QueryTypes.SELECT
                }
            );

            console.log(`getExamDates: Series=${seriesId}, Session=${session}, Found ${results.length} dates`);
            return res.json(results);
        } catch (error: any) {
            console.error('getExamDates Error:', error);
            return res.status(500).json({ message: error.message });
        }
    },

    /** Get all sessions available for a series */
    getSessions: async (req: Request, res: Response) => {
        try {
            const { seriesId } = req.query;
            if (!seriesId) return res.json(['FN', 'AN']);

            const results = await sequelize.query(
                `SELECT DISTINCT UPPER(Session) as session
                 FROM InternalExams 
                 WHERE InternalExamSeriesID = :seriesId
                 ORDER BY session ASC`,
                {
                    replacements: { seriesId: Number(seriesId) },
                    type: QueryTypes.SELECT
                }
            );

            const sessions = results.length > 0
                ? (results as any[]).map((r: any) => r.session)
                : ['FN', 'AN'];

            console.log(`getSessions: Series=${seriesId}, Found sessions:`, sessions);
            return res.json(sessions);
        } catch (error: any) {
            console.error('getSessions Error:', error);
            return res.json(['FN', 'AN']);
        }
    },

    /** Get exams for a specific date and session */
    getExams: async (req: Request, res: Response) => {
        try {
            const { examDate, session, seriesId } = req.query;
            const exams = await InternalExam.findAll({
                where: {
                    ExamDate: examDate as string,
                    Session: session as string,
                    InternalExamSeriesID: seriesId as any
                },
                include: [
                    {
                        model: InternalExamDepartment,
                        include: [{ model: Department }]
                    }
                ],
                order: [['StartTime', 'ASC']]
            });
            return res.json(exams);
        } catch (error: any) {
            return res.status(500).json({ message: error.message });
        }
    },

    /** Get hall layout with current allocations — returns bench-grouped view */
    getHallLayout: async (req: Request, res: Response) => {
        try {
            const { hallId } = req.params;
            const { examDate, session, seriesId } = req.query;

            const room = await InternalRoom.findByPk(hallId as string, {
                include: [
                    { model: InternalBlock, as: 'Block' },
                    { model: InternalFloor, as: 'Floor' }
                ]
            });
            if (!room) return res.status(404).json({ message: "Room not found" });

            const seats = await InternalSeat.findAll({
                where: { RoomID: hallId as any, IsActive: true },
                order: [['RowLabel', 'ASC'], ['BenchNumber', 'ASC'], ['SeatNumber', 'ASC']]
            });

            // Fetch exams and their allocations for this hall
            const examRows = examDate && session && seriesId
                ? await sequelize.query(
                    `SELECT InternalExamID, SubjectCode, SubjectName FROM InternalExams
                     WHERE UPPER(Session) = UPPER(:session)
                       AND (CONVERT(VARCHAR, ExamDate, 23) = :examDate OR CAST(ExamDate AS DATE) = :examDate)
                       AND InternalExamSeriesID = :seriesId`,
                    {
                        replacements: { session, examDate, seriesId },
                        type: QueryTypes.SELECT
                    }
                ) as any[]
                : [];

            console.log(`[getHallLayout] Found ${examRows.length} exams for Hall=${hallId}, Date=${examDate}, Session=${session}`);

            const examMap = new Map<number, { subjectCode: string; subjectName: string }>();
            for (const ex of examRows as any[]) {
                examMap.set(ex.InternalExamID, { subjectCode: ex.SubjectCode, subjectName: ex.SubjectName });
            }

            const seatIds = seats.map(s => s.SeatID);
            const allocations = examRows.length > 0 ? await InternalSeatAllocation.findAll({
                where: {
                    InternalSeatID: { [Op.in]: seatIds.length > 0 ? seatIds : [-1] },
                    InternalExamID: { [Op.in]: examRows.map((e: any) => e.InternalExamID) }
                },
                include: [{
                    model: InternalStudent,
                    as: 'Student',
                    include: [{ model: Department, as: 'Department' }]
                }]
            }) : [];

            // Build seat → allocation map
            const allocMap = new Map<number, any>();
            for (const alloc of allocations as any[]) {
                allocMap.set(alloc.InternalSeatID, alloc);
            }

            // Build bench-grouped structure
            const benchMap = new Map<string, Map<number, { left?: any; right?: any }>>();
            for (const seat of seats) {
                if (!benchMap.has(seat.RowLabel)) benchMap.set(seat.RowLabel, new Map());
                const rowMap = benchMap.get(seat.RowLabel)!;
                if (!rowMap.has(seat.BenchNumber)) rowMap.set(seat.BenchNumber, {});
                const bench = rowMap.get(seat.BenchNumber)!;
                const alloc = allocMap.get(seat.SeatID);
                const seatInfo = {
                    seatId: seat.SeatID,
                    seatNumber: seat.SeatNumber,
                    studentId: alloc?.InternalStudentID || null,
                    registerNumber: alloc?.Student?.RegisterNumber || null,
                    name: alloc?.Student?.FullName || null,
                    deptCode: alloc?.Student?.Department?.DepartmentCode || null,
                    subjectCode: alloc ? examMap.get(alloc.InternalExamID)?.subjectCode || null : null,
                    subjectName: alloc ? examMap.get(alloc.InternalExamID)?.subjectName || null : null,
                };
                if (seat.SeatNumber === 1) bench.left = seatInfo;
                else bench.right = seatInfo;
            }

            // Convert to sorted array
            const rows = [...benchMap.keys()].sort().map(rowLabel => ({
                rowLabel,
                benches: [...benchMap.get(rowLabel)!.entries()]
                    .sort(([a], [b]) => a - b)
                    .map(([benchNumber, bench]) => ({ benchNumber, ...bench }))
            }));

            return res.json({
                room: { ...room.toJSON(), Block: (room as any).Block, Floor: (room as any).Floor },
                rows,
                totalSeats: seatIds.length,
                filledSeats: allocMap.size
            });
        } catch (error: any) {
            console.error('getHallLayout Error:', error);
            return res.status(500).json({ message: error.message });
        }
    },

    /** Get global summary of allocations for a slot */
    getSummary: async (req: Request, res: Response) => {
        try {
            const { examDate, session, seriesId } = req.query;

            // 1. Load ALL active, exam-usable internal rooms with their seat counts
            const allRooms = await InternalRoom.findAll({
                where: { Status: 'Active', ExamUsable: true },
                include: [{
                    model: InternalSeat,
                    where: { IsActive: true },
                    required: false  // LEFT JOIN — rooms with no seats still appear
                }],
                order: [['RoomCode', 'ASC']]
            });

            // Build a map: roomId -> { hallId, hallCode, total, used }
            const hallStatsMap = new Map<number, { hallId: number; hallCode: string; total: number; used: number }>();
            for (const room of allRooms) {
                const seats = (room as any).InternalSeats || [];
                hallStatsMap.set(room.RoomID, {
                    hallId: room.RoomID,
                    hallCode: room.RoomCode,
                    total: seats.length,
                    used: 0
                });
            }

            // 2. If a date/session/series was provided, overlay allocation counts
            if (examDate && session && seriesId) {
                console.log(`[getSummary] Fetching summary for: Date=${examDate}, Session=${session}, Series=${seriesId}`);
                
                // Use robust date matching and case-insensitive session matching
                const examRows = await sequelize.query(
                    `SELECT InternalExamID FROM InternalExams
                     WHERE UPPER(Session) = UPPER(:session)
                       AND (CONVERT(VARCHAR, ExamDate, 23) = :examDate OR CAST(ExamDate AS DATE) = :examDate)
                       AND InternalExamSeriesID = :seriesId`,
                    {
                        replacements: { session, examDate, seriesId },
                        type: QueryTypes.SELECT
                    }
                ) as any[];

                console.log(`[getSummary] Found ${examRows.length} matching exams`);

                if (examRows.length > 0) {
                    const examIds = examRows.map((e: any) => e.InternalExamID || e.internalexamid);
                    console.log(`[getSummary] Exam IDs: ${examIds.join(', ')}`);

                    const allocations = await InternalSeatAllocation.findAll({
                        where: { InternalExamID: { [Op.in]: examIds } },
                        include: [{
                            model: InternalSeat,
                            as: 'Seat',
                            attributes: ['RoomID']
                        }]
                    });

                    console.log(`[getSummary] Found ${allocations.length} total allocations for these exams`);

                    let matchedAllocations = 0;
                    for (const alloc of allocations) {
                        const seat = (alloc as any).Seat;
                        if (!seat?.RoomID) continue;
                        
                        // Ensure RoomID is a number for Map lookup
                        const roomId = Number(seat.RoomID);
                        const stats = hallStatsMap.get(roomId);
                        if (stats) {
                            stats.used++;
                            matchedAllocations++;
                        }
                    }
                    console.log(`[getSummary] Successfully mapped ${matchedAllocations} allocations to halls`);
                }
            }

            // 3. Return all halls sorted by code
            return res.json(
                Array.from(hallStatsMap.values())
                    .sort((a, b) => a.hallCode.localeCompare(b.hallCode))
                    .map(h => ({
                        hallId: h.hallId,
                        hallCode: h.hallCode,
                        capacity: h.total,
                        totalSeats: h.total,
                        filledSeats: h.used
                    }))
            );

        } catch (error: any) {
            return res.status(500).json({ message: error.message });
        }
    },

     /** Generate allocations using the engine */
    generateAllocation: async (req: Request, res: Response) => {
        const transaction = await sequelize.transaction();
        try {
            console.log(`[generateAllocation] Request:`, req.body);
            const result = await InternalSeatAllocator.generate(req.body, transaction);
            await transaction.commit();
            console.log(`[generateAllocation] Success:`, result);
            return res.json(result);
        } catch (error: any) {
            await transaction.rollback();
            console.error(`[generateAllocation] Error:`, error.message);
            return res.status(500).json({ message: error.message });
        }
    },

    /** Save manual allocation changes */
    saveAllocation: async (req: Request, res: Response) => {
        const transaction = await sequelize.transaction();
        try {
            const { examDate, session, hallId, assignments, seriesId } = req.body;

            const examIds = await InternalExam.findAll({
                where: { ExamDate: examDate, Session: session, InternalExamSeriesID: seriesId },
                attributes: ['InternalExamID']
            }).then(exs => exs.map(e => e.InternalExamID));

            // Clear existing for this hall
            const hallSeats = await InternalSeat.findAll({
                where: { RoomID: hallId },
                attributes: ['SeatID']
            });
            const seatIds = hallSeats.map(s => s.SeatID);

            await InternalSeatAllocation.destroy({
                where: {
                    InternalExamID: { [Op.in]: examIds },
                    InternalSeatID: { [Op.in]: seatIds }
                },
                transaction
            });

            if (assignments.length > 0) {
                await InternalSeatAllocation.bulkCreate(assignments.map((a: any) => ({
                    InternalExamID: a.examId,
                    InternalSeatID: a.seatId,
                    InternalStudentID: a.studentId
                })), { transaction });
            }

            await transaction.commit();
            return res.json({ success: true });
        } catch (error: any) {
            await transaction.rollback();
            return res.status(500).json({ message: error.message });
        }
    },

    /** Clear allocations for a hall */
    clearAllocation: async (req: Request, res: Response) => {
        try {
            const { examDate, session, hallId } = req.params;
            const { seriesId } = req.query;

            const examIds = await InternalExam.findAll({
                where: { ExamDate: examDate, Session: session, InternalExamSeriesID: seriesId as any },
                attributes: ['InternalExamID']
            }).then(exs => exs.map(e => e.InternalExamID));

            const hallSeats = await InternalSeat.findAll({
                where: { RoomID: hallId as any },
                attributes: ['SeatID']
            });
            const seatIds = hallSeats.map(s => s.SeatID);

            await InternalSeatAllocation.destroy({
                where: {
                    InternalExamID: { [Op.in]: examIds },
                    InternalSeatID: { [Op.in]: seatIds }
                }
            });

            return res.json({ success: true });
        } catch (error: any) {
            return res.status(500).json({ message: error.message });
        }
    },

    /** Clear ALL allocations for a specific date and session */
    clearAllAllocations: async (req: Request, res: Response) => {
        try {
            const { examDate, session } = req.query;
            if (!examDate || !session) return res.status(400).json({ message: "examDate and session required" });

            const exams = await InternalExam.findAll({
                where: { ExamDate: examDate as string, Session: session as string },
                attributes: ['InternalExamID']
            });

            if (exams.length === 0) return res.json({ message: "No exams found for this slot" });

            const examIds = exams.map(e => e.InternalExamID);

            const deleted = await InternalSeatAllocation.destroy({
                where: { InternalExamID: { [Op.in]: examIds } }
            });

            return res.json({ message: `Cleared ${deleted} allocations` });
        } catch (error: any) {
            return res.status(500).json({ message: error.message });
        }
    },

    /** Quick add an exam slot (placeholder for internal exams) */
    quickAddSlot: async (req: Request, res: Response) => {
        try {
            const { examDate, session, seriesId } = req.body;
            return res.json({ message: "Slot handled via exam import." });
        } catch (error: any) {
            return res.status(500).json({ message: error.message });
        }
    },

    /** Get students registered for a specific internal exam */
    getExamStudents: async (req: Request, res: Response) => {
        try {
            const { examId } = req.params;
            const registrations = await InternalExamRegistration.findAll({
                where: { InternalExamID: examId },
                include: [
                    {
                        model: InternalStudent,
                        as: 'Student',
                        include: [{ model: Department, as: 'Department' }]
                    }
                ]
            });
            return res.json({ students: registrations.map(r => r.Student) });
        } catch (error: any) {
            return res.status(500).json({ message: error.message });
        }
    },

    /** Auto-register students for internal exams based on department matching */
    autoRegisterStudents: async (req: Request, res: Response) => {
        const transaction = await sequelize.transaction();
        try {
            const { examDate, session, seriesId } = req.body;
            
            if (!examDate || !session || !seriesId) {
                return res.status(400).json({ message: "examDate, session, and seriesId are required" });
            }

            // 1. Fetch all exams for this date/session/series
            const exams = await InternalExam.findAll({
                where: {
                    ExamDate: examDate,
                    Session: session,
                    InternalExamSeriesID: seriesId
                },
                include: [{
                    model: InternalExamDepartment,
                    as: 'InternalExamDepartments',
                    attributes: ['DepartmentID']
                }],
                transaction
            });

            if (exams.length === 0) {
                return res.status(404).json({ message: "No exams found for this date/session/series" });
            }

            console.log(`[autoRegisterStudents] Found ${exams.length} exams for ${examDate} ${session}`);

            // 2. Build a map: departmentId -> list of examIds
            const deptToExams = new Map<number, number[]>();
            const examIds = new Set<number>();
            
            for (const exam of exams) {
                examIds.add(exam.InternalExamID);
                const depts = (exam as any).InternalExamDepartments || [];
                
                if (depts.length === 0) {
                    console.log(`[autoRegisterStudents] Exam ${exam.InternalExamID} (${exam.SubjectCode}) has no departments configured`);
                } else {
                    for (const dept of depts) {
                        if (!deptToExams.has(dept.DepartmentID)) {
                            deptToExams.set(dept.DepartmentID, []);
                        }
                        deptToExams.get(dept.DepartmentID)!.push(exam.InternalExamID);
                    }
                }
            }

            console.log(`[autoRegisterStudents] Department to Exams mapping:`, Array.from(deptToExams.entries()));

            // 3. Fetch all active internal students grouped by department
            const students = await InternalStudent.findAll({
                where: { Status: 'ACTIVE' },
                attributes: ['InternalStudentID', 'DepartmentID'],
                transaction
            });

            console.log(`[autoRegisterStudents] Found ${students.length} active students`);

            // 4. Get existing registrations to avoid duplicates
            const existingRegs = await InternalExamRegistration.findAll({
                where: { InternalExamID: { [Op.in]: Array.from(examIds) } },
                attributes: ['InternalExamID', 'InternalStudentID'],
                raw: true,
                transaction
            });

            const existingSet = new Set<string>();
            for (const reg of existingRegs) {
                existingSet.add(`${reg.InternalExamID}-${reg.InternalStudentID}`);
            }

            console.log(`[autoRegisterStudents] Found ${existingRegs.length} existing registrations`);

            // 5. Create new registrations
            const newRegistrations: any[] = [];
            
            for (const student of students) {
                const deptId = student.DepartmentID || 0;
                const examIdsForDept = deptToExams.get(deptId) || [];
                for (const examId of examIdsForDept) {
                    const key = `${examId}-${student.InternalStudentID}`;
                    if (!existingSet.has(key)) {
                        newRegistrations.push({
                            InternalExamID: examId,
                            InternalStudentID: student.InternalStudentID
                        });
                    }
                }
            }

            console.log(`[autoRegisterStudents] Creating ${newRegistrations.length} new registrations`);

            if (newRegistrations.length > 0) {
                await InternalExamRegistration.bulkCreate(newRegistrations, { transaction });
            }

            await transaction.commit();
            
            return res.json({
                message: `Auto-registered students successfully`,
                examCount: exams.length,
                studentCount: students.length,
                newRegistrations: newRegistrations.length,
                totalRegistrations: existingRegs.length + newRegistrations.length
            });
        } catch (error: any) {
            await transaction.rollback();
            console.error('[autoRegisterStudents] Error:', error);
            return res.status(500).json({ message: error.message });
        }
    }
};
