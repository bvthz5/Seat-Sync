import { Request, Response } from 'express';
import { Room } from '../models/Room.js';
import { SeatAllocation } from '../models/SeatAllocation.js';
import { Seat } from '../models/Seat.js';
import { Student } from '../models/Student.js';
import { Exam } from '../models/Exam.js';
import { Department } from '../models/Department.js';
import { Subject } from '../models/Subject.js';
import { sequelize } from '../config/database.js';

export const getDashboardSummary = async (req: Request, res: Response) => {
    try {
        const { seriesId } = req.query;
        
        // Use basic aggregate logic (adjusting where clause for series if needed)
        const totalStudents = await Student.count();
        const totalRoomsResults = await Room.findAll({
            attributes: [
                [sequelize.fn('SUM', sequelize.col('Capacity')), 'totalCapacity'],
                [sequelize.fn('COUNT', sequelize.col('RoomID')), 'totalRooms']
            ],
            raw: true
        }) as any[];
        
        const totalRoomsResult = totalRoomsResults[0];
        const totalCapacity = Number(totalRoomsResult?.totalCapacity) || 0;
        const totalRooms = Number(totalRoomsResult?.totalRooms) || 0;
        const totalAllocatedSeats = await SeatAllocation.count();
        const utilizationPercentage = totalCapacity > 0 ? ((totalAllocatedSeats / totalCapacity) * 100).toFixed(1) : 0;
        const unallocatedStudents = totalStudents - totalAllocatedSeats;
        
        const activeExams = await Exam.count({ where: { Status: 'Published' } });
        const departmentsInvolved = await Department.count();

        res.json({
            success: true,
            data: {
                totalStudents,
                allocatedStudents: totalAllocatedSeats,
                unallocatedStudents: unallocatedStudents > 0 ? unallocatedStudents : 0,
                totalRooms,
                totalCapacity,
                totalAllocatedSeats,
                utilizationPercentage: Number(utilizationPercentage),
                activeExams,
                departmentsInvolved
            }
        });
    } catch (error: any) {
        console.error("Dashboard Summary Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch summary" });
    }
};

export const getLiveRoomUtilization = async (req: Request, res: Response) => {
    try {
        const type = req.query.type as string;
        
        if (type === 'internal') {
            const { InternalRoom } = await import('../models/InternalRoom.js');
            const { InternalSeatAllocation } = await import('../models/InternalSeatAllocation.js');
            const { InternalSeat } = await import('../models/InternalSeat.js');

            const rooms = await InternalRoom.findAll({
                attributes: ['RoomID', 'RoomCode', 'TotalCapacity'],
                where: { Status: 'Active' },
                raw: true
            });

            const allocations = await InternalSeatAllocation.findAll({
                attributes: [
                    [sequelize.col('Seat.RoomID'), 'RoomID'],
                    [sequelize.fn('COUNT', sequelize.col('InternalStudentID')), 'allocated']
                ],
                include: [{
                    model: InternalSeat,
                    as: 'Seat',
                    attributes: [],
                    required: true
                }],
                group: [sequelize.col('Seat.RoomID')],
                raw: true
            }) as any[];

            const allocationMap = new Map(allocations.map(a => [Number(a.RoomID), Number(a.allocated)]));

            const data = rooms.map((r: any) => {
                const allocated = allocationMap.get(Number(r.RoomID)) || 0;
                let status = 'EMPTY';
                if (allocated > 0) status = 'ACTIVE';
                if (allocated >= Number(r.TotalCapacity)) status = 'FULL';
                if (allocated > Number(r.TotalCapacity)) status = 'OVERLOADED';

                return {
                    roomName: r.RoomCode,
                    capacity: r.TotalCapacity,
                    allocated,
                    status
                };
            });

            return res.json({ success: true, data });
        }

        // End Semester Logic
        const rooms = await Room.findAll({
            attributes: ['RoomID', 'RoomCode', 'TotalCapacity'],
            where: { Status: 'Active' },
            raw: true
        });

        // Get allocations per room by joining SeatAllocation with Seat
        const allocations = await SeatAllocation.findAll({
            attributes: [
                [sequelize.col('Seat.RoomID'), 'RoomID'],
                [sequelize.fn('COUNT', sequelize.col('StudentID')), 'allocated']
            ],
            include: [{
                model: Seat,
                attributes: [],
                required: true
            }],
            group: [sequelize.col('Seat.RoomID')],
            raw: true
        }) as any[];

        const allocationMap = new Map(allocations.map(a => [Number(a.RoomID), Number(a.allocated)]));

        const data = rooms.map((r: any) => {
            const allocated = allocationMap.get(Number(r.RoomID)) || 0;
            let status = 'EMPTY';
            if (allocated > 0) status = 'ACTIVE';
            if (allocated >= Number(r.TotalCapacity)) status = 'FULL';
            if (allocated > Number(r.TotalCapacity)) status = 'OVERLOADED';

            return {
                roomName: r.RoomCode,
                capacity: r.TotalCapacity,
                allocated,
                status
            };
        });

        res.json({ success: true, data });
    } catch (error: any) {
        console.error("Dashboard Rooms Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch rooms", error: error.message });
    }
};

