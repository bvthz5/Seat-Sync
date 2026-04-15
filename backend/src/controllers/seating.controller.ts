import { Request, Response } from "express";
import { Room, Seat, Student, User, Department, Exam, SeatAllocation, ExamSeries, Subject, Semester, Program, Zone, ExamSchedule } from "../models/index.js";
import { Op, QueryTypes } from "sequelize";
import { sequelize } from "../config/database.js";
import bcrypt from "bcrypt";
import { generateSeats } from "../services/seatEngine.js";

/* ────────────────────────────────────────────────────────────
 * Helper: resolve exam IDs for a given date + session
 * ──────────────────────────────────────────────────────────── */
const resolveExamIds = async (examDate: string, session: string, transaction?: any): Promise<number[]> => {
    const exams = await Exam.findAll({
        attributes: ["ExamID"],
        where: { ExamDate: examDate, Session: session },
        transaction
    });
    return exams.map(e => e.ExamID);
};

const resolveExamIdsForDate = async (examDate: string, transaction?: any): Promise<number[]> => {
    const exams = await Exam.findAll({
        attributes: ["ExamID"],
        where: { ExamDate: examDate },
        transaction
    });
    return exams.map(e => e.ExamID);
};

const getRegisteredStudentsByDepartment = async (
    examIds: number[],
    departmentId: number,
    excludeStudentIds: number[],
    transaction?: any
) => {
    const examSubjectRows = await sequelize.query<{ DepartmentID: number }>(
        `
        SELECT DISTINCT sub.DepartmentID
        FROM Exams e
        INNER JOIN Subjects sub ON sub.SubjectID = e.SubjectID
        WHERE e.ExamID IN (${examIds.map((_, i) => `:examId${i}`).join(",")})
        `,
        {
            type: QueryTypes.SELECT,
            replacements: examIds.reduce((acc, id, i) => ({ ...acc, [`examId${i}`]: id }), {} as Record<string, number>),
            ...(transaction ? { transaction } : {}),
        }
    );
    const slotDeptIds = new Set(examSubjectRows.map(r => Number(r.DepartmentID)).filter(Boolean));
    if (!slotDeptIds.has(Number(departmentId))) return [];

    const allDeptStudents = await Student.findAll({
        where: { DepartmentID: Number(departmentId) },
        include: [
            { model: User, attributes: ["FullName"] },
            { model: Department, attributes: ["DepartmentCode"] },
        ],
        order: [["RegisterNumber", "ASC"]],
        ...(transaction ? { transaction } : {}),
    });

    const excluded = new Set<number>(excludeStudentIds.map(Number));
    return allDeptStudents.filter((s: any) => !excluded.has(Number(s.StudentID)));
};

const getRegisteredStudentsForExamIds = async (
    examIds: number[],
    excludeStudentIds: number[],
    transaction?: any
) => {
    const examSubjectRows = await sequelize.query<{ DepartmentID: number }>(
        `
        SELECT DISTINCT sub.DepartmentID
        FROM Exams e
        INNER JOIN Subjects sub ON sub.SubjectID = e.SubjectID
        WHERE e.ExamID IN (${examIds.map((_, i) => `:examId${i}`).join(",")})
        `,
        {
            type: QueryTypes.SELECT,
            replacements: examIds.reduce((acc, id, i) => ({ ...acc, [`examId${i}`]: id }), {} as Record<string, number>),
            ...(transaction ? { transaction } : {}),
        }
    );
    const slotDeptIds = [...new Set(examSubjectRows.map(r => Number(r.DepartmentID)).filter(Boolean))];
    if (slotDeptIds.length === 0) return [];

    const allSlotStudents = await Student.findAll({
        where: { DepartmentID: { [Op.in]: slotDeptIds } },
        include: [
            { model: User, attributes: ["FullName"] },
            { model: Department, attributes: ["DepartmentCode"] },
        ],
        order: [["RegisterNumber", "ASC"]],
        ...(transaction ? { transaction } : {}),
    });

    const excluded = new Set<number>(excludeStudentIds.map(Number));
    return allSlotStudents.filter((s: any) => !excluded.has(Number(s.StudentID)));
};

