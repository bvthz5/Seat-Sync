import { Op } from "sequelize";
import { Request, Response } from "express";
import {
    Attendance,
    Block,
    Department,
    Exam,
    Floor,
    Program,
    SeatAllocation,
    Semester,
    Seat,
    Room,
    Student,
    Subject,
    User,
} from "../models/index.js";
import { notificationService } from "../services/notification.service.js";

const IST_TIME_ZONE = "Asia/Kolkata";
const ACADEMIC_YEAR_START_MONTH_INDEX = 6; // July (0-indexed)

const todayInIST = () => new Intl.DateTimeFormat("en-CA", { timeZone: IST_TIME_ZONE }).format(new Date());

const formatDate = (value: string | Date) =>
    new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: IST_TIME_ZONE }).format(new Date(value));

const examToStatus = (examDate: string, today: string) => (examDate === today ? "Today" : examDate > today ? "Upcoming" : "Completed");

const fetchRegisteredExams = async (studentId: number) => {
    return Exam.findAll({
        include: [
            {
                model: Student,
                where: { StudentID: studentId },
                through: { attributes: [] },
                attributes: [],
                required: true,
            },
            {
                model: Subject,
                attributes: ["SubjectID", "SubjectCode", "SubjectName", "DepartmentID", "SemesterID"],
            },
        ],
        order: [
            ["ExamDate", "ASC"],
            ["Session", "ASC"],
        ],
    });
};

const getProfilePayload = (student: any) => ({
    userId: student.User?.UserID ?? null,
    name: student.User?.FullName ?? student.User?.Email ?? "Student",
    email: student.User?.Email ?? null,
    registerNumber: student.RegisterNumber,
    department: student.Department?.DepartmentName ?? null,
    departmentCode: student.Department?.DepartmentCode ?? null,
    program: student.Program?.ProgramName ?? null,
    semester: student.Semester?.SemesterNumber ?? student.Semester?.SemesterName ?? null,
    batchYear: student.BatchYear,
});

const mapExam = (exam: any, today: string) => ({
    examId: exam.ExamID,
    subject: exam.Subject?.SubjectName ?? exam.ExamName,
    subjectCode: exam.Subject?.SubjectCode ?? null,
    date: exam.ExamDate,
    dateLabel: formatDate(exam.ExamDate),
    session: exam.Session,
    duration: exam.Duration,
    status: examToStatus(exam.ExamDate, today),
});

const getAttendanceStatus = (attendance: any) => (attendance ? (attendance.IsPresent ? "Present" : "Absent") : "Pending");

