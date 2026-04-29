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
    UserProfile,
} from "../models/index.js";
import { notificationService } from "../services/notification.service.js";

const FN_START_TIME = "09:30";
const AN_START_TIME = "13:30";
const SEATING_VISIBLE_MINUTES = 45;
const ACADEMIC_YEAR_START_MONTH_INDEX = 5;

const formatDate = (date: string | Date) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "Invalid Date";
    return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
};

const todayInIST = () => {
    return new Date().toISOString().split("T")[0];
};

const getExamTimes = (date: string | Date, session: string) => {
    const startTimeStr = session.toUpperCase().includes("FN") ? FN_START_TIME : AN_START_TIME;
    const parts = startTimeStr.split(":").map(Number);
    const startH = parts[0] ?? 0;
    const startM = parts[1] ?? 0;
    const start = new Date(date);
    start.setHours(startH, startM, 0, 0);
    return { start, startTimeStr };
};

const getExamStatus = (examDate: string | Date, session: string, durationMin: number, now: Date) => {
    const { start } = getExamTimes(examDate, session);
    const end = new Date(start.getTime() + durationMin * 60000);
    if (now < start) return "UPCOMING";
    if (now >= start && now < end) return "LIVE";
    return "COMPLETED";
};

const isSeatingVisible = (examDate: string | Date, session: string, now: Date) => {
    const { start } = getExamTimes(examDate, session);
    const visibleAt = new Date(start.getTime() - SEATING_VISIBLE_MINUTES * 60000);
    return now >= visibleAt;
};

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
                attributes: ["SubjectID", "SubjectCode", "SubjectName", "DepartmentID"],
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

const mapExam = (exam: any, now: Date) => {
    const status = getExamStatus(exam.ExamDate, exam.Session, exam.Duration, now);
    const { start } = getExamTimes(exam.ExamDate, exam.Session);
    return {
        examId: exam.ExamID,
        subject: exam.Subject?.SubjectName ?? exam.ExamName,
        subjectCode: exam.Subject?.SubjectCode ?? null,
        date: exam.ExamDate,
        dateLabel: formatDate(exam.ExamDate),
        session: exam.Session,
        startTime: start.toISOString(),
        duration: exam.Duration,
        status: status,
        isSeatingVisible: isSeatingVisible(exam.ExamDate, exam.Session, now)
    };
};

const getAttendanceStatus = (attendance: any) => (attendance ? (attendance.IsPresent ? "Present" : "Absent") : "Pending");

const parseSemesterNumber = (semester: any) => {
    if (!semester) return null;
    if (typeof semester.SemesterNumber === "number") return semester.SemesterNumber;
    const match = (semester.SemesterName ?? "").match(/(\d+)/);
    return match ? Number(match[1]) : null;
};

const getStudentBaselineDate = (student: any) => {
    if (student?.AdmissionDate) {
        const date = new Date(student.AdmissionDate);
        if (!isNaN(date.getTime())) return date;
    }
    const batchYear = Number(student?.BatchYear);
    if (batchYear > 0) return new Date(batchYear, ACADEMIC_YEAR_START_MONTH_INDEX, 1);
    return new Date();
};

const getEffectiveSemesterNumber = (student: any, maxSem: number, recordedSem: number | null) => {
    const now = new Date();
    const baseline = getStudentBaselineDate(student);
    const monthDiff = (now.getFullYear() - baseline.getFullYear()) * 12 + (now.getMonth() - baseline.getMonth());
    const timelineSem = Math.max(0, Math.floor(monthDiff / 6)) + 1;
    return Math.min(Math.max(recordedSem ?? 1, timelineSem), maxSem || 8);
};

const loadStudent = async (userId: number) => {
    return Student.findOne({
        where: { UserID: userId },
        include: [
            { model: User, attributes: ["UserID", "Email", "FullName", "Role", "CreatedAt", "IsActive"], include: [{ model: UserProfile }] },
            { model: Department, attributes: ["DepartmentID", "DepartmentCode", "DepartmentName"] },
            { model: Program, attributes: ["ProgramID", "ProgramName", "ProgramCode", "TotalSemesters"] },
            { model: Semester, attributes: ["SemesterID", "SemesterNumber", "SemesterName"] },
        ],
    });
};