const getStudentsForExamSession = async (
    examDate: string,
    slot: string,
    excludeStudentIds: number[],
    transaction?: any
) => {
    const normalizedSlot = String(slot || "").trim().toUpperCase();
    const slotAliasMap: Record<string, string[]> = {
        FN: ["FN", "FORENOON", "MORNING", "A"],
        AN: ["AN", "AFTERNOON", "EVENING", "B"],
        A: ["A", "FN", "FORENOON", "MORNING"],
        B: ["B", "AN", "AFTERNOON", "EVENING"],
    };
    const acceptedSlots = normalizedSlot
        ? Array.from(new Set([normalizedSlot, ...(slotAliasMap[normalizedSlot] || [])]))
        : [];

    const schedulesForDate = await ExamSchedule.findAll({
        where: { ExamDate: examDate },
        ...(transaction ? { transaction } : {}),
    });

    const schedules = (schedulesForDate as any[]).filter((s: any) => {
        if (acceptedSlots.length === 0) return true;
        const scheduleSlot = String(s?.Slot || "").trim().toUpperCase();
        return acceptedSlots.includes(scheduleSlot);
    });
    console.log("DEBUG: Schedules fetched:", schedules.length, { examDate, slot: normalizedSlot, acceptedSlots });

    const subjectCodes = [...new Set(
        (schedules as any[])
            .map((s: any) => String(s.SubjectCode || "").trim())
            .filter(Boolean)
    )];

    const subjects = subjectCodes.length > 0
        ? await Subject.findAll({
            where: { SubjectCode: { [Op.in]: subjectCodes } },
            ...(transaction ? { transaction } : {}),
        })
        : [];
    console.log("DEBUG: Subjects fetched:", subjects.length);

    const subjectIds = [...new Set((subjects as any[]).map((s: any) => Number(s.SubjectID)).filter(Boolean))];

    // Fallback: if timetable schedules are missing/mismatched, derive eligible students
    // from Exams -> Subjects(departments) for the selected date/session.
    if (subjectIds.length === 0) {
        const fallbackSession = normalizedSlot === "A" ? "FN" : normalizedSlot === "B" ? "AN" : normalizedSlot;
        if (fallbackSession) {
            const examIds = await resolveExamIds(examDate, fallbackSession, transaction);
            if (examIds.length > 0) {
                const fallbackStudents = await getRegisteredStudentsForExamIds(examIds, excludeStudentIds, transaction);
                console.log("DEBUG: Fallback students fetched:", fallbackStudents.length, { examDate, fallbackSession });
                return fallbackStudents;
            }
        }
    }

    const where: any = {};
    const excluded = excludeStudentIds.map(Number).filter(Boolean);
    if (excluded.length > 0) {
        where.StudentID = { [Op.notIn]: excluded };
    }

    const students = await Student.findAll({
        where,
        include: [
            { model: User, attributes: ["FullName"] },
            { model: Department, attributes: ["DepartmentCode"] },
            {
                model: Subject,
                where: { SubjectID: { [Op.in]: subjectIds.length > 0 ? subjectIds : [-1] } },
                required: true,
                through: { attributes: [] },
            },
        ],
        ...(transaction ? { transaction } : {}),
    });
    console.log("DEBUG: Students fetched:", students.length);

    const uniqueStudents = Array.from(
        new Map((students as any[]).map((s: any) => [s.StudentID, s])).values()
    );
    return uniqueStudents;
};

const getDefaultZoneIdForRoom = async (roomId: number): Promise<number | null> => {
    const zone = await Zone.findOne({
        where: { RoomID: roomId },
        attributes: ["ZoneID"],
        order: [["ZoneID", "ASC"]],
    }) as any;
    return zone?.ZoneID ? Number(zone.ZoneID) : null;
};

const getSeatOrderBySchema = async (roomId: number, transaction?: any) => {
    return Seat.findAll({
        where: { RoomID: roomId, IsActive: true } as any,
        order: [["RowIndex", "ASC"], ["BenchIndex", "ASC"], ["SeatIndex", "ASC"]],
        ...(transaction ? { transaction } : {}),
    } as any);
};

const getRowLabel = (seat: any): string => String(seat?.RowIndex ?? seat?.RowLabel ?? "");
const getBenchNumber = (seat: any): number => Number(seat?.BenchIndex ?? seat?.BenchNumber ?? 0);
const getSeatNumber = (seat: any): number => Number(seat?.SeatIndex ?? seat?.SeatNumber ?? 0);

const sortSeatsByPosition = (a: any, b: any) => {
    const ar = getRowLabel(a);
    const br = getRowLabel(b);
    if (ar !== br) return ar.localeCompare(br);
    const ab = getBenchNumber(a);
    const bb = getBenchNumber(b);
    if (ab !== bb) return ab - bb;
    return getSeatNumber(a) - getSeatNumber(b);
};

/* ────────────────────────────────────────────────────────────
 * Helper: Auto-generate Seat rows for a room if none exist yet
 * ──────────────────────────────────────────────────────────── */
