import { Request, Response } from "express";
import { Room, Seat, Student, User, Department, Exam, SeatAllocation, ExamSeries, Subject, Semester, Program } from "../models/index.js";
import { Op, QueryTypes } from "sequelize";
import { sequelize } from "../config/database.js";
import bcrypt from "bcrypt";

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
 *  GET /api/seating/exam-departments?examDate=...&session=...&seriesId=...
 *  Departments participating in the selected slot
 * ════════════════════════════════════════════════════════════ */
export const getExamDepartments = async (req: Request, res: Response) => {
    try {
        const { examDate, session, seriesId } = req.query;
        if (!examDate || !session) {
            return res.status(400).json({ message: "examDate and session are required" });
        }

        const whereParts = ["e.ExamDate = :examDate", "e.Session = :session"];
        const replacements: Record<string, any> = {
            examDate: String(examDate),
            session: String(session),
        };
        if (seriesId !== undefined && seriesId !== null && String(seriesId).trim() !== "") {
            whereParts.push("e.ExamSeriesID = :seriesId");
            replacements.seriesId = Number(seriesId);
        }

        const rows = await sequelize.query<any>(
            `
            SELECT
                d.DepartmentID,
                d.DepartmentName,
                d.DepartmentCode,
                COUNT(s.StudentID) AS studentCount
            FROM Exams e
            INNER JOIN Subjects sub ON sub.SubjectID = e.SubjectID
            INNER JOIN Departments d ON d.DepartmentID = sub.DepartmentID
            LEFT JOIN Students s ON s.DepartmentID = d.DepartmentID
            WHERE ${whereParts.join(" AND ")}
            GROUP BY d.DepartmentID, d.DepartmentName, d.DepartmentCode
            ORDER BY d.DepartmentName ASC
            `,
            { type: QueryTypes.SELECT, replacements }
        );

        res.json(rows.map((r: any) => ({
            DepartmentID: Number(r.DepartmentID),
            DepartmentName: String(r.DepartmentName || ""),
            DepartmentCode: String(r.DepartmentCode || ""),
            studentCount: Number(r.studentCount || 0),
        })));
    } catch (error: any) {
        console.error("GET EXAM DEPARTMENTS ERROR:", error);
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

        // Column-by-column: A1, B1, C1... then A2, B2, C2...
        const allRows = Object.keys(benchMap).sort();
        const allBenchNums = [...new Set(
            allRows.flatMap(r => Object.keys(benchMap[r] ?? {}).map(Number))
        )].sort((a, b) => a - b);

        for (const benchNum of allBenchNums) {
            for (const row of allRows) {
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

        const primaryExamId = examIds[0] as number; // Use first exam as FK anchor

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
        const primaryExamId = examIds[0] as number;

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

            // Column-by-column: A1, B1, C1... then A2, B2, C2...
            const allRows = Object.keys(benchMap).sort();
            const allBenchNums = [...new Set(
                allRows.flatMap(r => Object.keys(benchMap[r]!).map(Number))
            )].sort((a, b) => a - b);

            for (const benchNum of allBenchNums) {
                for (const row of allRows) {
                    const benchSeats = (benchMap[row]?.[benchNum] || []).sort((a: any, b: any) => a.SeatNumber - b.SeatNumber);
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
        const primaryExamId = examIds[0] as number;

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

        // Fetch full seat info so we can sort column-by-column per hall
        const allSeatInfo = await Seat.findAll({
            where: { SeatID: { [Op.in]: seatIds } },
            transaction,
        });
        const seatInfoMap = new Map<number, any>();
        for (const s of allSeatInfo) seatInfoMap.set(s.SeatID, s);

        // Determine hall order (by RoomCode) so multi-hall is consistent
        const roomIds = [...new Set(allSeatInfo.map((s: any) => s.RoomID))];
        const rooms = await Room.findAll({ where: { RoomID: { [Op.in]: roomIds } }, transaction });
        const roomOrder = new Map<number, string>();
        for (const r of rooms) roomOrder.set(r.RoomID, r.RoomCode);

        // Column-by-column sort: roomCode → benchNumber → rowLabel → seatNumber
        const columnSort = (seatId: number) => {
            const s = seatInfoMap.get(seatId);
            if (!s) return '';
            return `${roomOrder.get(s.RoomID) ?? ''}_${String(s.BenchNumber).padStart(6, '0')}_${s.RowLabel}_${s.SeatNumber}`;
        };

        // Sort seats column-by-column
        const leftSeats = leftAllocations.map(a => a.SeatID).sort((a, b) => columnSort(a as number).localeCompare(columnSort(b as number)));
        const rightSeats = rightAllocations.map(a => a.SeatID).sort((a, b) => columnSort(a as number).localeCompare(columnSort(b as number)));

        // Sort students by their CURRENT seat order (preserves the original sequence)
        const leftStudents = leftAllocations
            .sort((a, b) => columnSort(a.SeatID as number).localeCompare(columnSort(b.SeatID as number)))
            .map(a => a.StudentID);
        const rightStudents = rightAllocations
            .sort((a, b) => columnSort(a.SeatID as number).localeCompare(columnSort(b.SeatID as number)))
            .map(a => a.StudentID);

        // Rotate the group by a random offset — order is preserved but they start at a different room/position
        const rotate = (arr: any[], offset: number) => [...arr.slice(offset), ...arr.slice(0, offset)];
        const leftOffset = leftStudents.length > 1 ? Math.floor(Math.random() * leftStudents.length) : 0;
        const rightOffset = rightStudents.length > 1 ? Math.floor(Math.random() * rightStudents.length) : 0;
        const rotatedLeft = rotate(leftStudents, leftOffset);
        const rotatedRight = rotate(rightStudents, rightOffset);

        const newRecords: { ExamID: number; SeatID: number; StudentID: number }[] = [];
        for (let i = 0; i < leftSeats.length; i++) {
            newRecords.push({ ExamID: primaryExamId, SeatID: leftSeats[i] as number, StudentID: rotatedLeft[i] as number });
        }
        for (let i = 0; i < rightSeats.length; i++) {
            newRecords.push({ ExamID: primaryExamId, SeatID: rightSeats[i] as number, StudentID: rotatedRight[i] as number });
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

/* ════════════════════════════════════════════════════════════
 *  POST /api/seating/quick-add-slot
 *  Body: { examDate, session, seriesId? }
 *  Creates a placeholder Exam record so SeatingPlans can use the slot
 * ════════════════════════════════════════════════════════════ */
export const quickAddExamSlot = async (req: Request, res: Response) => {
    try {
        const { examDate, session, seriesId } = req.body;
        if (!examDate || !session) {
            return res.status(400).json({ message: "examDate and session are required" });
        }

        // ── Step 1: Ensure a system Program exists (needed by Semester FK) ──
        const [systemProgram] = await Program.findOrCreate({
            where: { ProgramCode: 'SYS-SEAT' },
            defaults: {
                ProgramName: 'System Seating Program',
                ProgramCode: 'SYS-SEAT',
                IsActive: true,
            }
        });

        // ── Step 2: Ensure a system Semester exists (needed by Subject FK) ──
        const [systemSemester] = await Semester.findOrCreate({
            where: { SemesterName: 'SYSTEM-SEAT-SEM' },
            defaults: {
                SemesterName: 'SYSTEM-SEAT-SEM',
                SemesterNumber: 0,
                ProgramID: systemProgram.ProgramID,
                IsActive: true,
            }
        });

        // ── Step 3: Ensure a system Department exists ──
        const [genericDept] = await Department.findOrCreate({
            where: { DepartmentCode: 'SEAT-DEPT' },
            defaults: {
                DepartmentCode: 'SEAT-DEPT',
                DepartmentName: 'Seating Management Department',
                IsActive: true,
            }
        });

        // ── Step 4: Ensure a system Subject exists ──
        const [genericSubject] = await Subject.findOrCreate({
            where: { SubjectCode: 'SEAT-SLOT' },
            defaults: {
                SubjectCode: 'SEAT-SLOT',
                SubjectName: 'Generic Seating Slot',
                DepartmentID: genericDept.DepartmentID,
                SemesterID: systemSemester.SemesterID,
            }
        });

        // ── Step 5: Check if exam slot already exists for this date+session ──
        const existing = await Exam.findOne({
            where: {
                SubjectID: genericSubject.SubjectID,
                ExamDate: examDate,
                Session: session
            }
        });

        if (existing) {
            return res.json({ message: "Slot already exists", exam: existing });
        }

        // ── Step 6: Create the placeholder exam ──
        const newExam = await Exam.create({
            SubjectID: genericSubject.SubjectID,
            ExamSeriesID: seriesId ? parseInt(seriesId) : undefined,
            ExamName: `Seating Slot - ${examDate} ${session}`,
            ExamDate: examDate as any,
            Session: session,
            Duration: 180,
            Status: new Date(examDate) < new Date() ? 'Completed' : 'Scheduled',
        } as any);

        res.json({ message: "Slot created successfully", exam: newExam });
    } catch (error: any) {
        console.error("QUICK ADD SLOT ERROR:", error);
        res.status(500).json({ message: "Failed to create slot: " + error.message });
    }
};

/* ════════════════════════════════════════════════════════════
 *  POST /api/seating/import-excel
 *  Body: { examDate, session, hallIds?: number[], rows: [{ registerNumber, side }] }
 * ════════════════════════════════════════════════════════════ */
export const importSeatingFromExcel = async (req: Request, res: Response) => {
    const transaction = await sequelize.transaction();
    try {
        const { examDate, session, hallIds, rows } = req.body;

        if (!examDate || !session || !rows || !Array.isArray(rows)) {
            await transaction.rollback();
            return res.status(400).json({ message: "examDate, session, and rows array are required" });
        }

        const examIds = await resolveExamIds(examDate, session);
        if (examIds.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ message: "No exams/slots found for this date + session. Create a slot first." });
        }
        const primaryExamId = examIds[0] as number;

        // normalize: strip all non-alphanumeric chars and uppercase
        // so "SJC/24/MCA-2001", "SJC 24 MCA 2001", "sjc24mca2001" all match "SJC24MCA2001"
        const normalize = (rn: string) => rn.replace(/[^A-Z0-9]/gi, '').toUpperCase();

        // 1. Collect input register numbers, drop blanks
        const rawInputRows = rows.map((r: any) => ({
            original: String(r.registerNumber ?? '').trim(),
            side: String(r.side ?? '').trim(),
            name: String(r.name ?? '').trim(),
        })).filter(r => r.original.length > 0);

        console.log(`[SeatingImport] rawInputRows count: ${rawInputRows.length}, sample:`, rawInputRows.slice(0, 3));

        if (rawInputRows.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ message: "No valid register numbers found in the uploaded rows" });
        }

        // 2. Fetch ALL existing students and build a normalized lookup map
        const allStudents = await sequelize.query<{ StudentID: number; RegisterNumber: string }>(
            `SELECT StudentID, RegisterNumber FROM Students`,
            { type: QueryTypes.SELECT, transaction }
        );

        console.log(`[SeatingImport] students in DB: ${allStudents.length}`);

        // normalized key -> StudentID
        const studentMap = new Map<string, number>();
        allStudents.forEach((s: any) => {
            studentMap.set(normalize(String(s.RegisterNumber)), Number(s.StudentID));
        });

        // 3. Auto-create Student records for any register number not yet in the DB
        const missingRows = rawInputRows.filter(r => !studentMap.has(normalize(r.original)));
        console.log(`[SeatingImport] missing (to auto-create): ${missingRows.length}, sample:`, missingRows.slice(0, 3));
        let autoCreatedCount = 0;

        // Pre-compute a single placeholder hash (bcrypt is slow, reuse across bulk creation)
        const placeholderHash = missingRows.length > 0 ? await bcrypt.hash('seating_import', 4) : '';

        for (const row of missingRows) {
            const regNo = row.original;
            const fullName = row.name || regNo;

            try {
                // Find-or-create a placeholder User
                const placeholderEmail = `${regNo.toLowerCase().replace(/\s+/g, '')}@seating.internal`;
                let user = await User.findOne({ where: { Email: placeholderEmail }, transaction }) as any;
                if (!user) {
                    user = await User.create({
                        Email: placeholderEmail,
                        FullName: fullName,
                        PasswordHash: placeholderHash,
                        Role: 'student',
                        IsRootAdmin: false,
                    } as any, { transaction }) as any;
                }

                const newStudent = await Student.create({
                    UserID: user.UserID,
                    RegisterNumber: regNo,
                } as any, { transaction }) as any;

                studentMap.set(normalize(regNo), Number(newStudent.StudentID));
                autoCreatedCount++;
                console.log(`[SeatingImport] Auto-created student: ${regNo} -> StudentID ${newStudent.StudentID}`);
            } catch (createErr: any) {
                console.error(`[SeatingImport] Failed to auto-create student for ${regNo}:`, createErr.message);
                await transaction.rollback();
                return res.status(500).json({
                    message: `Failed to auto-create student for "${regNo}": ${createErr.message}`
                });
            }
        }

        console.log(`[SeatingImport] autoCreatedCount: ${autoCreatedCount}, studentMap size: ${studentMap.size}`);
        console.log(`[SeatingImport] sample studentMap keys:`, [...studentMap.keys()].slice(0, 5));

        // 4. Separate into left and right student IDs, and record notFound
        const leftStudentIds: number[] = [];
        const rightStudentIds: number[] = [];
        const notFound: string[] = [];

        for (const row of rawInputRows) {
            const rn = row.original;
            const side = row.side.toLowerCase();
            const studentId = studentMap.get(normalize(rn));

            if (!studentId) {
                notFound.push(rn);
                continue;
            }

            if (side === 'l' || side === 'left') {
                leftStudentIds.push(studentId);
            } else if (side === 'r' || side === 'right') {
                rightStudentIds.push(studentId);
            } else {
                // Default unknown side to left, or could throw error
                leftStudentIds.push(studentId);
            }
        }

        console.log(`[SeatingImport] leftStudentIds: ${leftStudentIds.length}, rightStudentIds: ${rightStudentIds.length}, notFound: ${notFound.length}`);

        if (leftStudentIds.length === 0 && rightStudentIds.length === 0) {
            await transaction.rollback();
            return res.status(400).json({
                message: `Debug — Input:${rawInputRows.length} rows, DB students:${(allStudents as any[]).length}, AutoCreated:${autoCreatedCount}, NotFound:${notFound.length}. Sample input: ${JSON.stringify(rawInputRows.slice(0, 2))}. NotFound sample: ${JSON.stringify(notFound.slice(0, 3))}`,
                notFound
            });
        }

        // 3. Find target halls
        const targetHalls = hallIds && hallIds.length > 0
            ? await Room.findAll({ where: { RoomID: { [Op.in]: hallIds } }, transaction })
            : await Room.findAll({ where: { Status: 'Active' }, order: [["RoomCode", "ASC"]], transaction });

        if (targetHalls.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ message: "No target halls found" });
        }

        // 4. Distribute across halls
        let leftIdx = 0;
        let rightIdx = 0;
        const newRecords: { ExamID: number; SeatID: number; StudentID: number }[] = [];

        for (const hall of targetHalls) {
            if (leftIdx >= leftStudentIds.length && rightIdx >= rightStudentIds.length) break;

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

            // Column-by-column order: A1, B1, C1... then A2, B2, C2...
            const allRows = Object.keys(benchMap).sort();
            const allBenchNums = [...new Set(
                allRows.flatMap(r => Object.keys(benchMap[r]!).map(Number))
            )].sort((a, b) => a - b);

            for (const benchNum of allBenchNums) {
                for (const row of allRows) {
                    const benchSeats = (benchMap[row]?.[benchNum] || []).sort((a: any, b: any) => a.SeatNumber - b.SeatNumber);
                    for (const seat of benchSeats) {
                        if (seat.SeatNumber === 1 && leftIdx < leftStudentIds.length) {
                            newRecords.push({ ExamID: primaryExamId, SeatID: seat.SeatID, StudentID: leftStudentIds[leftIdx++] as number });
                        } else if (seat.SeatNumber !== 1 && rightIdx < rightStudentIds.length) {
                            newRecords.push({ ExamID: primaryExamId, SeatID: seat.SeatID, StudentID: rightStudentIds[rightIdx++] as number });
                        }
                    }
                }
            }
        }

        // Insert allocations
        if (newRecords.length > 0) {
            await SeatAllocation.bulkCreate(newRecords, { transaction });
        }

        await transaction.commit();
        res.json({
            message: "Excel seating imported successfully",
            totalAssigned: newRecords.length,
            autoCreatedCount,
            notFoundCount: notFound.length,
            notFound
        });

    } catch (error: any) {
        await transaction.rollback();
        console.error("IMPORT SEATING ERROR:", error);

        res.status(500).json({ message: error.message });
    }
};

/* ════════════════════════════════════════════════════════════
 *  GET /api/seating/search-student?examDate=&session=&q=
 *  Search for a student by register number or name and return
 *  their current hall, bench, row and side for that exam slot.
 * ════════════════════════════════════════════════════════════ */
export const searchStudent = async (req: Request, res: Response) => {
    try {
        const { examDate, session, q } = req.query as { examDate: string; session: string; q: string };
        console.log('[SearchStudent] query params:', { examDate, session, q });

        if (!examDate || !session || !q || String(q).trim().length < 2) {
            console.log('[SearchStudent] missing params - returning 400');
            return res.status(400).json({ message: "examDate, session and q (min 2 chars) are required" });
        }

        const safeTerm = String(q).trim().replace(/'/g, "''");

        // Find matching students by RegisterNumber or FullName
        const matchedStudents = await sequelize.query<{ StudentID: number; RegisterNumber: string; FullName: string }>(
            `SELECT s.StudentID, s.RegisterNumber, ISNULL(u.FullName, s.RegisterNumber) AS FullName
             FROM Students s
             LEFT JOIN Users u ON s.UserID = u.UserID
             WHERE s.RegisterNumber LIKE N'%${safeTerm}%'
                OR ISNULL(u.FullName, '') LIKE N'%${safeTerm}%'`,
            { type: QueryTypes.SELECT }
        );

        if (matchedStudents.length === 0) return res.json({ results: [] });

        console.log(`[SearchStudent] found ${matchedStudents.length} students`);
        const studentIds = (matchedStudents as any[]).map((s: any) => Number(s.StudentID));

        // Get exam IDs for this slot (for allocation lookup)
        const examIds = await resolveExamIds(examDate, session);

        // Build allocation map if exams exist
        const allocMap = new Map<number, any>();
        if (examIds.length > 0) {
            const allocations = await sequelize.query<{
                StudentID: number; SeatID: number; RowLabel: string;
                BenchNumber: number; SeatNumber: number; RoomID: number; RoomCode: string;
            }>(
                `SELECT sa.StudentID, sa.SeatID, st.RowLabel, st.BenchNumber, st.SeatNumber,
                        r.RoomID, r.RoomName AS RoomCode
                 FROM SeatAllocations sa
                 JOIN Seats st ON sa.SeatID = st.SeatID
                 JOIN Rooms r  ON st.RoomID = r.RoomID
                 WHERE sa.ExamID IN (${examIds.join(',')}) AND sa.StudentID IN (${studentIds.join(',')})`,
                { type: QueryTypes.SELECT }
            );
            for (const a of allocations as any[]) allocMap.set(Number(a.StudentID), a);
        }

        const results = (matchedStudents as any[]).map((s: any) => {
            const alloc = allocMap.get(Number(s.StudentID));
            return {
                studentId: s.StudentID,
                registerNumber: s.RegisterNumber,
                name: s.FullName,
                allocated: !!alloc,
                hallCode: alloc?.RoomCode ?? null,
                hallId: alloc?.RoomID ?? null,
                rowLabel: alloc?.RowLabel ?? null,
                benchNumber: alloc?.BenchNumber ?? null,
                side: alloc ? (Number(alloc.SeatNumber) === 1 ? 'Left' : 'Right') : null,
                seatLabel: alloc ? `${alloc.RowLabel}${alloc.BenchNumber}` : null,
            };
        });

        res.json({ results });
    } catch (error: any) {
        console.error("SEARCH STUDENT ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};