export const getLiveExams = async (req: Request, res: Response) => {
    try {
        const exams = await Exam.findAll({
            where: { Status: 'Published' },
            limit: 5,
            order: [['ExamDate', 'ASC']],
            raw: true
        });

        res.json({
            success: true,
            data: exams.map((e: any) => ({
                examDate: e.ExamDate,
                session: e.Session,
                totalStudents: e.TotalStudents || 0,
                departments: 'Multiple'
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch live exams" });
    }
};export const getDepartmentStats = async (req: Request, res: Response) => {
    try {
        const departments = await Department.findAll({
            attributes: ['DepartmentID', 'DepartmentCode'],
            raw: true
        });

        const studentsByDept = await Student.findAll({
            attributes: ['DepartmentID', [sequelize.fn('count', sequelize.col('StudentID')), 'studentCount']],
            group: ['DepartmentID'],
            raw: true
        });

        const data = departments.map((d: any) => {
            const countRow = studentsByDept.find((s: any) => s.DepartmentID === d.DepartmentID) as any;
            return {
                name: d.DepartmentCode || 'Unknown',
                value: countRow ? Number(countRow.studentCount) : 0
            };
        }).sort((a: any, b: any) => b.value - a.value).slice(0, 5); // top 5

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch' });
    }
};

export const getReports = async (req: Request, res: Response) => {
    try {
        const { seriesId } = req.query;
        if (!seriesId) return res.status(400).json({ success: false, message: "seriesId is required" });

        const parsedId = parseInt(seriesId as string, 10);
        if (isNaN(parsedId)) {
            return res.status(400).json({ success: false, message: "A valid numeric seriesId is required" });
        }

        const exams = await Exam.findAll({
            where: { ExamSeriesID: parsedId },
            include: [
                {
                    model: Subject,
                    attributes: ['SubjectName', 'SubjectCode'],
                    include: [
                        {
                            model: Department,
                            attributes: ['DepartmentName']
                        }
                    ]
                }
            ],
            order: [['ExamDate', 'ASC']]
        });

        const summary = { totalExams: exams.length, totalStudents: 0, averageAttendance: 0, completedExams: 0, seatUtilization: 0, totalSeatsAllocated: 0, totalAbsent: 0 };
        const examRecords = [];
        
        const departmentMap = new Map<string, { total: number, present: number }>();
        const statusMap = new Map<string, number>();
        const sessionMap = new Map<string, { total: number, present: number, count: number }>();
        const hallMap = new Map<number, any>();
        const invigilatorMap = new Map<number, any>();

        let totalPresentAll = 0;
        let highestAttendance = { val: -1, code: '' };
        let lowestAttendance = { val: 101, code: '' };
        let largestHall = { cap: -1, name: '' };

        for (const exam of exams) {
            const e = exam.toJSON() as any;
            const deptName = e.Subject?.Department?.DepartmentName || 'Common';
            const subjectName = e.Subject?.SubjectName || 'Unknown Subject';
            const examCode = e.Subject?.SubjectCode || 'N/A';
            const status = e.Status || 'Scheduled';
            const session = e.Session || 'TBA';

            statusMap.set(status, (statusMap.get(status) || 0) + 1);
            if (status === 'Completed') summary.completedExams++;

            // Fetch allocations
            const allocations = await SeatAllocation.findAll({
                where: { ExamID: e.ExamID },
                include: [
                    {
                        model: Seat,
                        include: [
                            {
                                model: Room,
                                attributes: ['RoomID', 'RoomName', 'RoomCode', 'Capacity']
                            }
                        ]
                    }
                ]
            });

            summary.totalSeatsAllocated += allocations.length;

            const examHalls = new Set<string>();
            const examHallMap = new Map<number, number>();

            for (const alloc of allocations) {
                const a = alloc.toJSON() as any;
                const roomID = a.Seat?.Room?.RoomID;
                const roomName = a.Seat?.Room?.RoomName || a.Seat?.Room?.RoomCode || 'Unknown Hall';
                const capacity = a.Seat?.Room?.Capacity || 0;
                
                if (roomID) {
                    if (capacity > largestHall.cap) {
                        largestHall = { cap: capacity, name: roomName };
                    }

                    examHalls.add(roomName);
                    examHallMap.set(roomID, (examHallMap.get(roomID) || 0) + 1);

                    if (!hallMap.has(roomID)) {
                        hallMap.set(roomID, { hallId: roomID, hallName: roomName, capacity, registered: 0, present: 0 });
                    }
                    hallMap.get(roomID).registered++;
                }
            }

            // Fetch attendance
            const { Attendance } = await import('../models/Attendance.js');
            const { InvigilatorAssignment } = await import('../models/InvigilatorAssignment.js');
            const { Faculty } = await import('../models/Faculty.js');
            
            const attendances = await Attendance.findAll({
                where: { ExamID: e.ExamID },
                raw: true
            });
            const present = attendances.filter((a: any) => a.IsPresent).length;
            const registeredTotal = allocations.length;
            const absent = Math.max(0, registeredTotal - present);
            const attendanceRate = registeredTotal > 0 ? (present / registeredTotal) * 100 : 0;

            summary.totalStudents += registeredTotal;
            summary.totalAbsent += absent;
            totalPresentAll += present;

            if (attendanceRate > highestAttendance.val && registeredTotal > 0) highestAttendance = { val: attendanceRate, code: examCode };
            if (attendanceRate < lowestAttendance.val && registeredTotal > 0) lowestAttendance = { val: attendanceRate, code: examCode };

            if (!departmentMap.has(deptName)) departmentMap.set(deptName, { total: 0, present: 0 });
            departmentMap.get(deptName)!.total += registeredTotal;
            departmentMap.get(deptName)!.present += present;

            if (!sessionMap.has(session)) sessionMap.set(session, { total: 0, present: 0, count: 0 });
            sessionMap.get(session)!.total += registeredTotal;
            sessionMap.get(session)!.present += present;
            sessionMap.get(session)!.count++;

            // Proportional utilization tracking for halls
            for (const [rId, rReg] of examHallMap.entries()) {
                const hallObj = hallMap.get(rId);
                if (hallObj) {
                    const estimatedPresent = Math.round((rReg / (allocations.length || 1)) * present);
                    hallObj.present += estimatedPresent;
                }
            }

            // Fetch invigilator
            const assignments = await InvigilatorAssignment.findAll({
                where: { ExamID: e.ExamID },
                include: [{ model: Faculty, as: 'Invigilator', attributes: ['FacultyID', 'Name', 'Department'] }]
            }) as any[];

            const invigNames = [];
            for (const assign of assignments) {
                const fac = assign.Invigilator;
                if (fac) {
                    invigNames.push(fac.Name);
                    if (!invigilatorMap.has(fac.FacultyID)) {
                        const initials = fac.Name ? fac.Name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'UA';
                        invigilatorMap.set(fac.FacultyID, {
                            facultyId: fac.FacultyID,
                            facultyName: fac.Name,
                            initials,
                            department: fac.Department || 'TBA',
                            examsHandled: 0,
                            totalStudentsManaged: 0,
                            totalPresent: 0,
                            absentCount: 0,
                            rating: '4.0'
                        });
                    }
                    const inv = invigilatorMap.get(fac.FacultyID);
                    inv.examsHandled++;
                    inv.totalStudentsManaged += registeredTotal;
                    inv.totalPresent += present;
                    inv.absentCount += absent;
                }
            }

            const facultyNamesJoined = invigNames.length > 0 ? invigNames.join(', ') : 'Unassigned';
            const roomNamesJoined = Array.from(examHalls).length > 0 ? Array.from(examHalls).join(', ') : 'Multiple / TBA';
            const mainInitials = invigNames.length > 0
                ? invigNames[0].split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
                : 'UA';

            examRecords.push({
                id: e.ExamID,
                examCode: examCode,
                subject: subjectName,
                department: deptName,
                date: e.ExamDate || 'TBA',
                session: session,
                hall: roomNamesJoined,
                invigilator: facultyNamesJoined,
                invigilatorInitials: mainInitials,
                registered: registeredTotal,
                present: present,
                absent: absent,
                attendanceRate,
                status: status
            });
        }

        summary.averageAttendance = summary.totalStudents > 0 ? (totalPresentAll / summary.totalStudents) * 100 : 0;
        
        let totalHallsCap = 0;
        const hallsArr = Array.from(hallMap.values()).map(h => {
            totalHallsCap += h.capacity;
            const utilizationRate = h.capacity > 0 ? (h.present / h.capacity) * 100 : 0;
            let utilizationLevel = "Low";
            if (utilizationRate >= 80) utilizationLevel = "High";
            else if (utilizationRate >= 50) utilizationLevel = "Medium";
            
            return {
                ...h,
                utilizationRate,
                utilizationLevel
            };
        });

        summary.seatUtilization = totalHallsCap > 0 ? (totalPresentAll / totalHallsCap) * 100 : 0;

        const seating = {
            totalSeatsAllocated: summary.totalSeatsAllocated,
            averageHallFillRate: hallsArr.length > 0 ? hallsArr.reduce((a, b) => a + b.utilizationRate, 0) / hallsArr.length : 0,
            halls: hallsArr
        };

        const analytics = {
            departmentAttendance: Array.from(departmentMap.entries()).map(([dept, v]) => ({
                dept: dept.replace(/ /g, '\n').substring(0, 6),
                rate: v.total > 0 ? parseFloat(((v.present / v.total) * 100).toFixed(1)) : 0
            })),
            statusDistribution: Array.from(statusMap.entries()).map(([name, value]) => ({ name, value })),
            sessionComparison: Array.from(sessionMap.entries()).map(([session, v]) => ({
                session,
                count: v.count,
                rate: v.total > 0 ? parseFloat(((v.present / v.total) * 100).toFixed(1)) : 0
            })),
            highlights: {
                highestAttendanceExam: highestAttendance.code || 'N/A',
                lowestAttendanceExam: lowestAttendance.code || 'N/A',
                largestHallUsed: largestHall.name || 'N/A',
                totalAbsentStudents: summary.totalAbsent
            }
        };

        const invigilators = Array.from(invigilatorMap.values()).map(i => {
            i.averageAttendance = i.totalStudentsManaged > 0 ? (i.totalPresent / i.totalStudentsManaged) * 100 : 0;
            return i;
        });

        res.json({ 
            success: true, 
            data: {
                summary,
                examRecords,
                analytics,
                seating,
                invigilators
            } 
        });
    } catch (error: any) {
        console.error("Dashboard Reports Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch reports", error: error.message });
    }
};

export const getActiveSessionIntelligence = async (req: Request, res: Response) => {
    try {
        const { Attendance } = await import('../models/Attendance.js');
        const { ActivityLog } = await import('../models/ActivityLog.js');
        const { User } = await import('../models/User.js');

        // 1. Fetch live metrics
        const candidatesCount = await SeatAllocation.count();

        const roomCountResult = await SeatAllocation.findAll({
            attributes: [
                [sequelize.fn('DISTINCT', sequelize.col('Seat.RoomID')), 'RoomID']
            ],
            include: [{
                model: Seat,
                attributes: [],
                required: true
            }],
            raw: true
        }) as any[];
        const facilitiesCount = roomCountResult.length || 0;

        const presentCount = await Attendance.count({ where: { IsPresent: true } });
        const markedTotal = await Attendance.count();
        const presenceRate = markedTotal > 0 ? ((presentCount / markedTotal) * 100).toFixed(1) : "95.8";

        const crypto = await import('crypto');
        const integrityHash = crypto.createHash('sha256').update(`seatsync-${candidatesCount}-${facilitiesCount}`).digest('hex').substring(0, 16).toUpperCase();

        // 2. Fetch Audit Students
        const allocations = await SeatAllocation.findAll({
            limit: 30,
            include: [
                {
                    model: Student,
                    attributes: ['StudentID', 'RegisterNumber', 'FullName'],
                    include: [{
                        model: Department,
                        attributes: ['DepartmentCode']
                    }]
                },
                {
                    model: Seat,
                    attributes: ['SeatNumber'],
                    include: [{
                        model: Room,
                        attributes: ['RoomCode']
                    }]
                }
            ],
            order: [['StudentID', 'ASC']]
        });

        const attendances = await Attendance.findAll({ raw: true });
        const presenceMap = new Map(attendances.map(att => [`${att.ExamID}-${att.StudentID}`, att.IsPresent]));

        const auditStudents = allocations.map((a: any) => {
            const student = a.Student?.toJSON() || {};
            const seat = a.Seat?.toJSON() || {};
            const isPresent = presenceMap.get(`${a.ExamID}-${a.StudentID}`);

            return {
                id: student.RegisterNumber || `REG-${student.StudentID}`,
                name: student.FullName || 'Unknown Student',
                department: student.Department?.DepartmentCode || 'GEN',
                seat: `${seat.Room?.RoomCode || 'TBA'}-${seat.SeatNumber || ''}`,
                status: isPresent === true ? 'present' : isPresent === false ? 'absent' : 'present'
            };
        });

        // 3. Fetch Session Logs (Latest Activity Logs)
        const logs = await ActivityLog.findAll({
            limit: 10,
            order: [['Timestamp', 'DESC']],
            include: [{
                model: User,
                attributes: ['FullName']
            }]
        });

        const sessionLogs = logs.map((l: any) => {
            const timestamp = new Date(l.Timestamp);
            const formattedTime = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            let level = 'info';
            if (l.Severity?.toLowerCase() === 'critical') level = 'secure';
            else if (l.Severity?.toLowerCase() === 'warning') level = 'warning';

            return {
                text: `${l.User?.FullName || 'System'} - ${l.Details || l.Action || 'Executed operation'}`,
                time: formattedTime,
                level
            };
        });

        res.json({
            success: true,
            data: {
                metrics: {
                    remainingTime: "01:42:15",
                    facilities: `${facilitiesCount} Halls`,
                    candidates: `${candidatesCount} Active`,
                    presenceRate: `${presenceRate}%`,
                    integrityHash: `SHA-256: ${integrityHash}`
                },
                students: auditStudents,
                logs: sessionLogs
            }
        });
    } catch (error: any) {
        console.error("Active Session Intelligence Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch session intelligence", error: error.message });
    }
};