export const getStudentProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.UserID;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        const student = await loadStudent(userId);
        if (!student) return res.status(404).json({ message: "Student not found" });
        const profile = (student.User as any)?.UserProfile;
        res.json({
            success: true,
            data: {
                personal: {
                    fullName: student.User?.FullName || student.FullName,
                    email: student.User?.Email,
                    phone: profile?.Phone || null,
                    avatar: profile?.Avatar || null,
                    dateOfBirth: profile?.DateOfBirth || null,
                    gender: profile?.Gender || null,
                },
                academic: {
                    registerNumber: student.RegisterNumber,
                    department: student.Department?.DepartmentName,
                    departmentCode: student.Department?.DepartmentCode,
                    program: student.Program?.ProgramName,
                    programCode: student.Program?.ProgramCode,
                    semester: student.Semester?.SemesterNumber || student.Semester?.SemesterName,
                    batchYear: student.BatchYear,
                    status: student.Status,
                },
                account: {
                    username: student.RegisterNumber,
                    role: student.User?.Role,
                    createdAt: student.User?.CreatedAt,
                    isActive: student.User?.IsActive,
                }
            }
        });
    } catch (error) {
        console.error("Profile error:", error);
        res.status(500).json({ message: "Internal error" });
    }
};

export const updateStudentProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.UserID;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        const { email, phone, fullName, dateOfBirth, gender } = req.body;
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ message: "User not found" });
        if (email) user.Email = email;
        if (fullName) user.FullName = fullName;
        await user.save();
        const [profile] = await UserProfile.findOrCreate({
            where: { UserID: userId },
            defaults: { UserID: userId, FullName: fullName || user.FullName || "" }
        });
        if (phone !== undefined) profile.Phone = phone;
        if (fullName !== undefined) profile.FullName = fullName;
        if (dateOfBirth !== undefined) (profile as any).DateOfBirth = dateOfBirth;
        if (gender !== undefined) (profile as any).Gender = gender;
        await profile.save();
        res.json({ success: true, message: "Profile updated" });
    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ message: "Internal error" });
    }
};

export const uploadStudentAvatar = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.UserID;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        const { avatar } = req.body;
        if (!avatar) return res.status(400).json({ message: "Avatar required" });
        const [profile] = await UserProfile.findOrCreate({ where: { UserID: userId }, defaults: { UserID: userId, FullName: "" } });
        (profile as any).Avatar = avatar;
        await profile.save();
        res.json({ success: true, message: "Avatar updated", avatar: profile.Avatar });
    } catch (error) {
        console.error("Avatar error:", error);
        res.status(500).json({ message: "Internal error" });
    }
};