const ensureSeatsExist = async (room: Room, transaction?: any): Promise<void> => {
    const queryOptions = transaction ? { transaction } : {};
    const existingSeats = await Seat.findAll({
        where: { RoomID: room.RoomID },
        attributes: [
            "SeatID",
            "RowIndex",
            "BenchIndex",
            "SeatIndex"
        ],
        ...queryOptions,
    } as any);

    let rowLayout: any = (room as any).RowLayout;
    if (typeof rowLayout === "string") {
        try { rowLayout = JSON.parse(rowLayout); } catch { rowLayout = []; }
    }
    const layout: number[] = Array.isArray(rowLayout)
        ? rowLayout.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n) && n > 0)
        : [];
    const seatsPerBench = Math.max(1, Number((room as any).SeatsPerBench || 2));

    const expectedKeys = new Set<string>();
    for (let r = 0; r < layout.length; r++) {
        const rowLabel = String.fromCharCode(65 + r);
        const benches = layout[r] || 0;
        for (let b = 1; b <= benches; b++) {
            for (let s = 1; s <= seatsPerBench; s++) {
                expectedKeys.add(`${rowLabel}-${b}-${s}`);
            }
        }
    }

    const existingKeys = new Set(
        (existingSeats as any[]).map((s: any) => `${String(s.RowIndex)}-${Number(s.BenchIndex)}-${Number(s.SeatIndex)}`)
    );

    const hasLayoutMismatch =
        existingSeats.length === 0 ||
        existingKeys.size !== expectedKeys.size ||
        [...existingKeys].some((k) => !expectedKeys.has(k));

    if (hasLayoutMismatch) {
        await generateSeats(room as any, transaction);
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
        res.status(500).json({ message: error.message || String(error), stack: error.stack });
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
        res.status(500).json({ message: (error instanceof Error ? error.message : String(error)) });
    }
};

/* ════════════════════════════════════════════════════════════
 *  GET /api/seating/exam-departments?examDate=...&seriesId=...
 *  Departments participating on the selected day (all sessions)
 * ════════════════════════════════════════════════════════════ */