const parseSemesterNumber = (semester: { SemesterNumber?: number | null; SemesterName?: string | null } | null | undefined) => {
    if (!semester) return null;
    if (typeof semester.SemesterNumber === "number" && Number.isFinite(semester.SemesterNumber)) {
        return semester.SemesterNumber;
    }

    const name = semester.SemesterName ?? "";
    const match = name.match(/(\d+)/);
    if (match) {
        const parsed = Number(match[1]);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
};

const getStudentBaselineDate = (student: any) => {
    if (student?.AdmissionDate) {
        const date = new Date(student.AdmissionDate);
        if (!Number.isNaN(date.getTime())) return date;
    }

    const batchYear = Number(student?.BatchYear);
    if (Number.isFinite(batchYear) && batchYear > 0) {
        return new Date(batchYear, ACADEMIC_YEAR_START_MONTH_INDEX, 1);
    }

    return new Date();
};

const getEffectiveSemesterNumber = (student: any, maxSemesterNumber: number, recordedSemesterNumber: number | null) => {
    const now = new Date();
    const baseline = getStudentBaselineDate(student);
    const monthDiff = (now.getFullYear() - baseline.getFullYear()) * 12 + (now.getMonth() - baseline.getMonth());
    const elapsedSemesters = Math.max(0, Math.floor(monthDiff / 6));
    const timelineSemester = elapsedSemesters + 1;

    const candidate = Math.max(recordedSemesterNumber ?? 1, timelineSemester);
    return Math.min(Math.max(1, candidate), Math.max(1, maxSemesterNumber));
};

const loadStudent = async (userId: number) => {
    return Student.findOne({
        where: { UserID: userId },
        include: [
            { model: User, attributes: ["UserID", "Email", "FullName", "Role"] },
            { model: Department, attributes: ["DepartmentID", "DepartmentCode", "DepartmentName"] },
            { model: Program, attributes: ["ProgramID", "ProgramName", "ProgramCode", "TotalSemesters"] },
            { model: Semester, attributes: ["SemesterID", "SemesterNumber", "SemesterName"] },
        ],
    });
};

export const getStudentDashboard = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.UserID;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const student = await loadStudent(userId);
        if (!student) return res.status(404).json({ message: "Student profile not found" });

        const programSemesters = await Semester.findAll({
            where: { ProgramID: student.ProgramID },
            attributes: ["SemesterID", "SemesterNumber", "SemesterName"],
        });

        const availableNumbers = programSemesters
            .map((row: any) => parseSemesterNumber(row))
            .filter((value: number | null): value is number => typeof value === "number");

        const configuredMax = Number((student as any).Program?.TotalSemesters);
        const maxSemesterNumber = Math.max(
            Number.isFinite(configuredMax) && configuredMax > 0 ? configuredMax : 0,
            availableNumbers.length ? Math.max(...availableNumbers) : 0,
            1,
        );

        const recordedSemesterNumber = parseSemesterNumber((student as any).Semester);
        const effectiveSemesterNumber = getEffectiveSemesterNumber(student as any, maxSemesterNumber, recordedSemesterNumber);
        const effectiveSemester = programSemesters.find(
            (row: any) => parseSemesterNumber(row) === effectiveSemesterNumber,
        );
        const semesterValue =
            (effectiveSemester as any)?.SemesterNumber ??
            (effectiveSemester as any)?.SemesterName ??
            effectiveSemesterNumber;

        const today = todayInIST();
        const exams = await fetchRegisteredExams(student.StudentID);
        const examData = exams.map((exam: any) => mapExam(exam, today));

        const todayExam = examData.find((exam) => exam.date === today) || null;
        const upcomingExams = examData.filter((exam) => exam.date >= today).slice(0, 5);
        const historyExams = examData.filter((exam) => exam.date < today).slice(-6).reverse();

        const targetExamId = todayExam?.examId ?? upcomingExams[0]?.examId ?? null;
        let seating: any = null;

        if (targetExamId) {
            const assignment = await SeatAllocation.findOne({
                where: { ExamID: targetExamId, StudentID: student.StudentID },
                include: [
                    {
                        model: Seat,
                        include: [{ model: Room, include: [Block, Floor] }],
                    },
                ],
            });

            if (assignment) {
                const seat = (assignment as any).Seat;
                const room = seat?.Room;
                seating = {
                    examId: targetExamId,
                    seatNumber: seat?.SeatIndex ?? null,
                    benchNumber: seat?.BenchIndex ?? null,
                    rowLabel: seat?.RowIndex ?? null,
                    roomCode: room?.RoomCode ?? null,
                    capacity: room?.Capacity ?? null,
                    blockName: room?.Block?.BlockName ?? null,
                    floorName: room?.Floor?.FloorName ?? null,
                    roomType: room?.RoomType ?? null,
                    benchMode: room?.BenchMode ?? null,
                };
            }
        }

        const notifications = await notificationService.getUserNotifications(userId, { limit: 5, page: 1 });
        const notificationStats = await notificationService.getUserStats(userId);

        const attendanceRows = await Attendance.findAll({
            where: {
                StudentID: student.StudentID,
                ExamID: { [Op.in]: historyExams.map((exam) => exam.examId) },
            },
        });

        const attendanceByExamId = new Map<number, any>();
        attendanceRows.forEach((row: any) => attendanceByExamId.set(row.ExamID, row));
        const studentAny = student as any;

        return res.json({
            success: true,
            student: {
                ...getProfilePayload(studentAny),
                semester: semesterValue,
            },
            academic: {
                department: studentAny.Department?.DepartmentName ?? null,
                departmentCode: studentAny.Department?.DepartmentCode ?? null,
                program: studentAny.Program?.ProgramName ?? null,
                semester: semesterValue,
                batchYear: student.BatchYear,
            },
            stats: {
                totalExams: examData.length,
                upcomingExams: upcomingExams.length,
                unreadNotifications: notificationStats.unread,
                criticalNotifications: notificationStats.critical,
            },
            todayExam,
            upcomingExams,
            seating,
            notifications: notifications.data,
            history: historyExams.map((exam) => ({
                ...exam,
                attendanceStatus: getAttendanceStatus(attendanceByExamId.get(exam.examId)),
                markedAt: attendanceByExamId.get(exam.examId)?.MarkedAt ?? null,
            })),
        });
    } catch (error: any) {
        console.error("Student dashboard error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getStudentExams = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.UserID;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const student = await loadStudent(userId);
        if (!student) return res.status(404).json({ message: "Student profile not found" });

        const today = todayInIST();
        const exams = await fetchRegisteredExams(student.StudentID);

        res.json({
            success: true,
            data: exams.map((exam: any) => mapExam(exam, today)),
        });
    } catch (error: any) {
        console.error("Student exams error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getStudentSeating = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.UserID;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const student = await loadStudent(userId);
        if (!student) return res.status(404).json({ message: "Student profile not found" });

        const today = todayInIST();
        const exams = await fetchRegisteredExams(student.StudentID);
        const targetExam = exams.find((exam: any) => exam.ExamDate === today) || exams.find((exam: any) => exam.ExamDate >= today);

        if (!targetExam) {
            return res.json({ success: true, data: null });
        }

        const assignment = await SeatAllocation.findOne({
            where: { ExamID: targetExam.ExamID, StudentID: student.StudentID },
            include: [{ model: Seat, include: [{ model: Room, include: [Block, Floor] }] }],
        });

        if (!assignment) {
            return res.json({ success: true, data: null });
        }

        const roomId = (assignment as any).Seat?.RoomID;
        const layout = await SeatAllocation.findAll({
            where: { ExamID: targetExam.ExamID },
            include: [
                { model: Seat, include: [{ model: Room, include: [Block, Floor] }] },
                { model: Student, include: [{ model: User, attributes: ["FullName", "Email"] }] },
            ],
        });

        const roomLayout = layout
            .filter((item: any) => item.Seat?.RoomID === roomId)
            .map((item: any) => ({
                studentId: item.StudentID,
                seatNumber: item.Seat?.SeatIndex,
                rowLabel: item.Seat?.RowIndex,
                benchNumber: item.Seat?.BenchIndex,
                studentName: item.Student?.User?.FullName ?? item.Student?.User?.Email ?? null,
            }));

        res.json({
            success: true,
            data: {
                exam: mapExam(targetExam as any, today),
                assignment: {
                    seatNumber: (assignment as any).Seat?.SeatIndex ?? null,
                    benchNumber: (assignment as any).Seat?.BenchIndex ?? null,
                    rowLabel: (assignment as any).Seat?.RowIndex ?? null,
                    roomCode: (assignment as any).Seat?.Room?.RoomCode ?? null,
                    blockName: (assignment as any).Seat?.Room?.Block?.BlockName ?? null,
                    floorName: (assignment as any).Seat?.Room?.Floor?.FloorName ?? null,
                    roomType: (assignment as any).Seat?.Room?.RoomType ?? null,
                    capacity: (assignment as any).Seat?.Room?.Capacity ?? null,
                },
                layout: roomLayout,
            },
        });
    } catch (error: any) {
        console.error("Student seating error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getStudentNotifications = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.UserID;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const result = await notificationService.getUserNotifications(userId, req.query);
        const stats = await notificationService.getUserStats(userId);

        res.json({
            success: true,
            ...result,
            stats,
        });
    } catch (error: any) {
        console.error("Student notifications error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getStudentHistory = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.UserID;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const student = await loadStudent(userId);
        if (!student) return res.status(404).json({ message: "Student profile not found" });

        const today = todayInIST();
        const exams = await fetchRegisteredExams(student.StudentID);
        const past = exams.filter((exam: any) => exam.ExamDate < today);
        const attendanceRows = await Attendance.findAll({ where: { StudentID: student.StudentID } });
        const attendanceByExamId = new Map<number, any>();
        attendanceRows.forEach((row: any) => attendanceByExamId.set(row.ExamID, row));

        res.json({
            success: true,
            data: past.map((exam: any) => ({
                ...mapExam(exam, today),
                attendanceStatus: getAttendanceStatus(attendanceByExamId.get(exam.ExamID)),
            })),
        });
    } catch (error: any) {
        console.error("Student history error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};