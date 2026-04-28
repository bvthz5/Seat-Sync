import { Request, Response } from 'express';
import { Room } from '../models/Room.js';
import { SeatAllocation } from '../models/SeatAllocation.js';
import { Seat } from '../models/Seat.js';
import { Student } from '../models/Student.js';
import { Exam } from '../models/Exam.js';
import { Department } from '../models/Department.js';
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