export const getStudentDashboard = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.UserID;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        const student = await loadStudent(userId);
        if (!student) return res.status(404).json({ message: "Student not found" });
        const programSemesters = await Semester.findAll({ where: { ProgramID: student.ProgramID }, attributes: ["SemesterID", "SemesterNumber", "SemesterName"] });
        const availableNums = programSemesters.map(parseSemesterNumber).filter((v): v is number => typeof v === "number");
        const maxSem = Math.max(Number(student.Program?.TotalSemesters) || 0, ...availableNums, 1);
        const recordedSem = parseSemesterNumber(student.Semester);
        const effectiveSemNum = getEffectiveSemesterNumber(student, maxSem, recordedSem);
        const effectiveSem = programSemesters.find(r => parseSemesterNumber(r) === effectiveSemNum);
        const semesterValue = (effectiveSem as any)?.SemesterNumber ?? (effectiveSem as any)?.SemesterName ?? effectiveSemNum;
        const now = new Date();
        const exams = await fetchRegisteredExams(student.StudentID);
        const examData = exams.map(e => mapExam(e, now));
        const liveExam = examData.find(e => e.status === "LIVE");
        const upcomingToday = examData.find(e => e.status === "UPCOMING" && e.date === todayInIST());
        const nextUpcoming = examData.find(e => e.status === "UPCOMING");
        const targetExam = liveExam || upcomingToday || nextUpcoming || null;
        const upcomingExams = examData.filter(e => e.status !== "COMPLETED").slice(0, 5);
        const historyExams = examData.filter(e => e.status === "COMPLETED").slice(-6).reverse();
        let seating: any = null;
        if (targetExam?.isSeatingVisible) {
            const assignment = await SeatAllocation.findOne({ where: { ExamID: targetExam.examId, StudentID: student.StudentID }, include: [{ model: Seat, include: [{ model: Room, include: [Block, Floor] }] }] });
            if (assignment) {
                const seat = (assignment as any).Seat;
                const room = seat?.Room;
                const floorNum = room?.Floor?.FloorNumber;
                let floorLabel = room?.Floor?.FloorName || (typeof floorNum === 'number' ? (floorNum === 0 ? "Ground Floor" : `${floorNum}th Floor`) : "Ground Floor");
                seating = { examId: targetExam.examId, seatNumber: seat?.SeatIndex, benchNumber: seat?.BenchIndex, rowLabel: seat?.RowIndex, roomCode: room?.RoomCode || room?.RoomName, capacity: room?.TotalCapacity || room?.Capacity, blockName: room?.Block?.BlockName, floorName: floorLabel, roomType: room?.RoomType, benchMode: room?.BenchMode };
            }
        }
        const notificationStats = await notificationService.getUserStats(userId);
        const notifications = await notificationService.getUserNotifications(userId, { limit: 5, page: 1 });
        const attendanceRows = await Attendance.findAll({ where: { StudentID: student.StudentID, ExamID: { [Op.in]: historyExams.map(e => e.examId) } } });
        const attMap = new Map();
        attendanceRows.forEach((r: any) => attMap.set(r.ExamID, r));
        res.json({
            success: true,
            student: { ...getProfilePayload(student), semester: semesterValue },
            academic: { department: student.Department?.DepartmentName, departmentCode: student.Department?.DepartmentCode, program: student.Program?.ProgramName, semester: semesterValue, batchYear: student.BatchYear },
            stats: { totalExams: examData.length, upcomingExams: upcomingExams.length, unreadNotifications: notificationStats.unread, criticalNotifications: notificationStats.critical },
            todayExam: liveExam || upcomingToday || null,
            targetExam,
            upcomingExams,
            seating,
            notifications: notifications.data,
            history: historyExams.map(e => ({ ...e, attendanceStatus: getAttendanceStatus(attMap.get(e.examId)), markedAt: attMap.get(e.examId)?.MarkedAt ?? null }))
        });
    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).json({ message: "Internal error" });
    }
};

export const getStudentExams = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.UserID;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        const student = await loadStudent(userId);
        if (!student) return res.status(404).json({ message: "Student not found" });
        const now = new Date();
        const exams = await fetchRegisteredExams(student.StudentID);
        res.json({ success: true, data: exams.map(e => mapExam(e, now)) });
    } catch (error) {
        console.error("Exams error:", error);
        res.status(500).json({ message: "Internal error" });
    }
};

export const getStudentUpcomingExams = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.UserID;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        const student = await loadStudent(userId);
        if (!student) return res.status(404).json({ message: "Student not found" });
        const now = new Date();
        const exams = await fetchRegisteredExams(student.StudentID);
        const upcoming = exams.filter(e => getExamStatus(e.ExamDate, e.Session, e.Duration, now) !== "COMPLETED");
        res.json({ success: true, data: upcoming.map(e => mapExam(e, now)) });
    } catch (error) {
        console.error("Upcoming error:", error);
        res.status(500).json({ message: "Internal error" });
    }
};

