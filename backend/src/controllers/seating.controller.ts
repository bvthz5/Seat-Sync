import { Request, Response } from "express";
import { Room, Seat, Student, User, Department, Exam, SeatAllocation, ExamSeries, Subject, Semester, Program, Zone, ExamSchedule, ExamRegistration } from "../models/index.js";
import { Op, QueryTypes } from "sequelize";
import { sequelize } from "../config/database.js";
import bcrypt from "bcrypt";
import * as XLSX from "xlsx";
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

    // First, resolve all exam IDs for this date + session
    const examIds = await resolveExamIds(examDate, normalizedSlot, transaction);
    console.log("DEBUG: Exams fetched for date/session:", examIds.length, { examDate, session: normalizedSlot });

    if (examIds.length === 0) {
        console.log("DEBUG: No exams found for this date/session");
        return [];
    }

    // Fetch students registered for these exams via ExamRegistration table (the source of truth)
    const registrations = await ExamRegistration.findAll({
        where: { ExamID: { [Op.in]: examIds } },
        attributes: ["StudentID"],
        ...(transaction ? { transaction } : {}),
    }) as any[];

    console.log("DEBUG: ExamRegistrations fetched:", registrations.length, { examIds: examIds.length });

    const studentIds = [...new Set(
        (registrations as any[])
            .map((r: any) => Number(r.StudentID))
            .filter(Boolean)
    )];

    if (studentIds.length === 0) {
        console.log("DEBUG: No registered students found for these exams");
        return [];
    }

    // Filter out excluded students
    const excluded = new Set<number>(excludeStudentIds.map(Number));
    const filteredStudentIds = studentIds.filter(id => !excluded.has(id));

    console.log("DEBUG: Filtered student IDs:", { total: studentIds.length, afterExclude: filteredStudentIds.length });

    // Fetch full student data
    const students = await Student.findAll({
        where: { StudentID: { [Op.in]: filteredStudentIds } },
        include: [
            { model: User, attributes: ["FullName"] },
            { model: Department, attributes: ["DepartmentCode", "DepartmentID"] },
        ],
        order: [["RegisterNumber", "ASC"]],
        ...(transaction ? { transaction } : {}),
    });

    console.log("DEBUG: Students fetched with details:", students.length);
    return students;
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
    try {
        if (!room || !room.RoomID) {
            console.error("ensureSeatsExist: Invalid room", room);
            return;
        }

        const queryOptions: any = { 
            where: { RoomID: Number(room.RoomID) },
            attributes: [
                "SeatID",
                "RowIndex",
                "BenchIndex",
                "SeatIndex"
            ],
            raw: true
        };
        if (transaction) queryOptions.transaction = transaction;

        console.log(`ensureSeatsExist: Querying seats for room ${room.RoomID}`, queryOptions);
        const existingSeats = await Seat.findAll(queryOptions);
        console.log(`ensureSeatsExist: Found ${existingSeats?.length || 0} existing seats for room ${room.RoomID}`);

        let rowLayout: any = (room as any).RowLayout;
        if (typeof rowLayout === "string") {
            try { rowLayout = JSON.parse(rowLayout); } catch (e) { 
                console.warn(`ensureSeatsExist: Failed to parse RowLayout for room ${room.RoomID}:`, e);
                rowLayout = []; 
            }
        }
        const layout: number[] = Array.isArray(rowLayout)
            ? rowLayout.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n) && n > 0)
            : [];
        const seatsPerBench = Math.max(1, Number((room as any).SeatsPerBench || 2));

        console.log(`ensureSeatsExist: Room ${room.RoomID} layout:`, { layout, seatsPerBench });

        if (layout.length === 0) {
            console.warn(`ensureSeatsExist: Room ${room.RoomID} has empty layout, skipping seat generation`);
            return;
        }

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
            !existingSeats || existingSeats.length === 0 ||
            existingKeys.size !== expectedKeys.size ||
            [...existingKeys].some((k) => !expectedKeys.has(k));

        console.log(`ensureSeatsExist: Room ${room.RoomID} layout mismatch: ${hasLayoutMismatch}`, { existingCount: existingSeats?.length || 0, expectedCount: expectedKeys.size });

        if (hasLayoutMismatch) {
            console.log(`ensureSeatsExist: Generating seats for room ${room.RoomID}`);
            await generateSeats(room as any, transaction);
            console.log(`ensureSeatsExist: Seats generated successfully for room ${room.RoomID}`);
        }
    } catch (error: any) {
        console.error(`ensureSeatsExist ERROR for room ${room?.RoomID}:`, error);
        throw error;
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
            const totalSeats = Number(hall.TotalCapacity || 0);
            const activeSeats = seatCountMap.get(hall.RoomID) || 0;
            const filledSeats = allocationCountMap.get(hall.RoomID) || 0;

            summary.push({
                hallId: hall.RoomID,
                hallCode: hall.RoomCode,
                capacity: hall.TotalCapacity,
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
            shuffleRooms: (req.body as any)?.shuffleRooms,
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
            shuffleRooms,
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

        console.log("BULK ASSIGN START:", {
            mode: resolvedMode,
            primaryDept,
            secondaryDept,
            applyAdjacencyGuard,
            avoidSameDeptBench,
        });

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
        console.log("Student pools:", {
            leftCount: leftStudents.length,
            leftDepts: leftStudents.slice(0, 3).map((s: any) => `${s.RegisterNumber}(${s.Department?.DepartmentCode})`),
            rightCount: rightStudents.length,
            rightDepts: rightStudents.slice(0, 3).map((s: any) => `${s.RegisterNumber}(${s.Department?.DepartmentCode})`),
            mode: resolvedMode,
            applyAdjacencyGuard,
        });
        console.log("Fetched left/right:", {
            left: leftStudents.length,
            right: rightStudents.length,
            mode: resolvedMode,
        });

        // If no students to assign, skip the bulk assignment and return early
        if (totalEligibleFetched === 0) {
            await transaction.commit();
            return res.status(400).json({ 
                message: "No eligible students found for this exam date + session combination",
                studentCount: 0,
                hallResults: [],
            });
        }

        let leftIdx = 0, rightIdx = 0;
        const targetHalls = await Room.findAll({ 
            where: { RoomID: { [Op.in]: hallIds } }, 
            transaction 
        });

        // Fetch all active seats for these halls in one query
        // Using raw SQL to avoid Sequelize MSSQL dialect issues
        let allActiveSeats: any[] = [];
        try {
            allActiveSeats = await sequelize.query(`
                SELECT SeatID, RoomID, RowIndex, BenchIndex, SeatIndex
                FROM Seats
                WHERE RoomID IN (${hallIds.map((id: any) => Number(id)).join(',')})
                AND IsActive = 1
                ORDER BY RoomID ASC, RowIndex ASC, BenchIndex ASC, SeatIndex ASC
            `, {
                type: QueryTypes.SELECT,
                raw: true,
            }) as any[];
        } catch (seatError: any) {
            console.error("Seats query error:", seatError?.message);
            await transaction.commit();
            return res.status(400).json({ 
                message: "Unable to fetch seats for selected halls. Please ensure halls are configured with proper seating layout.",
                error: seatError?.message,
            });
        }

        if (allActiveSeats.length === 0) {
            await transaction.commit();
            return res.status(400).json({ 
                message: "No active seats found in selected halls. Please configure seating layouts for the halls.",
                hallsRequested: hallIds.length,
            });
        }

        console.log(`DEBUG: Fetched ${allActiveSeats.length} active seats for halls`);

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

        // Shuffle halls if toggle is ON (for random room distribution)
        let hallIdsToUse = [...hallIds.map(Number)];
        if (shuffleRooms) {
            // Fisher-Yates shuffle for randomization
            for (let i = hallIdsToUse.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [hallIdsToUse[i], hallIdsToUse[j]] = [hallIdsToUse[j], hallIdsToUse[i]];
            }
            console.log("Shuffled hall order:", hallIdsToUse);
        }

        // Hall-by-hall assignment: fill each hall completely before moving to next
        for (const hallIdNum of hallIdsToUse) {
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
                    let currentBenchLeftDept: number | null = null;

                    for (const seat of benchSeats) {
                        if (getSeatNumber(seat) === 1) {
                            // Left seat: assign from left pool
                            if (leftIdx < leftStudents.length) {
                                const stu = leftStudents[leftIdx++] as any;
                                currentBenchLeftDept = stu.Department?.DepartmentID || null;
                                console.log(`Bench ${row}${benchNum} Left: ${stu.RegisterNumber} (${stu.Department?.DepartmentCode})`);
                                allNewAllocations.push({ ExamID: primaryExamId, SeatID: seat.SeatID !, StudentID: stu.StudentID as number });
                                hallLeft++;
                            }
                        } else {
                            // Right seat: assign from right pool or left pool (depending on mode)
                            let targetPool = rightStudents;
                            let targetIdx = rightIdx;
                            let useRightPool = true;

                            // If right pool is empty or exhausted, use left pool
                            if ((rightStudents.length === 0 || rightIdx >= rightStudents.length) && leftIdx < leftStudents.length) {
                                targetPool = leftStudents;
                                targetIdx = leftIdx;
                                useRightPool = false;
                            }

                            // When avoidSameDeptBench is on, prioritize different departments
                            if (applyAdjacencyGuard && currentBenchLeftDept !== null && targetIdx < targetPool.length) {
                                const lastLeftDept = currentBenchLeftDept;

                                // Check if we have both pools with content
                                if (rightStudents.length > 0 && rightIdx < rightStudents.length && leftIdx < leftStudents.length) {
                                    const rightStudent = rightStudents[rightIdx] as any;
                                    const leftPoolStudent = leftStudents[leftIdx] as any;
                                    const rightDept = rightStudent?.Department?.DepartmentID;
                                    const leftDept = leftPoolStudent?.Department?.DepartmentID;

                                    // If right pool matches left student's dept but left pool doesn't, use left pool
                                    if (rightDept === lastLeftDept && leftDept !== lastLeftDept) {
                                        targetPool = leftStudents;
                                        targetIdx = leftIdx;
                                        useRightPool = false;
                                    }
                                    // If both match, look ahead in both pools
                                    else if (rightDept === lastLeftDept && leftDept === lastLeftDept) {
                                        let foundInRight = false, foundInLeft = false;
                                        let rightDiffIdx = -1, leftDiffIdx = -1;

                                        // Look for different dept in right pool
                                        for (let i = 0; i < 10 && rightIdx + i < rightStudents.length; i++) {
                                            if (rightStudents[rightIdx + i]?.Department?.DepartmentID !== lastLeftDept) {
                                                rightDiffIdx = rightIdx + i;
                                                foundInRight = true;
                                                break;
                                            }
                                        }

                                        // Look for different dept in left pool
                                        for (let i = 0; i < 10 && leftIdx + i < leftStudents.length; i++) {
                                            if (leftStudents[leftIdx + i]?.Department?.DepartmentID !== lastLeftDept) {
                                                leftDiffIdx = leftIdx + i;
                                                foundInLeft = true;
                                                break;
                                            }
                                        }

                                        // Prefer the pool with closer different dept
                                        if (foundInRight && foundInLeft) {
                                            if (rightDiffIdx - rightIdx <= leftDiffIdx - leftIdx) {
                                                targetIdx = rightDiffIdx;
                                                useRightPool = true;
                                            } else {
                                                targetIdx = leftDiffIdx;
                                                targetPool = leftStudents;
                                                useRightPool = false;
                                            }
                                        } else if (foundInRight) {
                                            targetIdx = rightDiffIdx;
                                            useRightPool = true;
                                        } else if (foundInLeft) {
                                            targetIdx = leftDiffIdx;
                                            targetPool = leftStudents;
                                            useRightPool = false;
                                        }
                                    }
                                } else if (targetIdx < targetPool.length && targetPool[targetIdx]?.Department?.DepartmentID === lastLeftDept) {
                                    // Single pool mode: look ahead for different department
                                    for (let i = 0; i < 10 && targetIdx + i < targetPool.length; i++) {
                                        if (targetPool[targetIdx + i]?.Department?.DepartmentID !== lastLeftDept) {
                                            targetIdx = targetIdx + i;
                                            break;
                                        }
                                    }
                                }
                            }

                            if (targetIdx < targetPool.length) {
                                // Swap to prevent duplication/skipping
                                if (useRightPool && targetIdx !== rightIdx) {
                                    [rightStudents[rightIdx], rightStudents[targetIdx]] = [rightStudents[targetIdx], rightStudents[rightIdx]];
                                    targetIdx = rightIdx;
                                } else if (!useRightPool && targetIdx !== leftIdx) {
                                    [leftStudents[leftIdx], leftStudents[targetIdx]] = [leftStudents[targetIdx], leftStudents[leftIdx]];
                                    targetIdx = leftIdx;
                                }

                                const stu = targetPool[targetIdx] as any;
                                console.log(`Bench ${row}${benchNum} Right: ${stu.RegisterNumber} (${stu.Department?.DepartmentCode})`);
                                allNewAllocations.push({ ExamID: primaryExamId, SeatID: seat.SeatID !, StudentID: stu.StudentID as number });

                                // Increment appropriate counter
                                if (useRightPool) {
                                    rightIdx++;
                                } else {
                                    leftIdx++;
                                }
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
        console.error("ERROR DETAILS:", {
            message: error?.message,
            name: error?.name,
            stack: error?.stack,
            sql: error?.sql,
            code: error?.code
        });
        res.status(500).json({ 
            message: error?.message || String(error), 
            stack: error?.stack,
            details: error?.sql
        });
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
                DepartmentID: genericDept.DepartmentID
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

/* ════════════════════════════════════════════════════════════
 *  GET /api/seating/export
 *  Downloads seating arrangement as Excel file
 * ════════════════════════════════════════════════════════════ */
export const exportSeatingToExcel = async (req: Request, res: Response) => {
    try {
        const { examDate, session } = req.query;

        if (!examDate || !session) {
            return res.status(400).json({ message: "examDate and session are required" });
        }

        const examIds = await resolveExamIds(String(examDate), String(session));
        if (examIds.length === 0) {
            return res.status(400).json({ message: "No exams found for this date and session" });
        }

        const allocations = await SeatAllocation.findAll({
            attributes: ["SeatID", "StudentID"],
            include: [
                { model: Seat, attributes: ["SeatID", "RoomID", "RowIndex", "BenchIndex", "SeatIndex"] },
                { model: Student, attributes: ["StudentID", "RegisterNumber", "DepartmentID"] },
            ],
            where: { ExamID: { [Op.in]: examIds } },
            raw: false,
        } as any);

        if (allocations.length === 0) {
            return res.status(400).json({ message: "No seating allocations found for this date and session" });
        }

        const hallMap = new Map<number, any[]>();
        for (const alloc of allocations) {
            const roomId = Number((alloc as any).Seat?.RoomID);
            if (!Number.isFinite(roomId) || roomId <= 0) continue;
            if (!hallMap.has(roomId)) hallMap.set(roomId, []);
            hallMap.get(roomId)!.push(alloc);
        }

        const wb = XLSX.utils.book_new();
        const usedSheetNames = new Set<string>();

        const borderStyle: any = {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
        };

        const titleStyle: any = {
            font: { bold: true, size: 14 },
            alignment: { horizontal: "center", vertical: "center" },
            border: borderStyle,
        };

        const subtitleStyle: any = {
            font: { bold: true, size: 12 },
            alignment: { horizontal: "center", vertical: "center" },
            border: borderStyle,
        };

        const hallStyle: any = {
            font: { bold: true, size: 18 },
            alignment: { horizontal: "center", vertical: "center" },
            border: borderStyle,
        };

        const seatHeaderStyle: any = {
            font: { bold: true, size: 11 },
            alignment: { horizontal: "center", vertical: "center" },
            fill: { patternType: "solid", fgColor: { rgb: "E5E7EB" } },
            border: borderStyle,
        };

        const bodyStyleBase: any = {
            alignment: { horizontal: "center", vertical: "center", wrapText: true },
            border: borderStyle,
        };

        const summaryStyle: any = {
            font: { bold: true, size: 11 },
            alignment: { horizontal: "center", vertical: "center" },
            border: borderStyle,
        };

        const rowSort = (a: string, b: string): number => {
            const an = Number(a);
            const bn = Number(b);
            const aNum = Number.isFinite(an) && a.trim() !== "";
            const bNum = Number.isFinite(bn) && b.trim() !== "";
            if (aNum && bNum) return an - bn;
            if (aNum) return -1;
            if (bNum) return 1;
            return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
        };

        const normalizeSeatSide = (seatIndexRaw: number): "A" | "B" => {
            // SeatIndex 0 -> A(left), 1 -> B(right). Fallback for 1/2 based data.
            if (seatIndexRaw === 0) return "A";
            if (seatIndexRaw === 1) return "B";
            if (seatIndexRaw === 2) return "B";
            return seatIndexRaw <= 0 ? "A" : "B";
        };

        const deptPalette = ["DBEAFE", "DCFCE7", "FCE7F3", "FEF3C7", "EDE9FE", "CCFBF1", "FEE2E2", "E2E8F0"];
        const fixedDeptColors: Record<string, string> = {
            EC: "DBEAFE",
            CT: "DCFCE7",
            CSE: "DBEAFE",
            EEE: "FEF3C7",
            ME: "FEE2E2",
            CE: "CCFBF1",
            IT: "EDE9FE",
            MCA: "FCE7F3",
        };
        const deptColorCache = new Map<string, string>();
        const getDeptFill = (deptCode: string): string => {
            const key = (deptCode || "NA").toUpperCase();
            if (deptColorCache.has(key)) return deptColorCache.get(key)!;
            if (fixedDeptColors[key]) {
                deptColorCache.set(key, fixedDeptColors[key]);
                return fixedDeptColors[key];
            }
            const hash = key.split("").reduce((s, ch) => s + ch.charCodeAt(0), 0);
            const color = deptPalette[hash % deptPalette.length] || "E2E8F0";
            deptColorCache.set(key, color);
            return color;
        };

        for (const [roomId, hallAllocs] of hallMap) {
            const hall = await Room.findByPk(roomId);
            if (!hall) continue;

            // 1) Load full active seat layout for exact bench-based structure
            const roomSeats = await Seat.findAll({
                where: { RoomID: roomId, IsActive: true } as any,
                attributes: ["SeatID", "RowIndex", "BenchIndex", "SeatIndex"],
                raw: true,
            }) as any[];

            const rowBenchSlots = new Map<string, Map<number, { A: boolean; B: boolean }>>();
            for (const s of roomSeats) {
                const rowIndex = String(s.RowIndex ?? "").trim();
                const benchIndex = Number(s.BenchIndex);
                if (!rowIndex || !Number.isFinite(benchIndex) || benchIndex <= 0) continue;

                if (!rowBenchSlots.has(rowIndex)) rowBenchSlots.set(rowIndex, new Map());
                const benchMap = rowBenchSlots.get(rowIndex)!;
                if (!benchMap.has(benchIndex)) benchMap.set(benchIndex, { A: false, B: false });

                const side = normalizeSeatSide(Number(s.SeatIndex));
                const slot = benchMap.get(benchIndex)!;
                if (side === "A") slot.A = true;
                else slot.B = true;
            }

            // Fallback from allocations if seat table doesn't yield layout
            if (rowBenchSlots.size === 0) {
                for (const alloc of hallAllocs) {
                    const seat = (alloc as any).Seat;
                    const rowIndex = String(seat?.RowIndex ?? "").trim();
                    const benchIndex = Number(seat?.BenchIndex);
                    const side = normalizeSeatSide(Number(seat?.SeatIndex));
                    if (!rowIndex || !Number.isFinite(benchIndex) || benchIndex <= 0) continue;

                    if (!rowBenchSlots.has(rowIndex)) rowBenchSlots.set(rowIndex, new Map());
                    const benchMap = rowBenchSlots.get(rowIndex)!;
                    if (!benchMap.has(benchIndex)) benchMap.set(benchIndex, { A: false, B: false });
                    const slot = benchMap.get(benchIndex)!;
                    if (side === "A") slot.A = true;
                    else slot.B = true;
                }
            }

            const rowKeys = Array.from(rowBenchSlots.keys()).sort(rowSort);
            const benchIndexes = Array.from(new Set(
                Array.from(rowBenchSlots.values()).flatMap((m) => Array.from(m.keys()))
            )).sort((a, b) => a - b);

            const maxBenchCount = Math.max(benchIndexes.length, 1);
            const numCols = maxBenchCount * 2;

            // 2) Build anti-cheating student pools by department
            const deptById = new Map<number, string>();
            const deptIds = [...new Set(
                hallAllocs
                    .map((a: any) => Number(a?.Student?.DepartmentID))
                    .filter((id: number) => Number.isFinite(id) && id > 0)
            )];

            if (deptIds.length > 0) {
                const depts = await Department.findAll({
                    where: { DepartmentID: { [Op.in]: deptIds } },
                    attributes: ["DepartmentID", "DepartmentCode"],
                    raw: true,
                }) as any[];
                for (const d of depts) deptById.set(Number(d.DepartmentID), String(d.DepartmentCode || "NA"));
            }

            type Stu = { registerNumber: string; deptCode: string; studentId?: number };
            const seenReg = new Set<string>();
            const deptQueues = new Map<string, Stu[]>();
            for (const alloc of hallAllocs) {
                const student = (alloc as any).Student;
                if (!student) continue;
                const registerNumber = String(student.RegisterNumber || "").trim();
                if (!registerNumber || seenReg.has(registerNumber)) continue;
                seenReg.add(registerNumber);

                const deptCode = deptById.get(Number(student.DepartmentID)) || "NA";
                if (!deptQueues.has(deptCode)) deptQueues.set(deptCode, []);
                deptQueues.get(deptCode)!.push({
                    registerNumber,
                    deptCode,
                    studentId: Number(student.StudentID),
                });
            }

            const deptCodes = Array.from(deptQueues.keys()).sort((a, b) => a.localeCompare(b));
            const queueSize = (code: string) => deptQueues.get(code)?.length || 0;
            const popFromDept = (code: string): Stu | null => {
                const q = deptQueues.get(code);
                if (!q || q.length === 0) return null;
                return q.shift() || null;
            };
            const nextDept = (exclude?: string): string | null => {
                let candidate: string | null = null;
                let max = -1;
                for (const code of deptCodes) {
                    if (exclude && code === exclude) continue;
                    const len = queueSize(code);
                    if (len > max) {
                        max = len;
                        candidate = code;
                    }
                }
                return max > 0 ? candidate : null;
            };

            // 3) Build seatingGrid[rowIndex][benchIndex] = { A, B } with anti-cheating alternation
            const seatingGrid = new Map<string, Map<number, { A: Stu | null; B: Stu | null }>>();
            const deptCounts = new Map<string, number>();
            let flip = false;

            for (const rowKey of rowKeys) {
                const benches = rowBenchSlots.get(rowKey)!;
                const rowGrid = new Map<number, { A: Stu | null; B: Stu | null }>();

                for (const benchIndex of benchIndexes) {
                    const slot = benches.get(benchIndex) || { A: false, B: false };
                    const cell = { A: null as Stu | null, B: null as Stu | null };

                    // choose two depts, prefer different for A/B
                    let firstDept = nextDept();
                    let secondDept = firstDept ? nextDept(firstDept) : null;
                    if (!secondDept) secondDept = nextDept(); // fallback if only one dept remains

                    if (flip) {
                        const tmp = firstDept;
                        firstDept = secondDept;
                        secondDept = tmp;
                    }

                    if (slot.A) {
                        const stuA = firstDept ? popFromDept(firstDept) : null;
                        if (stuA) {
                            cell.A = stuA;
                            deptCounts.set(stuA.deptCode, (deptCounts.get(stuA.deptCode) || 0) + 1);
                        }
                    }

                    if (slot.B) {
                        let stuB: Stu | null = null;
                        if (secondDept) stuB = popFromDept(secondDept);
                        if (!stuB && cell.A?.deptCode) {
                            const alt = nextDept(cell.A.deptCode);
                            if (alt) stuB = popFromDept(alt);
                        }
                        if (!stuB) {
                            const anyDept = nextDept();
                            if (anyDept) stuB = popFromDept(anyDept);
                        }
                        if (stuB) {
                            cell.B = stuB;
                            deptCounts.set(stuB.deptCode, (deptCounts.get(stuB.deptCode) || 0) + 1);
                        }
                    }

                    rowGrid.set(benchIndex, cell);
                    flip = !flip;
                }

                seatingGrid.set(rowKey, rowGrid);
            }

            // 4) Prepare AOA data
            const wsData: any[][] = [];
            wsData.push(["ST.JOSEPH'S COLLEGE OF ENGINEERING & TECHNOLOGY PALAI (Autonomous)"]);
            wsData.push(["First Semester End Semester Exam 2024-'25"]);
            wsData.push([`SEATING ARRANGEMENT - ${examDate} (BENCH-LAYOUT V2)`]);
            wsData.push([String((hall as any).RoomCode || `Hall_${roomId}`)]);
            wsData.push([]);
            wsData.push(benchIndexes.flatMap((b) => [`A${b}`, `B${b}`]));

            // dept codes matrix for color styling lookup
            const deptGrid: string[][] = [];

            for (const rowKey of rowKeys) {
                const rowGrid = seatingGrid.get(rowKey)!;
                const rowCells: string[] = [];
                const rowDepts: string[] = [];

                for (const benchIndex of benchIndexes) {
                    const seat = rowGrid.get(benchIndex) || { A: null, B: null };

                    const valA = seat.A ? `${seat.A.registerNumber}\n${seat.A.deptCode}` : "";
                    const valB = seat.B ? `${seat.B.registerNumber}\n${seat.B.deptCode}` : "";

                    rowCells.push(valA, valB);
                    rowDepts.push(seat.A?.deptCode || "", seat.B?.deptCode || "");
                }

                wsData.push(rowCells);
                deptGrid.push(rowDepts);
            }

            wsData.push([]);
            wsData.push(["Number of Students:"]);
            const sortedDeptCodes = Array.from(deptCounts.keys()).sort((a, b) => a.localeCompare(b));
            for (const code of sortedDeptCodes) wsData.push([code, deptCounts.get(code) || 0]);
            wsData.push([]);
            wsData.push(["Total number of students", Array.from(deptCounts.values()).reduce((s, n) => s + n, 0)]);

            // 5) Sheet + merges
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            ws["!cols"] = Array(numCols).fill({ wch: 16 });
            ws["!merges"] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } },
                { s: { r: 1, c: 0 }, e: { r: 1, c: numCols - 1 } },
                { s: { r: 2, c: 0 }, e: { r: 2, c: numCols - 1 } },
                { s: { r: 3, c: 0 }, e: { r: 3, c: numCols - 1 } },
            ];

            const seatHeaderRow = 5;
            const dataStart = 6;
            const dataEnd = dataStart + Math.max(rowKeys.length - 1, 0);

            // 6) Styles + color coding
            for (let r = 0; r < wsData.length; r++) {
                for (let c = 0; c < numCols; c++) {
                    const ref = XLSX.utils.encode_cell({ r, c });
                    if (!ws[ref]) ws[ref] = { t: "s", v: "" };

                    if (r === 0) ws[ref].s = titleStyle;
                    else if (r === 1 || r === 2) ws[ref].s = subtitleStyle;
                    else if (r === 3) ws[ref].s = hallStyle;
                    else if (r === seatHeaderRow) ws[ref].s = seatHeaderStyle;
                    else if (r >= dataStart && r <= dataEnd) {
                        const style = { ...bodyStyleBase };
                        const deptCode = deptGrid[r - dataStart]?.[c] || "";
                        if (deptCode) {
                            style.fill = { patternType: "solid", fgColor: { rgb: getDeptFill(deptCode) } };
                        }
                        ws[ref].s = style;
                    } else {
                        ws[ref].s = summaryStyle;
                    }
                }
            }

            // 7) A4 print optimization
            (ws as any)["!pageSetup"] = {
                paperSize: 9, // A4
                orientation: "landscape",
                fitToWidth: 1,
                fitToHeight: 0,
                horizontalCentered: true,
                verticalCentered: false,
            };
            (ws as any)["!margins"] = {
                left: 0.25,
                right: 0.25,
                top: 0.35,
                bottom: 0.35,
                header: 0.2,
                footer: 0.2,
            };

            let sheetName = String((hall as any).RoomCode || `Hall_${roomId}`).replace(/[:\\/?*[\]]/g, "").slice(0, 31);
            if (!sheetName) sheetName = `Hall_${roomId}`;
            if (usedSheetNames.has(sheetName)) {
                let i = 2;
                while (usedSheetNames.has(`${sheetName.slice(0, 28)}_${i}`)) i++;
                sheetName = `${sheetName.slice(0, 28)}_${i}`;
            }
            usedSheetNames.add(sheetName);

            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }

        const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="Seating_${examDate}_${session}.xlsx"`);
        res.send(buffer);
    } catch (error: any) {
        console.error("EXPORT SEATING ERROR:", error);
        res.status(500).json({ message: (error instanceof Error ? error.message : String(error)) });
    }
};
