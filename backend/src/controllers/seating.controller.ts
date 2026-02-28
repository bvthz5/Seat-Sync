import { Request, Response } from "express";
import { Room, Seat, Student, User, Department, Exam, SeatAllocation } from "../models/index.js";
import { Op } from "sequelize";
import { sequelize } from "../config/database.js";

/**
 * GET /api/seating/exams
 * Simple exam list for the seating page dropdown (no joins)
 */
export const getExams = async (req: Request, res: Response) => {
    try {
        const exams = await Exam.findAll({
            attributes: ["ExamID", "ExamName", "ExamDate", "Session", "Status"],
            order: [["ExamDate", "DESC"]],
        });
        res.json(exams);
    } catch (error: any) {
        console.error("GET EXAMS ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * GET /api/seating/halls
 * List all active, exam-usable rooms with block/floor info
 */
export const getHalls = async (req: Request, res: Response) => {
    try {
        const halls = await Room.findAll({
            where: {
                Status: "Active",
            },
            order: [["RoomCode", "ASC"]],
        });
        res.json(halls);
    } catch (error: any) {
        console.error("GET HALLS ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * Helper: Auto-generate Seat rows for a room if none exist yet.
 * Uses the room's TotalRows / BenchesPerRow / SeatsPerBench values.
 * Row labels: A, B, C, ...
 */
const ensureSeatsExist = async (room: Room): Promise<void> => {
    const existing = await Seat.count({ where: { RoomID: room.RoomID } });
    if (existing > 0) return; // Already have seats

    const rows = room.TotalRows || 5;
    const benchesPerRow = room.BenchesPerRow || 6;
    const seatsPerBench = room.SeatsPerBench || 2;

    const records: { RoomID: number; RowLabel: string; BenchNumber: number; SeatNumber: number; IsActive: boolean }[] = [];

    for (let r = 0; r < rows; r++) {
        const rowLabel = String.fromCharCode(65 + r); // A, B, C ...
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

/**
 * GET /api/seating/halls/:hallId/layout
 * Returns the full seat grid for a hall grouped by row → bench → seat
 */
export const getHallLayout = async (req: Request, res: Response) => {
    try {
        const { hallId } = req.params;
        const hall = await Room.findByPk(Number(hallId));
        if (!hall) return res.status(404).json({ message: "Hall not found" });

        // Auto-generate seats if this room has none yet
        await ensureSeatsExist(hall);

        const seats = await Seat.findAll({
            where: { RoomID: Number(hallId), IsActive: true },
            order: [
                ["RowLabel", "ASC"],
                ["BenchNumber", "ASC"],
                ["SeatNumber", "ASC"],
            ],
        });

        // Group into benches: { rowLabel → benchNumber → seats[] }
        const benchMap: Record<string, Record<number, any[]>> = {};
        for (const seat of seats) {
            const row = seat.RowLabel;
            const bench = seat.BenchNumber;
            if (!benchMap[row]) benchMap[row] = {};
            if (!benchMap[row][bench]) benchMap[row][bench] = [];
            benchMap[row][bench].push(seat);
        }

        // Flatten into array of benches
        const benches: any[] = [];
        for (const row of Object.keys(benchMap).sort()) {
            const benchesInRow = benchMap[row] ?? {};
            for (const benchNum of Object.keys(benchesInRow)
                .map(Number)
                .sort((a, b) => a - b)) {
                benches.push({
                    rowLabel: row,
                    benchNumber: benchNum,
                    seats: benchesInRow[benchNum] ?? [],
                });
            }
        }

        res.json({
            hall,
            totalSeats: seats.length,
            benches,
        });
    } catch (error: any) {
        console.error("GET HALL LAYOUT ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * GET /api/seating/departments
 * List all departments with how many students are in each
 */
export const getDepartments = async (req: Request, res: Response) => {
    try {
        const departments = await Department.findAll({
            order: [["DepartmentName", "ASC"]],
        });

        // Count students per dept
        const counts: any[] = await Student.findAll({
            attributes: [
                "DepartmentID",
                [sequelize.fn("COUNT", sequelize.col("StudentID")), "studentCount"],
            ],
            group: ["DepartmentID"],
            raw: true,
        });

        const countMap: Record<number, number> = {};
        for (const c of counts) {
            countMap[c.DepartmentID] = Number(c.studentCount);
        }

        const result = departments.map((d: any) => ({
            DepartmentID: d.DepartmentID,
            DepartmentName: d.DepartmentName,
            DepartmentCode: d.DepartmentCode,
            studentCount: countMap[d.DepartmentID] || 0,
        }));

        res.json(result);
    } catch (error: any) {
        console.error("GET DEPARTMENTS ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * POST /api/seating/auto-assign
 * Body: { examId, hallId, leftDeptId, rightDeptId }
 * Returns a preview of bench assignments (not saved yet)
 */
export const autoAssign = async (req: Request, res: Response) => {
    try {
        const { examId, hallId, leftDeptId, rightDeptId } = req.body;

        if (!examId || !hallId) {
            return res.status(400).json({ message: "examId and hallId are required" });
        }

        // Auto-generate seats for this hall if none exist yet
        const hall = await Room.findByPk(Number(hallId));
        if (!hall) return res.status(404).json({ message: "Hall not found" });
        await ensureSeatsExist(hall);

        // Fetch hall layout
        const seats = await Seat.findAll({
            where: { RoomID: Number(hallId), IsActive: true },
            order: [
                ["RowLabel", "ASC"],
                ["BenchNumber", "ASC"],
                ["SeatNumber", "ASC"],
            ],
        });

        if (seats.length === 0) {
            return res.status(400).json({ message: "No active seats found for this hall" });
        }

        // Fetch students already allocated for this exam (to skip them)
        const existingAllocations = await SeatAllocation.findAll({
            where: { ExamID: Number(examId) },
        });
        const allocatedStudentIds = new Set(existingAllocations.map((a: any) => a.StudentID));

        // Fetch left-side students
        const leftStudents = leftDeptId
            ? await Student.findAll({
                where: {
                    DepartmentID: Number(leftDeptId),
                    StudentID: { [Op.notIn]: allocatedStudentIds.size > 0 ? [...allocatedStudentIds] : [-1] },
                },
                include: [
                    { model: User, attributes: ["FullName"] },
                    { model: Department, attributes: ["DepartmentCode"] },
                ],
                order: [["RegisterNumber", "ASC"]],
            })
            : [];

        // Fetch right-side students
        const rightStudents = rightDeptId
            ? await Student.findAll({
                where: {
                    DepartmentID: Number(rightDeptId),
                    StudentID: {
                        [Op.notIn]: [
                            ...(allocatedStudentIds.size > 0 ? [...allocatedStudentIds] : [-1]),
                            ...leftStudents.map((s) => s.StudentID),
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

        // Group seats into benches
        const benchMap: Record<string, Record<number, any[]>> = {};
        for (const seat of seats) {
            const key = seat.RowLabel;
            const bench = seat.BenchNumber;
            if (!benchMap[key]) benchMap[key] = {};
            if (!benchMap[key][bench]) benchMap[key][bench] = [];
            benchMap[key][bench].push(seat);
        }

        let leftIdx = 0;
        let rightIdx = 0;
        const assignments: Record<number, any> = {}; // seatId → student

        for (const row of Object.keys(benchMap).sort()) {
            const rowMap = benchMap[row] ?? {};
            for (const benchNum of Object.keys(rowMap)
                .map(Number)
                .sort((a, b) => a - b)) {
                const benchSeats = (rowMap[benchNum] ?? []).sort(
                    (a: any, b: any) => a.SeatNumber - b.SeatNumber
                );

                for (const seat of benchSeats) {
                    if (seat.SeatNumber === 1) {
                        // Left side
                        if (leftIdx < leftStudents.length) {
                            const s = leftStudents[leftIdx++] as any;
                            assignments[seat.SeatID] = {
                                seatId: seat.SeatID,
                                studentId: s.StudentID,
                                studentName: s.User?.FullName || "Unknown",
                                registerNumber: s.RegisterNumber,
                                deptCode: s.Department?.DepartmentCode || "",
                                side: "left",
                            };
                        }
                    } else {
                        // Right side
                        if (rightIdx < rightStudents.length) {
                            const s = rightStudents[rightIdx++] as any;
                            assignments[seat.SeatID] = {
                                seatId: seat.SeatID,
                                studentId: s.StudentID,
                                studentName: s.User?.FullName || "Unknown",
                                registerNumber: s.RegisterNumber,
                                deptCode: s.Department?.DepartmentCode || "",
                                side: "right",
                            };
                        }
                    }
                }
            }
        }

        res.json({
            assignments,
            leftAssigned: leftIdx,
            rightAssigned: rightIdx,
            leftTotal: leftStudents.length,
            rightTotal: rightStudents.length,
        });
    } catch (error: any) {
        console.error("AUTO-ASSIGN ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * GET /api/seating/:examId/:hallId
 * Fetch saved allocations for a specific exam + hall
 */
export const getAllocationForHall = async (req: Request, res: Response) => {
    try {
        const { examId, hallId } = req.params;

        // Get all seats in this hall
        const seats = await Seat.findAll({
            where: { RoomID: Number(hallId), IsActive: true },
        });
        const seatIds = seats.map((s) => s.SeatID);

        const allocations = await SeatAllocation.findAll({
            where: {
                ExamID: Number(examId),
                SeatID: { [Op.in]: seatIds.length > 0 ? seatIds : [-1] },
            },
            include: [
                {
                    model: Student,
                    include: [
                        { model: User, attributes: ["FullName"] },
                        { model: Department, attributes: ["DepartmentCode", "DepartmentName"] },
                    ],
                },
            ],
        });

        // Build assignment map: seatId → student info
        const assignments: Record<number, any> = {};
        for (const alloc of allocations as any[]) {
            const s = alloc.Student;
            const seat = seats.find((se) => se.SeatID === alloc.SeatID);
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

/**
 * POST /api/seating/save
 * Body: { examId, hallId, assignments: [{ seatId, studentId }] }
 * Saves (overwrites) all allocations for this hall for the exam
 */
export const saveAllocation = async (req: Request, res: Response) => {
    const transaction = await sequelize.transaction();
    try {
        const { examId, hallId, assignments } = req.body;

        if (!examId || !hallId) {
            await transaction.rollback();
            return res.status(400).json({ message: "examId and hallId are required" });
        }

        // Get all seat IDs in this hall
        const seats = await Seat.findAll({
            where: { RoomID: Number(hallId), IsActive: true },
            transaction,
        });
        const seatIds = seats.map((s) => s.SeatID);

        // Delete existing allocations for this hall + exam
        await SeatAllocation.destroy({
            where: {
                ExamID: Number(examId),
                SeatID: { [Op.in]: seatIds.length > 0 ? seatIds : [-1] },
            },
            transaction,
        });

        // Insert new allocations
        if (assignments && assignments.length > 0) {
            const records = assignments
                .filter((a: any) => a.seatId && a.studentId)
                .map((a: any) => ({
                    ExamID: Number(examId),
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

/**
 * DELETE /api/seating/:examId/:hallId
 * Clear all allocations for a hall for a given exam
 */
export const clearAllocation = async (req: Request, res: Response) => {
    try {
        const { examId, hallId } = req.params;

        const seats = await Seat.findAll({
            where: { RoomID: Number(hallId), IsActive: true },
        });
        const seatIds = seats.map((s) => s.SeatID);

        await SeatAllocation.destroy({
            where: {
                ExamID: Number(examId),
                SeatID: { [Op.in]: seatIds.length > 0 ? seatIds : [-1] },
            },
        });

        res.json({ message: "Hall allocation cleared successfully" });
    } catch (error: any) {
        console.error("CLEAR ALLOCATION ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * GET /api/seating/students/:deptId
 * List students for a department (for manual dropdown)
 */
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

        const result = students.map((s: any) => ({
            StudentID: s.StudentID,
            RegisterNumber: s.RegisterNumber,
            FullName: s.User?.FullName || "Unknown",
            DepartmentCode: s.Department?.DepartmentCode || "",
        }));

        res.json(result);
    } catch (error: any) {
        console.error("GET STUDENTS BY DEPT ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};