export const getStudentSeating = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.UserID;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        const student = await loadStudent(userId);
        if (!student) return res.status(404).json({ message: "Student not found" });
        const examId = req.params.examId;
        const now = new Date();
        let targetExam: any;
        if (examId) {
            targetExam = await Exam.findByPk(examId as string, { include: [{ model: Subject, attributes: ["SubjectName", "SubjectCode"] }] });
        } else {
            const exams = await fetchRegisteredExams(student.StudentID);
            const mapped = exams.map(e => ({ ...e.toJSON(), ...mapExam(e, now) }));
            const best = mapped.find(e => e.status === "LIVE") || mapped.find(e => e.status === "UPCOMING" && e.date === todayInIST()) || mapped.find(e => e.status === "UPCOMING");
            if (best) targetExam = exams.find(e => e.ExamID === best.examId);
        }
        if (!targetExam) return res.status(404).json({ message: "No exam found" });
        const mappedInfo = mapExam(targetExam, now);
        if (!mappedInfo.isSeatingVisible) {
            return res.json({ success: false, message: `Visible from ${formatDate(targetExam.ExamDate)}`, data: { exam: mappedInfo, assignment: null, layout: [], visibilityError: true } });
        }
        const assignment = await SeatAllocation.findOne({ where: { ExamID: targetExam.ExamID, StudentID: student.StudentID }, include: [{ model: Seat, include: [{ model: Room, include: [Block, Floor] }] }] });
        if (!assignment) return res.json({ success: true, data: { exam: mappedInfo, assignment: null, layout: [] } });
        const seat = (assignment as any).Seat;
        const room = seat?.Room;
        const layout = await SeatAllocation.findAll({ where: { ExamID: targetExam.ExamID }, include: [{ model: Seat, required: true, where: { RoomID: seat.RoomID } }, { model: Student, include: [{ model: User, attributes: ["FullName"] }] }] });
        const roomLayout = layout.map((item: any) => ({ studentId: item.StudentID, seatNumber: item.Seat?.SeatIndex, rowLabel: item.Seat?.RowIndex, benchNumber: item.Seat?.BenchIndex, isMe: item.StudentID === student.StudentID }));
        res.json({ success: true, data: { exam: mappedInfo, assignment: { seatNumber: seat.SeatIndex, benchNumber: seat.BenchIndex, rowLabel: seat.RowIndex, roomCode: room.RoomCode || room.RoomName, blockName: room.Block?.BlockName, floorName: room.Floor?.FloorName || "Ground Floor", roomType: room.RoomType, capacity: room.TotalCapacity || room.Capacity }, layout: roomLayout } });
    } catch (error) {
        console.error("Seating error:", error);
        res.status(500).json({ message: "Internal error" });
    }
};

export const getSeatLayout = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.UserID;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        const student = await loadStudent(userId);
        if (!student) return res.status(404).json({ message: "Student not found" });
        const examId = req.params.examId;
        const assignment = await SeatAllocation.findOne({ where: { ExamID: examId, StudentID: student.StudentID }, include: [{ model: Seat }] });
        if (!assignment || !(assignment as any).Seat) return res.status(404).json({ message: "No seating" });
        const layout = await SeatAllocation.findAll({ where: { ExamID: examId }, include: [{ model: Seat, required: true, where: { RoomID: (assignment as any).Seat.RoomID } }] });
        res.json({ success: true, data: layout.map((item: any) => ({ studentId: item.StudentID, seatNumber: item.Seat?.SeatIndex, rowLabel: item.Seat?.RowIndex, benchNumber: item.Seat?.BenchIndex, isMe: item.StudentID === student.StudentID })) });
    } catch (error) {
        console.error("Layout error:", error);
        res.status(500).json({ message: "Internal error" });
    }
};

export const getStudentNotifications = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.UserID;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        const result = await notificationService.getUserNotifications(userId, req.query);
        res.json({ success: true, ...result, stats: await notificationService.getUserStats(userId) });
    } catch (error) {
        console.error("Notification error:", error);
        res.status(500).json({ message: "Internal error" });
    }
};

export const getStudentHistory = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.UserID;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        const student = await loadStudent(userId);
        if (!student) return res.status(404).json({ message: "Student not found" });
        const now = new Date();
        const exams = await fetchRegisteredExams(student.StudentID);
        const past = exams.filter(e => getExamStatus(e.ExamDate, e.Session, e.Duration, now) === "COMPLETED");
        const attendance = await Attendance.findAll({ where: { StudentID: student.StudentID } });
        const attMap = new Map();
        attendance.forEach((r: any) => attMap.set(r.ExamID, r));
        res.json({ success: true, data: past.map(e => ({ ...mapExam(e, now), attendanceStatus: getAttendanceStatus(attMap.get(e.ExamID)) })) });
    } catch (error) {
        console.error("History error:", error);
        res.status(500).json({ message: "Internal error" });
    }
};