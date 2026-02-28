import { Request, Response } from "express";
import { Room, Seat, Student, User, Department, Exam, SeatAllocation, ExamSeries } from "../models/index.js";
import { Op } from "sequelize";
import { sequelize } from "../config/database.js";

/* ────────────────────────────────────────────────────────────
 * Helper: resolve exam IDs for a given date + session
 * ──────────────────────────────────────────────────────────── */
const resolveExamIds = async (examDate: string, session: string): Promise<number[]> => {
    const exams = await Exam.findAll({
        attributes: ["ExamID"],
        where: { ExamDate: examDate, Session: session },
    });
    return exams.map(e => e.ExamID);
};

/* ────────────────────────────────────────────────────────────
 * Helper: Auto-generate Seat rows for a room if none exist yet
 * ──────────────────────────────────────────────────────────── */
const ensureSeatsExist = async (room: Room): Promise<void> => {
    const existing = await Seat.count({ where: { RoomID: room.RoomID } });
    if (existing > 0) return;

    const rows = room.TotalRows || 5;
    const benchesPerRow = room.BenchesPerRow || 6;
    const seatsPerBench = room.SeatsPerBench || 2;

    const records: { RoomID: number; RowLabel: string; BenchNumber: number; SeatNumber: number; IsActive: boolean }[] = [];
    for (let r = 0; r < rows; r++) {
        const rowLabel = String.fromCharCode(65 + r);
        for (let b = 1; b <= benchesPerRow; b++) {
            for (let s = 1; s <= seatsPerBench; s++) {
                records.push({ RoomID: room.RoomID, RowLabel: rowLabel, BenchNumber: b, SeatNumber: s, IsActive: true });
            }
        }
    }
    if (records.length > 0) {
        await Seat.bulkCreate(records as any);
        console.log(`[Seating] Auto-generated ${records.length} seats for room ${room.RoomCode}`);
    }
};

/* ════════════════════════════════════════════════════════════
 *  GET /api/seating/series
 *  Returns all exam series for the optional filter dropdown
 * ════════════════════════════════════════════════════════════ */
