import { Request, Response } from 'express';
import { Op, QueryTypes, fn, col, where } from 'sequelize';
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

            const whereClause: any = { InternalExamSeriesID: Number(seriesId) };
            if (session) {
                whereClause[Op.and] = [where(fn('UPPER', col('Session')), (session as string).toUpperCase())];
            }

            const exams = await InternalExam.findAll({
                where: whereClause,
                attributes: ['ExamDate', 'Session'],
                order: [['ExamDate', 'ASC']],
                raw: true
            });

            // Group by date/session to match expected output
            const slotsMap = new Map<string, any>();
            for (const ex of (exams as any[])) {
                let dStr = String(ex.ExamDate);
                if (ex.ExamDate instanceof Date) {
                    dStr = ex.ExamDate.toISOString().split('T')[0];
                } else if (dStr.includes('T')) {
                    dStr = dStr.split('T')[0] || dStr;
                } else if (dStr.includes(' ')) {
                    dStr = dStr.split(' ')[0] || dStr;
                }
                
                const sess = ex.Session || '';
                const key = `${dStr}_${sess}`;
                if (!slotsMap.has(key)) {
                    slotsMap.set(key, { examDate: dStr, session: sess, examCount: 0 });
                }
                slotsMap.get(key).examCount++;
            }

            const slots = Array.from(slotsMap.values());
            console.log(`getExamDates: Series=${seriesId}, Session=${session || 'ALL'}, Found ${slots.length} slots`);
            return res.json(slots);
        } catch (error: any) {
            console.error('getExamDates Error:', error);
            return res.status(500).json({ message: error.message });
        }
    },

    getSessions: async (req: Request, res: Response) => {
        try {
            const { seriesId } = req.query;
            if (!seriesId) return res.json(['FN', 'AN']);

            const results = await InternalExam.findAll({
                where: { InternalExamSeriesID: Number(seriesId) },
                attributes: [[fn('DISTINCT', fn('UPPER', col('Session'))), 'session']],
                raw: true
            });

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
            if (!examDate || examDate === 'undefined' || !session || session === 'undefined' || !seriesId || seriesId === 'undefined') {
                return res.json([]);
            }
            const whereClause: any = {
                ExamDate: examDate as string,
                InternalExamSeriesID: Number(seriesId),
                [Op.and]: [where(fn('UPPER', col('Session')), (session as string).toUpperCase())]
            };
            const exams = await InternalExam.findAll({
                where: whereClause,
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
            let { examDate, session, seriesId } = req.query as any;

            if (!examDate || examDate === 'undefined' || !session || session === 'undefined' || !seriesId || seriesId === 'undefined') {
                const room = await InternalRoom.findByPk(Number(hallId));
                return res.json({
                    hallId,
                    hallCode: room?.RoomCode || 'Unknown',
                    totalCapacity: room?.TotalCapacity || 0,
                    layout: []
                });
            }

            // Clean date if it contains session suffix
            if (typeof examDate === 'string' && examDate.includes('-') && examDate.split('-').length > 3) {
                examDate = examDate.split('-').slice(0, 3).join('-');
            }

            const room = await InternalRoom.findByPk(Number(hallId), {
                include: [
                    { model: InternalBlock, as: 'Block' },
                    { model: InternalFloor, as: 'Floor' }
                ]
            });
            if (!room) return res.status(404).json({ message: "Room not found" });

            const seats = await InternalSeat.findAll({
                where: { RoomID: Number(hallId), IsActive: true },
                order: [['RowLabel', 'ASC'], ['BenchNumber', 'ASC'], ['SeatNumber', 'ASC']]
            });

            // Fetch exams and their allocations for this hall
            console.log(`[getHallLayout] Params: Hall=${hallId}, Date=${examDate}, Session=${session}, Series=${seriesId}`);
            
            const examRows = examDate && session && seriesId
                ? await InternalExam.findAll({
                    where: {
                        ExamDate: examDate,
                        InternalExamSeriesID: Number(seriesId),
                        [Op.and]: [where(fn('UPPER', col('Session')), (session as string).toUpperCase())]
                    },
                    attributes: ['InternalExamID', 'SubjectCode', 'SubjectName'],
                    raw: true
                })
                : [];

            const foundExamIds = examRows.map((e: any) => e.InternalExamID);
            console.log(`[getHallLayout] Matching Exam IDs: ${foundExamIds.join(', ')}`);

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

            console.log(`[getHallLayout] Found ${allocations.length} allocations for this hall`);

            // Build seat → allocation map
            const allocMap = new Map<number, any>();
            for (const alloc of allocations as any[]) {
                allocMap.set(alloc.InternalSeatID, alloc);
            }

            // Build bench-grouped structure
            const benchMap = new Map<string, Map<number, { left?: any; right?: any }>>();
            let matchedCount = 0;
            
            for (const seat of seats) {
                if (!benchMap.has(seat.RowLabel)) benchMap.set(seat.RowLabel, new Map());
                const rowMap = benchMap.get(seat.RowLabel)!;
                if (!rowMap.has(seat.BenchNumber)) rowMap.set(seat.BenchNumber, {});
                const bench = rowMap.get(seat.BenchNumber)!;
                
                const alloc = allocMap.get(seat.SeatID);
                if (alloc) matchedCount++;

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

            console.log(`[getHallLayout] Mapped ${matchedCount} seats to allocations out of ${seats.length} total seats`);

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
                filledSeats: allocMap.size,
                seatMode: room.SeatMode || 'Dual'
            });
        } catch (error: any) {
            console.error('getHallLayout Error:', error);
            return res.status(500).json({ message: error.message });
        }
    },

    /** Get global summary of allocations for a slot */
    getSummary: async (req: Request, res: Response) => {
        try {
            let { examDate, session, seriesId } = req.query as any;

            // Clean date if it contains session suffix
            if (typeof examDate === 'string' && examDate.includes('-') && examDate.split('-').length > 3) {
                examDate = examDate.split('-').slice(0, 3).join('-');
            }

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

            if (examDate && examDate !== 'undefined' && session && session !== 'undefined' && seriesId && seriesId !== 'undefined') {
                console.log(`[getSummary] Fetching summary for: Date=${examDate}, Session=${session}, Series=${seriesId}`);
                
                const whereClause: any = {
                    ExamDate: examDate,
                    InternalExamSeriesID: Number(seriesId),
                    [Op.and]: [where(fn('UPPER', col('Session')), (session as string).toUpperCase())]
                };
                const exams = await InternalExam.findAll({
                    where: whereClause,
                    attributes: ['InternalExamID']
                });

                console.log(`[getSummary] Found ${exams.length} matching exams`);

                if (exams.length > 0) {
                    const examIds = exams.map(e => e.InternalExamID);
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
            const payload = { ...req.body };
            // Clean date if it contains session suffix
            if (typeof payload.examDate === 'string' && payload.examDate.includes('-') && payload.examDate.split('-').length > 3) {
                payload.examDate = payload.examDate.split('-').slice(0, 3).join('-');
            }

            console.log(`[generateAllocation] Request (Sanitized):`, payload);
            const result = await InternalSeatAllocator.generate(payload, transaction);
            await transaction.commit();
            console.log(`[generateAllocation] Success:`, result);
            return res.json(result);
        } catch (error: any) {
            await transaction.rollback();
            console.error(`[generateAllocation] Error:`, error.message);
            // Use 400 for business logic/missing data errors
            const status = error.message.includes('No student') ? 400 : 500;
            return res.status(status).json({ message: error.message });
        }
    },

    /** Save manual allocation changes */
    saveAllocation: async (req: Request, res: Response) => {
        const transaction = await sequelize.transaction();
        try {
            let { examDate, session, hallId, seriesId, assignments } = req.body;

            // Clean date if it contains session suffix
            if (typeof examDate === 'string' && examDate.includes('-') && examDate.split('-').length > 3) {
                examDate = examDate.split('-').slice(0, 3).join('-');
            }

            const examIds = await InternalExam.findAll({
                where: { 
                    ExamDate: examDate, 
                    InternalExamSeriesID: Number(seriesId),
                    [Op.and]: [where(fn('UPPER', col('Session')), (session as string).toUpperCase())]
                },
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
            let { examDate, session, hallId } = req.params;
            const { seriesId } = req.query;

            // Clean date if it contains session suffix
            if (typeof examDate === 'string' && examDate.includes('-') && examDate.split('-').length > 3) {
                examDate = examDate.split('-').slice(0, 3).join('-');
            }

            const examIds = await InternalExam.findAll({
                where: { 
                    ExamDate: examDate, 
                    InternalExamSeriesID: Number(seriesId),
                    [Op.and]: [where(fn('UPPER', col('Session')), (session as string).toUpperCase())]
                },
                attributes: ['InternalExamID']
            }).then(exs => exs.map(e => e.InternalExamID));

            const hallSeats = await InternalSeat.findAll({
                where: { RoomID: Number(hallId) },
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
            let { examDate, session } = req.query as any;

            // Clean date if it contains session suffix
            if (typeof examDate === 'string' && examDate.includes('-') && examDate.split('-').length > 3) {
                examDate = examDate.split('-').slice(0, 3).join('-');
            }
            if (!examDate || !session) return res.status(400).json({ message: "examDate and session required" });

            const whereClause: any = { 
                ExamDate: examDate as string, 
                [Op.and]: [where(fn('UPPER', col('Session')), (session as string).toUpperCase())]
            };
            const exams = await InternalExam.findAll({
                where: whereClause,
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
            let { examDate, session, seriesId } = req.body;
            if (!examDate || examDate === 'undefined' || !session || session === 'undefined' || !seriesId || seriesId === 'undefined') {
                return res.status(400).json({ message: "Exam series, date, and session are required" });
            }
            
            if (!examDate || !session || !seriesId) {
                await transaction.rollback();
                return res.status(400).json({ message: "examDate, session, and seriesId are required" });
            }

            // Clean date if it contains session suffix
            if (typeof examDate === 'string' && examDate.includes('-') && examDate.split('-').length > 3) {
                examDate = examDate.split('-').slice(0, 3).join('-');
            }

            // 1. Fetch all exams for this date/session/series
            const exams = await InternalExam.findAll({
                where: {
                    ExamDate: examDate,
                    InternalExamSeriesID: Number(seriesId),
                    [Op.and]: [where(fn('UPPER', col('Session')), (session as string).toUpperCase())]
                },
                include: [{
                    model: InternalExamDepartment,
                    as: 'InternalExamDepartments',
                    attributes: ['DepartmentID']
                }],
                transaction
            });

            if (exams.length === 0) {
                await transaction.rollback();
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