export const getExamDepartments = async (req: Request, res: Response) => {
    try {
        const { examDate, session, seriesId } = req.query;
        if (!examDate) {
            return res.status(400).json({ message: "examDate is required" });
        }

        const whereParts = ["e.ExamDate = :examDate"];
        const replacements: Record<string, any> = {
            examDate: String(examDate),
        };
        if (seriesId !== undefined && seriesId !== null && String(seriesId).trim() !== "") {
            whereParts.push("e.ExamSeriesID = :seriesId");
            replacements.seriesId = Number(seriesId);
        }

        const rows = await sequelize.query<any>(
            `
            WITH DayExams AS (
                SELECT e.ExamID, sub.DepartmentID
                FROM Exams e
                INNER JOIN Subjects sub ON sub.SubjectID = e.SubjectID
                WHERE ${whereParts.join(" AND ")}
            ),
            DayDepartments AS (
                SELECT DISTINCT DepartmentID FROM DayExams
            ),
            DepartmentTotals AS (
                SELECT
                    DepartmentID,
                    COUNT(*) AS deptCount
                FROM Students
                GROUP BY DepartmentID
            )
            SELECT
                d.DepartmentID,
                d.DepartmentName,
                d.DepartmentCode,
                ISNULL(dt.deptCount, 0) AS studentCount
            FROM DayDepartments sd
            INNER JOIN Departments d ON d.DepartmentID = sd.DepartmentID
            LEFT JOIN DepartmentTotals dt ON dt.DepartmentID = sd.DepartmentID
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
        res.status(500).json({ message: (error instanceof Error ? error.message : String(error)) });
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
        res.status(500).json({ message: (error instanceof Error ? error.message : String(error)) });
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
            order: [["RowIndex", "ASC"], ["BenchIndex", "ASC"], ["SeatIndex", "ASC"]],
        });

        const activeSeats = seats.filter(s => s.IsActive).length;

        const benchMap: Record<string, Record<number, any[]>> = {};
        for (const seat of seats) {
            const rowLabel = getRowLabel(seat);
            const benchNumber = getBenchNumber(seat);
            const seatNumber = getSeatNumber(seat);
            const normalizedSeat = {
                ...(typeof (seat as any).toJSON === "function" ? (seat as any).toJSON() : seat),
                RowLabel: rowLabel,
                BenchNumber: benchNumber,
                SeatNumber: seatNumber,
                RowIndex: rowLabel,
                BenchIndex: benchNumber,
                SeatIndex: seatNumber,
            };
            if (!benchMap[rowLabel]) benchMap[rowLabel] = {};
            const rowMap = benchMap[rowLabel]!;
            if (!rowMap[benchNumber]) rowMap[benchNumber] = [];
            rowMap[benchNumber]!.push(normalizedSeat);
        }

        const benches: any[] = [];
        for (const row of Object.keys(benchMap).sort()) {
            for (const benchNum of Object.keys(benchMap[row] ?? {}).map(Number).sort((a, b) => a - b)) {
                benches.push({ rowLabel: row, benchNumber: benchNum, seats: (benchMap[row] ?? {})[benchNum] ?? [] });
            }
        }

        res.json({ hall, totalSeats: Number((hall as any).Capacity || activeSeats), benches });
    } catch (error: any) {
        console.error("GET HALL LAYOUT ERROR:", error);
        res.status(500).json({ message: (error instanceof Error ? error.message : String(error)) });
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
        res.status(500).json({ message: (error instanceof Error ? error.message : String(error)) });
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
            attributes: ["SeatID", "RowIndex", "BenchIndex", "SeatIndex"],
            order: [["RowIndex", "ASC"], ["BenchIndex", "ASC"], ["SeatIndex", "ASC"]],
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
            // Same department for both sides: keep left side continuous.
            const allStudents = await getRegisteredStudentsByDepartment(
                examIds,
                Number(leftDeptId),
                excludeIds
            );
            leftStudents = allStudents;
            rightStudents = [];
        } else {
            // Different departments
            leftStudents = leftDeptId
                ? await getRegisteredStudentsByDepartment(
                    examIds,
                    Number(leftDeptId),
                    excludeIds
                )
                : [];

            rightStudents = rightDeptId
                ? await getRegisteredStudentsByDepartment(
                    examIds,
                    Number(rightDeptId),
                    [
                        ...excludeIds,
                        ...leftStudents.map(s => s.StudentID),
                    ]
                )
                : [];
        }

        // Build bench map and assign
        const benchMap: Record<string, Record<number, any[]>> = {};
        for (const seat of seats) {
            const rowLabel = getRowLabel(seat);
            const benchNumber = getBenchNumber(seat);
            if (!benchMap[rowLabel]) benchMap[rowLabel] = {};
            const rowMap = benchMap[rowLabel]!;
            if (!rowMap[benchNumber]) rowMap[benchNumber] = [];
            rowMap[benchNumber]!.push(seat);
        }

        let leftIdx = 0, rightIdx = 0;
        const assignments: Record<number, any> = {};

        // Column-by-column: A1, B1, C1... then A2, B2, C2...
        const allRows = Object.keys(benchMap).sort();
        const allBenchNums = [...new Set(
            allRows.flatMap(r => Object.keys(benchMap[r] ?? {}).map(Number))
        )].sort((a, b) => a - b);

        const findCandidateIndex = (arr: any[], startIdx: number, avoidDeptCode?: string): number => {
            if (startIdx >= arr.length) return -1;
            if (!avoidDeptCode) return startIdx;
            for (let i = startIdx; i < arr.length; i++) {
                const code = String(arr[i]?.Department?.DepartmentCode || "");
                if (code !== avoidDeptCode) return i;
            }
            return -1;
        };

        for (const row of allRows) {
                for (const benchNum of allBenchNums) {
                const benchSeats = ((benchMap[row] ?? {})[benchNum] ?? []).sort(sortSeatsByPosition);
                let currentBenchLeftDept = "";
                for (const seat of benchSeats) {
                    if (getSeatNumber(seat) === 1 && leftIdx < leftStudents.length) {
                        const s = leftStudents[leftIdx++] as any;
                        currentBenchLeftDept = String(s?.Department?.DepartmentCode || "");
                        assignments[seat.SeatID] = {
                            seatId: seat.SeatID, studentId: s.StudentID,
                            studentName: s.User?.FullName || "Unknown",
                            registerNumber: s.RegisterNumber,
                            deptCode: s.Department?.DepartmentCode || "", side: "left",
                        };
                    } else if (getSeatNumber(seat) !== 1 && rightIdx < rightStudents.length) {
                        const ri = findCandidateIndex(rightStudents, rightIdx, currentBenchLeftDept);
                        if (ri !== -1) {
                            if (ri !== rightIdx) [rightStudents[rightIdx], rightStudents[ri]] = [rightStudents[ri], rightStudents[rightIdx]];
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
        }

        res.json({
            assignments, examIds,
            leftAssigned: leftIdx, rightAssigned: rightIdx,
            leftTotal: leftStudents.length, rightTotal: rightStudents.length,
        });
    } catch (error: any) {
        console.error("AUTO-ASSIGN ERROR:", error);
        res.status(500).json({ message: (error instanceof Error ? error.message : String(error)) });
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
                side: getSeatNumber(seat as any) === 1 ? "left" : "right",
            };
        }

        res.json({ assignments });
    } catch (error: any) {
        console.error("GET ALLOCATION ERROR:", error);
        res.status(500).json({ message: (error instanceof Error ? error.message : String(error)) });
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

        const examIds = await resolveExamIds(examDate, session, transaction);
        if (examIds.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ message: "No exams found for this slot" });
        }

        const primaryExamId = examIds[0] as number; // Use first exam as FK anchor

        const seats = await Seat.findAll({
            where: { RoomID: Number(hallId), IsActive: true },
            attributes: ["SeatID", "RowIndex", "BenchIndex", "SeatIndex"],
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
        res.status(500).json({ message: (error instanceof Error ? error.message : String(error)) });
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
        res.status(500).json({ message: (error instanceof Error ? error.message : String(error)) });
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
        res.status(500).json({ message: (error instanceof Error ? error.message : String(error)) });
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
        
        // Optimize: Do an aggregated count of active seats and allocations by RoomID
        const activeSeatsCounts = await Seat.findAll({
            where: { IsActive: true },
            attributes: ["RoomID", [sequelize.fn("COUNT", sequelize.col("SeatID")), "count"]],
            group: ["RoomID"],
            raw: true,
        }) as any[];
        
        const seatCountMap = new Map<number, number>();
        for (const r of activeSeatsCounts) {
            seatCountMap.set(r.RoomID, Number(r.count));
        }

        const allocationCountMap = new Map<number, number>();
        if (examIds.length > 0) {
            const allocations = await SeatAllocation.findAll({
                where: { ExamID: { [Op.in]: examIds } },
                include: [{ model: Seat, attributes: ["RoomID"] }],
                attributes: [[sequelize.col("Seat.RoomID"), "RoomID"], [sequelize.fn("COUNT", sequelize.col("SeatAllocation.SeatID")), "count"]],
                group: ["Seat.RoomID"],
                raw: true,
            }) as any[];
            for (const r of allocations) {
                allocationCountMap.set(r.RoomID, Number(r.count));
            }
        }

        const summary: any[] = [];
        for (const hall of activeHalls) {
            const totalSeats = Number(hall.Capacity || 0);
            const activeSeats = seatCountMap.get(hall.RoomID) || 0;
            const filledSeats = allocationCountMap.get(hall.RoomID) || 0;
            
            summary.push({
                hallId: hall.RoomID,
                hallCode: hall.RoomCode,
                capacity: hall.Capacity,
                totalSeats: totalSeats,
                filledSeats,
            });
        }

        res.json(summary);
    } catch (error: any) {
        console.error("ALLOCATION SUMMARY ERROR:", error);
        res.status(500).json({ message: (error instanceof Error ? error.message : String(error)) });
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
        console.log("=== BACKEND HIT ===");
        console.log("req.body:", req.body);
        console.log("payload fields:", {
            examDate: (req.body as any)?.examDate,
            session: (req.body as any)?.session,
            hallIds: (req.body as any)?.hallIds,
            hallIdsLength: Array.isArray((req.body as any)?.hallIds) ? (req.body as any).hallIds.length : 0,
            mode: (req.body as any)?.mode,
            primaryDeptId: (req.body as any)?.primaryDeptId,
            secondaryDeptId: (req.body as any)?.secondaryDeptId,
            avoidSameDeptBench: (req.body as any)?.avoidSameDeptBench,
        });
        const {
            examDate,
            session,
            slot,
            hallIds,
            leftDeptId,
            rightDeptId,
            mode,
            primaryDeptId,
            secondaryDeptId,
            avoidSameDeptBench,
        } = req.body;

        if (!examDate || !session || !hallIds || hallIds.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ message: "examDate, session, and hallIds are required" });
        }

        const examIds = await resolveExamIds(examDate, session, transaction);
        if (examIds.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ message: "No exams found for this date + session" });
        }
        const primaryExamId = examIds[0] as number;

        // Already-allocated students in OTHER halls (outside the current bulk-run scope)
        // Students already seated in selected halls must remain eligible because those halls are re-cleared/reassigned.
        const selectedHallSet = new Set<number>((hallIds as number[]).map((id: number) => Number(id)));
        const existingAllocations = await SeatAllocation.findAll({
            where: { ExamID: { [Op.in]: examIds } },
            include: [{ model: Seat, attributes: ["RoomID"], required: true }],
            transaction,
        });
        const allocatedStudentIds = new Set<number>(
            (existingAllocations as any[])
                .filter((a: any) => !selectedHallSet.has(Number(a?.Seat?.RoomID)))
                .map((a: any) => Number(a.StudentID))
                .filter(Boolean)
        );
        const excludeIds = allocatedStudentIds.size > 0 ? [...allocatedStudentIds] : [-1];

        let resolvedMode: "single" | "two-alternate" | "auto-balanced" =
            mode === "single" || mode === "two-alternate" || mode === "auto-balanced"
                ? mode
                : "auto-balanced";
        const primaryDept = primaryDeptId ?? leftDeptId ?? null;
        const secondaryDept = secondaryDeptId ?? rightDeptId ?? null;
        const applyAdjacencyGuard = Boolean(avoidSameDeptBench);
        const slotValue = String(slot ?? session ?? "").trim();

        const students = await getStudentsForExamSession(
            String(examDate),
            slotValue,
            excludeIds,
            transaction
        );

        // Build left/right pools based on selected mode + departments.
        const sortByRegNo = (arr: any[]) =>
            [...arr].sort((a, b) =>
                String(a?.RegisterNumber || "").localeCompare(String(b?.RegisterNumber || ""), undefined, {
                    numeric: true,
                    sensitivity: "base",
                })
            );
        const deptOf = (s: any) => Number(s?.DepartmentID || 0);
        const primaryDeptIdNum = primaryDept ? Number(primaryDept) : null;
        const secondaryDeptIdNum = secondaryDept ? Number(secondaryDept) : null;
        const allStudentsSorted = sortByRegNo(students as any[]);

        let leftStudents: any[] = [];
        let rightStudents: any[] = [];

        if (
            primaryDeptIdNum &&
            secondaryDeptIdNum &&
            primaryDeptIdNum !== secondaryDeptIdNum
        ) {
            leftStudents = sortByRegNo(allStudentsSorted.filter((s: any) => deptOf(s) === primaryDeptIdNum));
            rightStudents = sortByRegNo(allStudentsSorted.filter((s: any) => deptOf(s) === secondaryDeptIdNum));
        } else if (primaryDeptIdNum) {
            // Single selected department: keep left side continuous.
            const pool = sortByRegNo(allStudentsSorted.filter((s: any) => deptOf(s) === primaryDeptIdNum));
            leftStudents = pool;
            rightStudents = [];
        } else {
            // No department split selected: use block split so each side is continuous.
            const splitAt = Math.ceil(allStudentsSorted.length / 2);
            leftStudents = allStudentsSorted.slice(0, splitAt);
            rightStudents = allStudentsSorted.slice(splitAt);
        }

        const totalEligibleFetched = leftStudents.length + rightStudents.length;
        console.log("Fetched students:", totalEligibleFetched);
        console.log("Fetched left/right:", {
            left: leftStudents.length,
            right: rightStudents.length,
            mode: resolvedMode,
        });

        let leftIdx = 0, rightIdx = 0;
        const targetHalls = await Room.findAll({ 
            where: { RoomID: { [Op.in]: hallIds } }, 
            transaction 
        });

        // Ensure seats exist for all target halls sequentially
        for (const hall of targetHalls) {
            await ensureSeatsExist(hall, transaction);
        }

        // Fetch all active seats for these halls in one query
        const allActiveSeats = await Seat.findAll({
            where: { RoomID: { [Op.in]: hallIds }, IsActive: true },
            attributes: ["SeatID", "RoomID", "RowIndex", "BenchIndex", "SeatIndex"],
            order: [["RoomID", "ASC"], ["RowIndex", "ASC"], ["BenchIndex", "ASC"], ["SeatIndex", "ASC"]],
            transaction,
        });

        // Clear existing allocations for all these halls + slot in one query
        const allSeatIds = allActiveSeats.map(s => s.SeatID);
        if (allSeatIds.length > 0) {
            await SeatAllocation.destroy({
                where: { ExamID: { [Op.in]: examIds }, SeatID: { [Op.in]: allSeatIds } },
                transaction,
            });
        }

        // Group seats by RoomID
        const roomSeatsMap = new Map<number, any[]>();
        for (const seat of allActiveSeats) {
            const roomId = Number((seat as any).RoomID);
            if (!roomSeatsMap.has(roomId)) roomSeatsMap.set(roomId, []);
            roomSeatsMap.get(roomId)!.push(seat);
        }

        const hallResults: any[] = [];
        const allNewAllocations: { ExamID: number; SeatID: number; StudentID: number }[] = [];

        // Hall-by-hall assignment: fill each hall completely before moving to next
        for (const hallIdNum of hallIds.map(Number)) {
            const hall = targetHalls.find(h => h.RoomID === hallIdNum);
            if (!hall) continue;

            const seats = roomSeatsMap.get(hallIdNum) || [];

            const benchMap: Record<string, Record<number, any[]>> = {};
            for (const seat of seats) {
                const rowLabel = getRowLabel(seat);
                const benchNumber = getBenchNumber(seat);
                if (!benchMap[rowLabel]) benchMap[rowLabel] = {};
                const rowMap = benchMap[rowLabel]!;
                if (!rowMap[benchNumber]) rowMap[benchNumber] = [];
                rowMap[benchNumber]!.push(seat);
            }

            // Get all rows and benches for this hall
            const allRows = Object.keys(benchMap).sort();
            const allBenchNums = [...new Set(
                allRows.flatMap(r => Object.keys(benchMap[r]!).map(Number))
            )].sort((a, b) => a - b);

            const findCandidateIndex = (arr: any[], startIdx: number, avoidDeptCode?: string): number => {
                if (startIdx >= arr.length) return -1;
                if (!avoidDeptCode) return startIdx;
                for (let i = startIdx; i < arr.length; i++) {
                    const code = String(arr[i]?.Department?.DepartmentCode || "");
                    if (code !== avoidDeptCode) return i;
                }
                return -1;
            };

            let hallLeft = 0, hallRight = 0;

            // Within each hall: row → bench → pair students
            for (const row of allRows) {
                for (const benchNum of allBenchNums) {
                    const benchSeats = (benchMap[row]?.[benchNum] || []).sort(sortSeatsByPosition);

                    for (const seat of benchSeats) {
                        if (getSeatNumber(seat) === 1) {
                            // Left seat: assign from left pool
                            if (leftIdx < leftStudents.length) {
                                const stu = leftStudents[leftIdx++] as any;
                                console.log(`Bench ${row}${benchNum} Left: ${stu.RegisterNumber} (${stu.Department?.DepartmentCode})`);
                                allNewAllocations.push({ ExamID: primaryExamId, SeatID: seat.SeatID !, StudentID: stu.StudentID as number });
                                hallLeft++;
                            }
                        } else {
                            // Right seat: assign from right pool, prioritizing different department
                            if (applyAdjacencyGuard && rightIdx < rightStudents.length && leftIdx > 0) {
                                // Get dept of last assigned left student
                                const lastLeftSeat = allNewAllocations[allNewAllocations.length - 1];
                                if (lastLeftSeat) {
                                    const lastLeftStudent = leftStudents[leftIdx - 1] as any;
                                    const lastLeftDept = lastLeftStudent?.Department?.DepartmentID;
                                    const rightStudentDept = rightStudents[rightIdx]?.Department?.DepartmentID;

                                    // If same department and we have alternatives, try to skip
                                    if (lastLeftDept === rightStudentDept && rightIdx + 1 < rightStudents.length) {
                                        // Look ahead for different dept
                                        let skipCount = 1;
                                        while (skipCount < 3 && rightIdx + skipCount < rightStudents.length) {
                                            if (rightStudents[rightIdx + skipCount]?.Department?.DepartmentID !== lastLeftDept) {
                                                rightIdx += skipCount;
                                                break;
                                            }
                                            skipCount++;
                                        }
                                    }
                                }
                            }

                            if (rightIdx < rightStudents.length) {
                                const stu = rightStudents[rightIdx++] as any;
                                console.log(`Bench ${row}${benchNum} Right: ${stu.RegisterNumber} (${stu.Department?.DepartmentCode})`);
                                allNewAllocations.push({ ExamID: primaryExamId, SeatID: seat.SeatID !, StudentID: stu.StudentID as number });
                                hallRight++;
                            }
                        }
                    }
                }
            }

            hallResults.push({
                hallId: hallIdNum, hallCode: hall.RoomCode,
                totalSeats: seats.length, filled: hallLeft + hallRight,
                leftUsed: hallLeft, rightUsed: hallRight,
            });
        }

        if (allNewAllocations.length > 0) {
            await SeatAllocation.bulkCreate(allNewAllocations, { transaction });
        }

        await transaction.commit();
        console.log("FINAL assigned count:", leftIdx + rightIdx);
        console.log("DEBUG: Sending students to frontend:", students.length);
        res.json({
            success: true,
            studentCount: students.length,
            hallResults,
            totalLeftAssigned: leftIdx, totalRightAssigned: rightIdx,
            totalLeftAvailable: leftStudents.length, totalRightAvailable: rightStudents.length,
            mode: resolvedMode,
            avoidSameDeptBench: applyAdjacencyGuard,
        });
    } catch (error: any) {
        await transaction.rollback();
        console.error("BULK ASSIGN ERROR:", error);
        res.status(500).json({ message: String(error), stack: error?.stack });
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

        const examIds = await resolveExamIds(examDate, session, transaction);
        if (examIds.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ message: "No exams found for this date + session" });
        }

        const existingAllocations = await SeatAllocation.findAll({
            where: { ExamID: { [Op.in]: examIds } }, transaction
        });

        if (existingAllocations.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ message: "No students are currently allocated to shuffle" });
        }

        const studentIds = [...new Set(existingAllocations.map(a => a.StudentID))];
        const students = await Student.findAll({ where: { StudentID: { [Op.in]: studentIds } }, transaction });
        const stuDeptMap = new Map();
        for (const s of students) stuDeptMap.set(s.StudentID, s.DepartmentID);

        const studentExamMap = new Map();
        const deptMap = new Map();

        // STEP 1: GROUP STUDENTS BY DEPARTMENT
        for (const alloc of existingAllocations) {
            const sId = alloc.StudentID;
            const dId = stuDeptMap.get(sId) || 0;
            studentExamMap.set(sId, alloc.ExamID);
            if (!deptMap.has(dId)) deptMap.set(dId, []);
            deptMap.get(dId).push(sId);
        }

        const seatIds = [...new Set(existingAllocations.map(a => a.SeatID))];
        const allSeatInfo = await Seat.findAll({
            where: { SeatID: { [Op.in]: seatIds } },
            attributes: ["SeatID", "RoomID", "RowIndex", "BenchIndex", "SeatIndex"],
            transaction
        });
        const seatInfoMap = new Map();
        for (const s of allSeatInfo) seatInfoMap.set(s.SeatID, s);

        const roomIds = [...new Set(allSeatInfo.map((s) => s.RoomID))];
        const rooms = await Room.findAll({ where: { RoomID: { [Op.in]: roomIds } }, transaction });
        const roomOrderMap = new Map();
        for (const r of rooms) roomOrderMap.set(r.RoomID, r.RoomCode);

        // STEP 3: FIXED SEAT ORDER (Room -> RowIndex -> BenchIndex -> SeatIndex)
        const orderedSeats = seatIds.sort((a, b) => {
            const sa = seatInfoMap.get(a);
            const sb = seatInfoMap.get(b);
            const rmA = roomOrderMap.get(sa.RoomID) || '';
            const rmB = roomOrderMap.get(sb.RoomID) || '';
            if (rmA !== rmB) return rmA.localeCompare(rmB);
            if (sa.RowIndex !== sb.RowIndex) return sa.RowIndex - sb.RowIndex;
            if (sa.BenchIndex !== sb.BenchIndex) return sa.BenchIndex - sb.BenchIndex;
            return sa.SeatIndex - sb.SeatIndex;
        });

        // STEP 6: SHUFFLE ONLY WITHIN DEPARTMENT GROUPS
        const orderedDeptKeys = [...deptMap.keys()];
        for (const dId of orderedDeptKeys) {
            const arr = deptMap.get(dId);
            arr.sort(() => Math.random() - 0.5);
        }

        // STEP 2: BUILD ORDERED INTERLEAVED LIST
        let finalStudents = [];
        let hasMore = true;
        let i = 0;
        while (hasMore) {
            hasMore = false;
            for (const dId of orderedDeptKeys) {
                const arr = deptMap.get(dId);
                if (i < arr.length) {
                    finalStudents.push(arr[i]);
                    hasMore = true;
                }
            }
            i++;
        }

        await SeatAllocation.destroy({
            where: { ExamID: { [Op.in]: examIds } }, transaction
        });

        // STEP 4: ASSIGN STUDENTS SEQUENTIALLY
        const newRecords = [];
        for (let j = 0; j < orderedSeats.length; j++) {
            const sId = finalStudents[j];
            const eId = studentExamMap.get(sId);
            if (eId && orderedSeats[j] !== undefined) {
                newRecords.push({
                    ExamID: eId, // STEP 7: PRESERVE STUDENT -> EXAM
                    SeatID: orderedSeats[j] as number,
                    StudentID: sId
                });
            }
        }

        if (newRecords.length > 0) {
            await SeatAllocation.bulkCreate(newRecords, { transaction });
        }

        await transaction.commit();
        res.json({ message: "Seating scrambled successfully!", shuffledCount: newRecords.length });

    } catch (error) {
        await transaction.rollback();
        console.error("SHUFFLE GLOBAL ERROR:", error);
        res.status(500).json({ message: (error instanceof Error ? error.message : String(error)) });
    }
};

/* ------------------------------------------------------------
 *
Exam record so SeatingPlans can use the slot
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

        const examIds = await resolveExamIds(examDate, session, transaction);
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

            await ensureSeatsExist(hall, transaction);

            const seats = await Seat.findAll({
                where: { RoomID: hall.RoomID, IsActive: true },
                attributes: ["SeatID", "RowIndex", "BenchIndex", "SeatIndex"],
                order: [["RowIndex", "ASC"], ["BenchIndex", "ASC"], ["SeatIndex", "ASC"]],
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
                const rowLabel = getRowLabel(seat);
                const benchNumber = getBenchNumber(seat);
                if (!benchMap[rowLabel]) benchMap[rowLabel] = {};
                const rowMap = benchMap[rowLabel]!;
                if (!rowMap[benchNumber]) rowMap[benchNumber] = [];
                rowMap[benchNumber]!.push(seat);
            }

            // Column-by-column order: A1, B1, C1... then A2, B2, C2...
            const allRows = Object.keys(benchMap).sort();
            const allBenchNums = [...new Set(
                allRows.flatMap(r => Object.keys(benchMap[r]!).map(Number))
            )].sort((a, b) => a - b);

            for (const row of allRows) {
                for (const benchNum of allBenchNums) {
                    const benchSeats = (benchMap[row]?.[benchNum] || []).sort(sortSeatsByPosition);
                    for (const seat of benchSeats) {
                        if (getSeatNumber(seat) === 1 && leftIdx < leftStudentIds.length) {
                            newRecords.push({ ExamID: primaryExamId, SeatID: seat.SeatID !, StudentID: leftStudentIds[leftIdx++] as number });
                        } else if (getSeatNumber(seat) !== 1 && rightIdx < rightStudentIds.length) {
                            newRecords.push({ ExamID: primaryExamId, SeatID: seat.SeatID !, StudentID: rightStudentIds[rightIdx++] as number });
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

        res.status(500).json({ message: (error instanceof Error ? error.message : String(error)) });
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
        res.status(500).json({ message: (error instanceof Error ? error.message : String(error)) });
    }
};