export const getSeries = async (_req: Request, res: Response) => {
    try {
        const series = await ExamSeries.findAll({
            attributes: ["ExamSeriesID", "SeriesName", "IsActive"],
            order: [["ExamSeriesID", "DESC"]],
        });
        res.json(series);
    } catch (error: any) {
        console.error("GET SERIES ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

/* ════════════════════════════════════════════════════════════
 *  GET /api/seating/exam-dates?seriesId=  (optional)
 *  Returns distinct dates with their session + exam count
 *  Response: [{ examDate, session, examCount }]
 * ════════════════════════════════════════════════════════════ */
export const getExamDates = async (req: Request, res: Response) => {
    try {
        const { seriesId } = req.query;
        const where: any = {};
        if (seriesId) where.ExamSeriesID = Number(seriesId);

        const exams = await Exam.findAll({
            attributes: ["ExamDate", "Session"],
            where,
            order: [["ExamDate", "ASC"]],
        });

        // Group by date+session to get counts
        const slotMap = new Map<string, { examDate: string; session: string; examCount: number }>();
        for (const exam of exams) {
            const dateStr = typeof exam.ExamDate === "string"
                ? (exam.ExamDate as string).split("T")[0]
                : new Date(exam.ExamDate).toISOString().split("T")[0];
            const key = `${dateStr}_${exam.Session}`;
            if (!slotMap.has(key)) {
                slotMap.set(key, { examDate: dateStr!, session: exam.Session, examCount: 0 });
            }
            slotMap.get(key)!.examCount++;
        }

        res.json([...slotMap.values()]);
    } catch (error: any) {
        console.error("GET EXAM DATES ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

/* ════════════════════════════════════════════════════════════
 *  GET /api/seating/halls
 * ════════════════════════════════════════════════════════════ */
export const getHalls = async (_req: Request, res: Response) => {
    try {
        const halls = await Room.findAll({
            where: { Status: "Active" },
            order: [["RoomCode", "ASC"]],
        });
        res.json(halls);
    } catch (error: any) {
        console.error("GET HALLS ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

/* ════════════════════════════════════════════════════════════
 *  GET /api/seating/halls/:hallId/layout
 * ════════════════════════════════════════════════════════════ */
export const getHallLayout = async (req: Request, res: Response) => {
    try {
        const { hallId } = req.params;
        const hall = await Room.findByPk(Number(hallId));
        if (!hall) return res.status(404).json({ message: "Hall not found" });

        await ensureSeatsExist(hall);

        // Fetch ALL seats (active + inactive) so the UI can show disabled ones
        const seats = await Seat.findAll({
            where: { RoomID: Number(hallId) },
            order: [["RowLabel", "ASC"], ["BenchNumber", "ASC"], ["SeatNumber", "ASC"]],
        });

        const activeSeats = seats.filter(s => s.IsActive).length;

        const benchMap: Record<string, Record<number, any[]>> = {};
        for (const seat of seats) {
            if (!benchMap[seat.RowLabel]) benchMap[seat.RowLabel] = {};
            const rowMap = benchMap[seat.RowLabel]!;
            if (!rowMap[seat.BenchNumber]) rowMap[seat.BenchNumber] = [];
            rowMap[seat.BenchNumber]!.push(seat);
        }

        const benches: any[] = [];
        for (const row of Object.keys(benchMap).sort()) {
            for (const benchNum of Object.keys(benchMap[row] ?? {}).map(Number).sort((a, b) => a - b)) {
                benches.push({ rowLabel: row, benchNumber: benchNum, seats: (benchMap[row] ?? {})[benchNum] ?? [] });
            }
        }

        res.json({ hall, totalSeats: activeSeats, benches });
    } catch (error: any) {
        console.error("GET HALL LAYOUT ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

/* ════════════════════════════════════════════════════════════
 *  GET /api/seating/departments
 * ════════════════════════════════════════════════════════════ */
export const getDepartments = async (_req: Request, res: Response) => {
    try {
        const departments = await Department.findAll({ order: [["DepartmentName", "ASC"]] });
        const counts: any[] = await Student.findAll({
            attributes: ["DepartmentID", [sequelize.fn("COUNT", sequelize.col("StudentID")), "studentCount"]],
            group: ["DepartmentID"],
            raw: true,
        });

        const countMap: Record<number, number> = {};
        for (const c of counts) countMap[c.DepartmentID] = Number(c.studentCount);

        res.json(departments.map((d: any) => ({
            DepartmentID: d.DepartmentID,
            DepartmentName: d.DepartmentName,
            DepartmentCode: d.DepartmentCode,
            studentCount: countMap[d.DepartmentID] || 0,
        })));
    } catch (error: any) {
        console.error("GET DEPARTMENTS ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

/* ════════════════════════════════════════════════════════════
 *  POST /api/seating/auto-assign
 *  Body: { examDate, session, hallId, leftDeptId, rightDeptId }
 * ════════════════════════════════════════════════════════════ */
export const autoAssign = async (req: Request, res: Response) => {
    try {
        const { examDate, session, hallId, leftDeptId, rightDeptId } = req.body;

        if (!examDate || !session || !hallId) {
            return res.status(400).json({ message: "examDate, session, and hallId are required" });
        }

        // Resolve exam IDs for this slot
        const examIds = await resolveExamIds(examDate, session);
        if (examIds.length === 0) {
            return res.status(400).json({ message: "No exams found for this date + session" });
        }

        // Ensure seats exist
        const hall = await Room.findByPk(Number(hallId));
        if (!hall) return res.status(404).json({ message: "Hall not found" });
        await ensureSeatsExist(hall);

        // Fetch seats
        const seats = await Seat.findAll({
            where: { RoomID: Number(hallId), IsActive: true },
            order: [["RowLabel", "ASC"], ["BenchNumber", "ASC"], ["SeatNumber", "ASC"]],
        });
        if (seats.length === 0) return res.status(400).json({ message: "No active seats found for this hall" });

        // Already-allocated students for ANY exam in this slot
        const existingAllocations = await SeatAllocation.findAll({
            where: { ExamID: { [Op.in]: examIds } },
        });
        const allocatedStudentIds = new Set(existingAllocations.map((a: any) => a.StudentID));

        // ── Fetch students ──
        let leftStudents: any[] = [];
        let rightStudents: any[] = [];
        const excludeIds = allocatedStudentIds.size > 0 ? [...allocatedStudentIds] : [-1];
        const sameDept = leftDeptId && rightDeptId && Number(leftDeptId) === Number(rightDeptId);

        if (sameDept) {
            // Same department for both sides — fetch once and split evenly
            const allStudents = await Student.findAll({
                where: {
                    DepartmentID: Number(leftDeptId),
                    StudentID: { [Op.notIn]: excludeIds },
                },
                include: [
                    { model: User, attributes: ["FullName"] },
                    { model: Department, attributes: ["DepartmentCode"] },
                ],
                order: [["RegisterNumber", "ASC"]],
            });
            // Alternate: odd index → left, even index → right
            allStudents.forEach((s, i) => {
                if (i % 2 === 0) leftStudents.push(s);
                else rightStudents.push(s);
            });
        } else {
            // Different departments
            leftStudents = leftDeptId
                ? await Student.findAll({
                    where: {
                        DepartmentID: Number(leftDeptId),
                        StudentID: { [Op.notIn]: excludeIds },
                    },
                    include: [
                        { model: User, attributes: ["FullName"] },
                        { model: Department, attributes: ["DepartmentCode"] },
                    ],
                    order: [["RegisterNumber", "ASC"]],
                })
                : [];

            rightStudents = rightDeptId
                ? await Student.findAll({
                    where: {
                        DepartmentID: Number(rightDeptId),
                        StudentID: {
                            [Op.notIn]: [
                                ...excludeIds,
                                ...leftStudents.map(s => s.StudentID),
                            ],
                        },
                    },
                    include: [
                        { model: User, attributes: ["FullName"] },
                        { model: Department, attributes: ["DepartmentCode"] },
                    ],
                    order: [["RegisterNumber", "ASC"]],
                })
                : [];
        }

        // Build bench map and assign
        const benchMap: Record<string, Record<number, any[]>> = {};
        for (const seat of seats) {
            if (!benchMap[seat.RowLabel]) benchMap[seat.RowLabel] = {};
            const rowMap = benchMap[seat.RowLabel]!;
            if (!rowMap[seat.BenchNumber]) rowMap[seat.BenchNumber] = [];
            rowMap[seat.BenchNumber]!.push(seat);
        }

        let leftIdx = 0, rightIdx = 0;
        const assignments: Record<number, any> = {};

        for (const row of Object.keys(benchMap).sort()) {
            for (const benchNum of Object.keys(benchMap[row] ?? {}).map(Number).sort((a, b) => a - b)) {
                const benchSeats = ((benchMap[row] ?? {})[benchNum] ?? []).sort((a: any, b: any) => a.SeatNumber - b.SeatNumber);
                for (const seat of benchSeats) {
                    if (seat.SeatNumber === 1 && leftIdx < leftStudents.length) {
                        const s = leftStudents[leftIdx++] as any;
                        assignments[seat.SeatID] = {
                            seatId: seat.SeatID, studentId: s.StudentID,
                            studentName: s.User?.FullName || "Unknown",
                            registerNumber: s.RegisterNumber,
                            deptCode: s.Department?.DepartmentCode || "", side: "left",
                        };
                    } else if (seat.SeatNumber !== 1 && rightIdx < rightStudents.length) {
                        const s = rightStudents[rightIdx++] as any;
                        assignments[seat.SeatID] = {
                            seatId: seat.SeatID, studentId: s.StudentID,
                            studentName: s.User?.FullName || "Unknown",
                            registerNumber: s.RegisterNumber,
                            deptCode: s.Department?.DepartmentCode || "", side: "right",
                        };
                    }
                }
            }
        }

        res.json({
            assignments, examIds,
            leftAssigned: leftIdx, rightAssigned: rightIdx,
            leftTotal: leftStudents.length, rightTotal: rightStudents.length,
        });
    } catch (error: any) {
        console.error("AUTO-ASSIGN ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

/* ════════════════════════════════════════════════════════════
 *  GET /api/seating/allocation/:examDate/:session/:hallId
 *  Fetch saved allocations for a date + session + hall
 * ════════════════════════════════════════════════════════════ */
export const getAllocationForHall = async (req: Request, res: Response) => {
    try {
        const { examDate, session, hallId } = req.params;
        const examIds = await resolveExamIds(examDate as string, session as string);
        if (examIds.length === 0) return res.json({ assignments: {} });

        const seats = await Seat.findAll({ where: { RoomID: Number(hallId), IsActive: true } });
        const seatIds = seats.map(s => s.SeatID);

        const allocations = await SeatAllocation.findAll({
            where: {
                ExamID: { [Op.in]: examIds },
                SeatID: { [Op.in]: seatIds.length > 0 ? seatIds : [-1] },
            },
            include: [{
                model: Student,
                include: [
                    { model: User, attributes: ["FullName"] },
                    { model: Department, attributes: ["DepartmentCode", "DepartmentName"] },
                ],
            }],
        });

        const assignments: Record<number, any> = {};
        for (const alloc of allocations as any[]) {
            const s = alloc.Student;
            const seat = seats.find(se => se.SeatID === alloc.SeatID);
            assignments[alloc.SeatID] = {
                seatId: alloc.SeatID,
                studentId: s?.StudentID,
                studentName: s?.User?.FullName || "Unknown",
                registerNumber: s?.RegisterNumber,
                deptCode: s?.Department?.DepartmentCode || "",
                side: seat?.SeatNumber === 1 ? "left" : "right",
            };
        }

        res.json({ assignments });
    } catch (error: any) {
        console.error("GET ALLOCATION ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

/* ════════════════════════════════════════════════════════════
 *  POST /api/seating/save
 *  Body: { examDate, session, hallId, assignments: [{ seatId, studentId }] }
 * ════════════════════════════════════════════════════════════ */
export const saveAllocation = async (req: Request, res: Response) => {
    const transaction = await sequelize.transaction();
    try {
        const { examDate, session, hallId, assignments } = req.body;
        if (!examDate || !session || !hallId) {
            await transaction.rollback();
            return res.status(400).json({ message: "examDate, session, and hallId are required" });
        }

        const examIds = await resolveExamIds(examDate, session);
        if (examIds.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ message: "No exams found for this slot" });
        }

        const primaryExamId = examIds[0]; // Use first exam as FK anchor

        const seats = await Seat.findAll({
            where: { RoomID: Number(hallId), IsActive: true },
            transaction,
        });
        const seatIds = seats.map(s => s.SeatID);

        // Delete existing allocations for ALL exams in this slot in this hall
        await SeatAllocation.destroy({
            where: {
                ExamID: { [Op.in]: examIds },
                SeatID: { [Op.in]: seatIds.length > 0 ? seatIds : [-1] },
            },
            transaction,
        });

        // Insert new allocations
        if (assignments && assignments.length > 0) {
            const records = assignments
                .filter((a: any) => a.seatId && a.studentId)
                .map((a: any) => ({
                    ExamID: primaryExamId,
                    SeatID: Number(a.seatId),
                    StudentID: Number(a.studentId),
                }));
            if (records.length > 0) {
                await SeatAllocation.bulkCreate(records, { transaction });
            }
        }

        await transaction.commit();
        res.json({ message: "Seating arrangement saved successfully" });
    } catch (error: any) {
        await transaction.rollback();
        console.error("SAVE ALLOCATION ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

/* ════════════════════════════════════════════════════════════
 *  DELETE /api/seating/allocation/:examDate/:session/:hallId
 *  Clear all allocations for a date + session + hall
 * ════════════════════════════════════════════════════════════ */
export const clearAllocation = async (req: Request, res: Response) => {
    try {
        const { examDate, session, hallId } = req.params;
        const examIds = await resolveExamIds(examDate as string, session as string);
        if (examIds.length === 0) return res.json({ message: "Nothing to clear" });

        const seats = await Seat.findAll({ where: { RoomID: Number(hallId), IsActive: true } });
        const seatIds = seats.map(s => s.SeatID);

        await SeatAllocation.destroy({
            where: {
                ExamID: { [Op.in]: examIds },
                SeatID: { [Op.in]: seatIds.length > 0 ? seatIds : [-1] },
            },
        });

        res.json({ message: "Hall allocation cleared successfully" });
    } catch (error: any) {
        console.error("CLEAR ALLOCATION ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

/* ════════════════════════════════════════════════════════════
 *  GET /api/seating/students/:deptId
 * ════════════════════════════════════════════════════════════ */
export const getStudentsByDept = async (req: Request, res: Response) => {
    try {
        const { deptId } = req.params;
        const students = await Student.findAll({
            where: { DepartmentID: Number(deptId) },
            include: [
                { model: User, attributes: ["FullName"] },
                { model: Department, attributes: ["DepartmentCode"] },
            ],
            order: [["RegisterNumber", "ASC"]],
        });

        res.json(students.map((s: any) => ({
            StudentID: s.StudentID,
            RegisterNumber: s.RegisterNumber,
            FullName: s.User?.FullName || "Unknown",
            DepartmentCode: s.Department?.DepartmentCode || "",
        })));
    } catch (error: any) {
        console.error("GET STUDENTS BY DEPT ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

/* ════════════════════════════════════════════════════════════
 *  GET /api/seating/allocation-summary/:examDate/:session
 *  Returns per-hall fill status for quick overview
 * ════════════════════════════════════════════════════════════ */
export const getAllocationSummary = async (req: Request, res: Response) => {
    try {
        const { examDate, session } = req.params;
        const examIds = await resolveExamIds(examDate as string, session as string);

        const activeHalls = await Room.findAll({ where: { Status: "Active" }, order: [["RoomCode", "ASC"]] });

        const summary: any[] = [];
        for (const hall of activeHalls) {
            const activeSeats = await Seat.count({ where: { RoomID: hall.RoomID, IsActive: true } });
            let filledSeats = 0;
            if (examIds.length > 0 && activeSeats > 0) {
                const seatIds = (await Seat.findAll({ where: { RoomID: hall.RoomID, IsActive: true }, attributes: ["SeatID"] })).map(s => s.SeatID);
                filledSeats = await SeatAllocation.count({
                    where: { ExamID: { [Op.in]: examIds }, SeatID: { [Op.in]: seatIds } },
                });
            }
            summary.push({
                hallId: hall.RoomID,
                hallCode: hall.RoomCode,
                capacity: hall.Capacity,
                totalSeats: activeSeats,
                filledSeats,
            });
        }

        res.json(summary);
    } catch (error: any) {
        console.error("ALLOCATION SUMMARY ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

/* ════════════════════════════════════════════════════════════
 *  POST /api/seating/bulk-assign
 *  Body: { examDate, session, hallIds: number[], leftDeptId, rightDeptId }
 *  Distributes students across multiple halls continuously
 * ════════════════════════════════════════════════════════════ */
export const bulkAssign = async (req: Request, res: Response) => {
    const transaction = await sequelize.transaction();
    try {
        const { examDate, session, hallIds, leftDeptId, rightDeptId } = req.body;

        if (!examDate || !session || !hallIds || hallIds.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ message: "examDate, session, and hallIds are required" });
        }

        const examIds = await resolveExamIds(examDate, session);
        if (examIds.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ message: "No exams found for this date + session" });
        }
        const primaryExamId = examIds[0];

        // Already-allocated students
        const existingAllocations = await SeatAllocation.findAll({ where: { ExamID: { [Op.in]: examIds } }, transaction });
        const allocatedStudentIds = new Set(existingAllocations.map((a: any) => a.StudentID));
        const excludeIds = allocatedStudentIds.size > 0 ? [...allocatedStudentIds] : [-1];

        // Fetch students
        let leftStudents: any[] = [];
        let rightStudents: any[] = [];
        const sameDept = leftDeptId && rightDeptId && Number(leftDeptId) === Number(rightDeptId);

        if (sameDept) {
            const allStudents = await Student.findAll({
                where: { DepartmentID: Number(leftDeptId), StudentID: { [Op.notIn]: excludeIds } },
                include: [{ model: User, attributes: ["FullName"] }, { model: Department, attributes: ["DepartmentCode"] }],
                order: [["RegisterNumber", "ASC"]], transaction,
            });
            allStudents.forEach((s, i) => { if (i % 2 === 0) leftStudents.push(s); else rightStudents.push(s); });
        } else {
            if (leftDeptId) {
                leftStudents = await Student.findAll({
                    where: { DepartmentID: Number(leftDeptId), StudentID: { [Op.notIn]: excludeIds } },
                    include: [{ model: User, attributes: ["FullName"] }, { model: Department, attributes: ["DepartmentCode"] }],
                    order: [["RegisterNumber", "ASC"]], transaction,
                });
            }
            if (rightDeptId) {
                rightStudents = await Student.findAll({
                    where: { DepartmentID: Number(rightDeptId), StudentID: { [Op.notIn]: [...excludeIds, ...leftStudents.map(s => s.StudentID)] } },
                    include: [{ model: User, attributes: ["FullName"] }, { model: Department, attributes: ["DepartmentCode"] }],
                    order: [["RegisterNumber", "ASC"]], transaction,
                });
            }
        }

        let leftIdx = 0, rightIdx = 0;
        const hallResults: any[] = [];

        for (const hallId of hallIds) {
            const hall = await Room.findByPk(Number(hallId), { transaction });
            if (!hall) continue;
            await ensureSeatsExist(hall);

            const seats = await Seat.findAll({
                where: { RoomID: hall.RoomID, IsActive: true },
                order: [["RowLabel", "ASC"], ["BenchNumber", "ASC"], ["SeatNumber", "ASC"]],
                transaction,
            });

            // Clear existing allocations for this hall + slot
            const seatIds = seats.map(s => s.SeatID);
            if (seatIds.length > 0) {
                await SeatAllocation.destroy({
                    where: { ExamID: { [Op.in]: examIds }, SeatID: { [Op.in]: seatIds } },
                    transaction,
                });
            }

            const benchMap: Record<string, Record<number, any[]>> = {};
            for (const seat of seats) {
                if (!benchMap[seat.RowLabel]) benchMap[seat.RowLabel] = {};
                const rowMap = benchMap[seat.RowLabel]!;
                if (!rowMap[seat.BenchNumber]) rowMap[seat.BenchNumber] = [];
                rowMap[seat.BenchNumber]!.push(seat);
            }

            const records: { ExamID: number; SeatID: number; StudentID: number }[] = [];
            let hallLeft = 0, hallRight = 0;

            for (const row of Object.keys(benchMap).sort()) {
                for (const benchNum of Object.keys(benchMap[row]!).map(Number).sort((a, b) => a - b)) {
                    const benchSeats = (benchMap[row]![benchNum] || []).sort((a: any, b: any) => a.SeatNumber - b.SeatNumber);
                    for (const seat of benchSeats) {
                        if (seat.SeatNumber === 1 && leftIdx < leftStudents.length) {
                            records.push({ ExamID: primaryExamId, SeatID: seat.SeatID, StudentID: leftStudents[leftIdx++].StudentID as number });
                            hallLeft++;
                        } else if (seat.SeatNumber !== 1 && rightIdx < rightStudents.length) {
                            records.push({ ExamID: primaryExamId, SeatID: seat.SeatID, StudentID: rightStudents[rightIdx++].StudentID as number });
                            hallRight++;
                        }
                    }
                }
            }

            if (records.length > 0) await SeatAllocation.bulkCreate(records, { transaction });

            hallResults.push({
                hallId: hall.RoomID, hallCode: hall.RoomCode,
                totalSeats: seats.length, filled: records.length,
                leftUsed: hallLeft, rightUsed: hallRight,
            });
        }

        await transaction.commit();
        res.json({
            hallResults,
            totalLeftAssigned: leftIdx, totalRightAssigned: rightIdx,
            totalLeftAvailable: leftStudents.length, totalRightAvailable: rightStudents.length,
        });
    } catch (error: any) {
        await transaction.rollback();
        console.error("BULK ASSIGN ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

/* ════════════════════════════════════════════════════════════
 *  POST /api/seating/shuffle-global
 *  Body: { examDate, session }
 *  Randomly shuffles all currently assigned students (lefts with lefts, rights with rights) across all halls
 * ════════════════════════════════════════════════════════════ */
export const shuffleGlobal = async (req: Request, res: Response) => {
    const transaction = await sequelize.transaction();
    try {
        const { examDate, session } = req.body;
        if (!examDate || !session) {
            await transaction.rollback();
            return res.status(400).json({ message: "examDate and session are required" });
        }

        const examIds = await resolveExamIds(examDate, session);
        if (examIds.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ message: "No exams found for this date + session" });
        }
        const primaryExamId = examIds[0];

        // Get all existing allocations
        const existingAllocations = await SeatAllocation.findAll({
            where: { ExamID: { [Op.in]: examIds } },
            transaction,
        });

        if (existingAllocations.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ message: "No students are currently allocated to shuffle" });
        }

        // Fetch all seats to determine left/right
        const seatIds = [...new Set(existingAllocations.map(a => a.SeatID))];
        const allSeats = await Seat.findAll({
            where: { SeatID: { [Op.in]: seatIds } },
            transaction,
        });
        const seatNumMap = new Map<number, number>();
        for (const s of allSeats) seatNumMap.set(s.SeatID, s.SeatNumber);

        const leftAllocations = existingAllocations.filter(a => seatNumMap.get(a.SeatID) === 1);
        const rightAllocations = existingAllocations.filter(a => seatNumMap.get(a.SeatID) !== 1);

        const shuffleArray = (array: any[]) => {
            const arr = [...array];
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        };

        const leftStudents = leftAllocations.map(a => a.StudentID);
        const rightStudents = rightAllocations.map(a => a.StudentID);

        const shuffledLeftStudents = shuffleArray(leftStudents);
        const shuffledRightStudents = shuffleArray(rightStudents);

        const leftSeats = leftAllocations.map(a => a.SeatID);
        const rightSeats = rightAllocations.map(a => a.SeatID);

        const newRecords: { ExamID: number; SeatID: number; StudentID: number }[] = [];
        for (let i = 0; i < leftSeats.length; i++) {
            newRecords.push({ ExamID: primaryExamId, SeatID: leftSeats[i], StudentID: shuffledLeftStudents[i] as number });
        }
        for (let i = 0; i < rightSeats.length; i++) {
            newRecords.push({ ExamID: primaryExamId, SeatID: rightSeats[i], StudentID: shuffledRightStudents[i] as number });
        }

        // Remove old existing ones and insert new ones
        await SeatAllocation.destroy({
            where: { ExamID: { [Op.in]: examIds } },
            transaction,
        });

        if (newRecords.length > 0) {
            await SeatAllocation.bulkCreate(newRecords, { transaction });
        }

        await transaction.commit();
        res.json({ message: "Seating scrambled successfully!", shuffledCount: newRecords.length });

    } catch (error: any) {
        await transaction.rollback();
        console.error("SHUFFLE GLOBAL ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};
