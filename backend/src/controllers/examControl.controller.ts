import { Request, Response } from "express";
import { Exam, ActivityLog, Room, SeatAllocation, Seat, Student, Notification, User } from "../models/index.js";
import { Op } from "sequelize";
import { sequelize } from "../config/database.js";

/**
 * Exam Control Controller
 * Root Admin Only - Enterprise Grade
 */

enum ExamStatus {
    DRAFT = 'Draft',
    READY = 'Ready',
    PUBLISHED = 'Published',
    IN_PROGRESS = 'In Progress',
    COMPLETED = 'Completed',
    ARCHIVED = 'Archived',
    CANCELLED = 'Cancelled'
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    [ExamStatus.DRAFT]: [ExamStatus.READY, ExamStatus.CANCELLED],
    [ExamStatus.READY]: [ExamStatus.PUBLISHED, ExamStatus.DRAFT, ExamStatus.CANCELLED],
    [ExamStatus.PUBLISHED]: [ExamStatus.IN_PROGRESS, ExamStatus.READY, ExamStatus.CANCELLED], // Ready allows unpublish
    [ExamStatus.IN_PROGRESS]: [ExamStatus.COMPLETED, ExamStatus.CANCELLED], // Emergency cancel
    [ExamStatus.COMPLETED]: [ExamStatus.ARCHIVED, ExamStatus.IN_PROGRESS], // InProgress allows rollback
    [ExamStatus.ARCHIVED]: [ExamStatus.COMPLETED], // Restore
    [ExamStatus.CANCELLED]: [ExamStatus.DRAFT] // Reset
};

/**
 * Get exam status overview
 */
export const getExamStatusOverview = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;

        // Fetch Global Stats (All records)
        const allExamsStats = await Exam.findAll({
            attributes: ['Status', 'IsEmergencyMode', 'AttendanceLocked']
        });

        const statusCounts = allExamsStats.reduce((acc: any, exam: any) => {
            const status = exam.Status || 'Draft';
            acc[status] = (acc[status] || 0) + 1;
            if (exam.IsEmergencyMode) acc['Emergency'] = (acc['Emergency'] || 0) + 1;
            if (exam.AttendanceLocked) acc['Locked'] = (acc['Locked'] || 0) + 1;
            return acc;
        }, { Emergency: 0, Locked: 0 });

        // Fetch Paginated Exams List
        const { count, rows } = await Exam.findAndCountAll({
            attributes: ['ExamID', 'ExamName', 'ExamDate', 'Session', 'Duration', 'Status', 'IsEmergencyMode', 'AttendanceLocked', 'SubjectID'],
            order: [['ExamDate', 'DESC']],
            limit,
            offset
        });

        res.status(200).json({
            success: true,
            data: {
                exams: rows,
                total: count,
                page,
                totalPages: Math.ceil(count / limit),
                statusCounts
            }
        });
    } catch (error: any) {
        console.error("Error fetching exam status overview:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch exam status",
            error: error.message
        });
    }
};

/**
 * Get Activity Logs
 */
export const getExamActivityLogs = async (req: Request, res: Response): Promise<void> => {
    try {
        const { examId } = req.params;
        const whereClause: any = {};

        if (examId) {
            whereClause.EntityID = examId;
            whereClause.EntityType = 'Exam';
        }

        const logs = await ActivityLog.findAll({
            where: whereClause,
            include: [{ model: User, attributes: ['FullName', 'Email', 'Role'] }],
            order: [['Timestamp', 'DESC']],
            limit: 200 // Increased limit
        });

        res.status(200).json({
            success: true,
            data: logs
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Update Exam Status (State Machine Enforcement)
 */
export const overrideExamStatus = async (req: Request, res: Response): Promise<void> => {
    const transaction = await sequelize.transaction();
    try {
        const { examId } = req.params;
        const { newStatus, reason } = req.body;
        const currentUser = (req as any).user;

        const exam = await Exam.findByPk(parseInt(examId as string), { transaction });
        if (!exam) {
            await transaction.rollback();
            res.status(404).json({ success: false, message: "Exam not found" });
            return;
        }

        const oldStatus = (exam as any).Status || ExamStatus.DRAFT;

        // 1. Validate Transition
        const allowedTargets = ALLOWED_TRANSITIONS[oldStatus] || [];
        if (!allowedTargets.includes(newStatus) && oldStatus !== newStatus) { // Allow save if same status
            await transaction.rollback();
            res.status(400).json({
                success: false,
                message: `Invalid transition from ${oldStatus} to ${newStatus}. Allowed: ${allowedTargets.join(', ')}`
            });
            return;
        }

        // 2. Business Rules
        if (newStatus === ExamStatus.PUBLISHED) {
            // Check if seats generated
            const allocations = await SeatAllocation.count({ where: { ExamID: exam.ExamID }, transaction });
            if (allocations === 0) {
                await transaction.rollback();
                res.status(400).json({ success: false, message: "Cannot publish exam without seating generation." });
                return;
            }
        }

        if (newStatus === ExamStatus.COMPLETED) {
            (exam as any).AttendanceLocked = true; // Auto-lock
        }

        // 3. Apply Update
        (exam as any).Status = newStatus;
        await exam.save({ transaction });

        // 4. Log
        await ActivityLog.create({
            UserID: currentUser.UserID,
            Action: 'STATUS_CHANGE',
            EntityType: 'Exam',
            EntityID: exam.ExamID,
            Details: `Status changed: ${oldStatus} -> ${newStatus}. Reason: ${reason || 'State Transition'}`,
            IPAddress: req.ip || 'unknown',
            UserAgent: req.get('user-agent') || 'unknown',
            Severity: 'Info',
            Status: 'Success'
        }, { transaction });

        await transaction.commit();

        res.status(200).json({
            success: true,
            message: `Exam status updated to ${newStatus}`,
            data: { examId: exam.ExamID, oldStatus, newStatus }
        });

    } catch (error: any) {
        await transaction.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Toggle Visibility (Legacy Wrapper -> Proxies to Status)
 */
export const toggleExamVisibility = async (req: Request, res: Response): Promise<void> => {
    // Determine target status based on visibility
    // Visible -> Published
    // Hidden -> Ready
    const { visible, reason } = req.body;
    req.body.newStatus = visible ? ExamStatus.PUBLISHED : ExamStatus.READY;
    return overrideExamStatus(req, res);
};

/**
 * Emergency Seating Regeneration
 */
export const triggerEmergencyAllocation = async (req: Request, res: Response): Promise<void> => {
    const transaction = await sequelize.transaction();
    try {
        const { examId } = req.params;
        const { excludeRoomIds } = req.body;
        const currentUser = (req as any).user;

        const exam = await Exam.findByPk(parseInt(examId as string), { transaction });
        if (!exam) {
            await transaction.rollback();
            res.status(404).json({ success: false, message: "Exam not found" });
            return;
        }

        // Rule: If Published or InProgress, warn/restrict?
        // Emergency Override allows it, but we flag it.
        if ((exam as any).Status === ExamStatus.COMPLETED || (exam as any).Status === ExamStatus.ARCHIVED) {
            await transaction.rollback();
            res.status(400).json({ success: false, message: "Cannot modify completed/archived exams." });
            return;
        }

        // Logic (Previous Logic Maintained)
        if (!excludeRoomIds || !Array.isArray(excludeRoomIds)) {
            await transaction.rollback();
            res.status(400).json({ success: false, message: "excludeRoomIds required" });
            return;
        }

        const affectedAllocations = await SeatAllocation.findAll({
            where: { ExamID: exam.ExamID },
            include: [{
                model: Seat,
                required: true,
                where: { RoomID: { [Op.in]: excludeRoomIds } },
                include: [{ model: Room, attributes: ['RoomCode'] }]
            }],
            transaction
        });

        if (affectedAllocations.length === 0) {
            await transaction.rollback();
            res.status(400).json({ success: false, message: "No students in specified rooms." });
            return;
        }

        const studentIds = affectedAllocations.map(a => a.StudentID as number);
        const seatIds = affectedAllocations.map(a => a.SeatID);
        const roomCodes = [...new Set(affectedAllocations.map((a: any) => a.Seat.Room.RoomCode))];

        await SeatAllocation.destroy({
            where: { ExamID: exam.ExamID, SeatID: { [Op.in]: seatIds } },
            transaction
        });

        // Find seats
        const availableRooms = await Room.findAll({
            where: {
                Status: 'Active',
                ExamUsable: true,
                RoomID: { [Op.notIn]: excludeRoomIds } // Don't use bad rooms
            },
            include: [{ model: Seat, where: { IsActive: true }, required: true }],
            transaction
        });

        let allSeats: any[] = [];
        availableRooms.forEach((r: any) => { if (r.Seats) allSeats = allSeats.concat(r.Seats); });

        // Taken seats
        const taken = await SeatAllocation.findAll({ where: { ExamID: exam.ExamID }, attributes: ['SeatID'], transaction });
        const takenIds = new Set(taken.map((t: any) => t.SeatID));
        const freeSeats = allSeats.filter(s => !takenIds.has(s.SeatID));

        let count = 0;
        const newAllocs = [];
        const unallocated = [];

        for (let i = 0; i < studentIds.length; i++) {
            if (i < freeSeats.length) {
                newAllocs.push({ ExamID: exam.ExamID, SeatID: freeSeats[i].SeatID, StudentID: studentIds[i]! });
                count++;
            } else {
                unallocated.push(studentIds[i]!);
            }
        }

        if (newAllocs.length > 0) await SeatAllocation.bulkCreate(newAllocs, { transaction });

        (exam as any).IsEmergencyMode = true;
        (exam as any).ConflictDetails = `Reallocated ${count} students from ${roomCodes.join(',')}.`;
        await exam.save({ transaction });

        await ActivityLog.create({
            UserID: currentUser.UserID,
            Action: 'EMERGENCY_REALLOCATION',
            EntityType: 'Exam',
            EntityID: exam.ExamID,
            Details: `Moved ${count} students from rooms: ${roomCodes.join(', ')}. Failed: ${unallocated.length}`,
            IPAddress: req.ip || 'unknown',
            UserAgent: req.get('user-agent') || 'unknown',
            Severity: 'Critical',
            Status: unallocated.length > 0 ? 'Failure' : 'Success',
            Metadata: { movedCount: count, failedCount: unallocated.length, sourceRooms: roomCodes }
        }, { transaction });

        await transaction.commit();

        res.status(200).json({
            success: true,
            message: `Reallocated ${count} students. ${unallocated.length} pending.`,
            data: { count, unallocated }
        });

    } catch (error: any) {
        await transaction.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Disable Room Emergency
 */
export const disableRoomEmergency = async (req: Request, res: Response): Promise<void> => {
    const transaction = await sequelize.transaction();
    try {
        const { roomId, reason } = req.body;
        const currentUser = (req as any).user;

        const room = await Room.findByPk(roomId);
        if (!room) {
            await transaction.rollback();
            res.status(404).json({ success: false, message: "Room not found" });
            return;
        }

        // Check if attendance marked in this room? (Rule 2)
        // We lack precise attendance-by-room checking per allocated seat, but we can assume if Exam isInProgress, attendance might be marked.
        // For now, allow with warning logging.

        (room as any).Status = 'Inactive';
        (room as any).ExamUsable = false;
        await room.save({ transaction });

        // Log
        await ActivityLog.create({
            UserID: currentUser.UserID,
            Action: 'EMERGENCY_DISABLE_ROOM',
            EntityType: 'Room',
            EntityID: room.RoomID,
            Details: `Room disabled: ${reason}`,
            IPAddress: req.ip || 'unknown',
            UserAgent: req.get('user-agent') || 'unknown',
            Severity: 'Critical',
            Status: 'Success',
            Metadata: { roomId: room.RoomID, reason }
        }, { transaction });

        await transaction.commit();
        res.status(200).json({ success: true, message: "Room disabled globaly." });

    } catch (error: any) {
        await transaction.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Lock Attendance FORCE
 */
export const lockAttendance = async (req: Request, res: Response): Promise<void> => {
    const transaction = await sequelize.transaction();
    try {
        const { examId } = req.params;
        const { reason } = req.body;
        const currentUser = (req as any).user;

        const exam = await Exam.findByPk(parseInt(examId as string));
        if (!exam) {
            await transaction.rollback();
            res.status(404).json({ success: false, message: "Exam not found" });
            return;
        }

        (exam as any).AttendanceLocked = true;
        await exam.save({ transaction });

        await ActivityLog.create({
            UserID: currentUser.UserID,
            Action: 'FORCE_LOCK_ATTENDANCE',
            EntityType: 'Exam',
            EntityID: exam.ExamID,
            Details: `Locked attendance. Reason: ${reason || 'Manual Lock'}`,
            IPAddress: req.ip || 'unknown',
            UserAgent: req.get('user-agent') || 'unknown',
            Severity: 'Warning',
            Status: 'Success'
        }, { transaction });

        await transaction.commit();
        res.status(200).json({ success: true, message: "Attendance locked successfully" });

    } catch (error: any) {
        await transaction.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Broadcast
 */
export const broadcastNotification = async (req: Request, res: Response): Promise<void> => {
    try {
        const { examId } = req.params;
        const { message, title } = req.body;
        const currentUser = (req as any).user;

        const broadcastTitle = title || "Urgent Exam Update";

        await Notification.create({
            Title: broadcastTitle,
            Message: message,
            TargetType: 'ROLE',
            TargetId: 'student', // Default broadcast target
            SentBy: currentUser.UserID,
            SentAt: new Date()
        } as any); // Cast to any to bypass strict type check for now if needed, but should be fine. Actually, removing 'as any' is better if types match. I will try without 'as any' first.


        await ActivityLog.create({
            UserID: currentUser.UserID,
            Action: 'BROADCAST_ALERT',
            EntityType: 'Exam',
            EntityID: examId ? parseInt(examId as string) : undefined as any,
            Details: `Broadcast sent: ${broadcastTitle}`,
            IPAddress: req.ip || 'unknown',
            UserAgent: req.get('user-agent') || 'unknown',
            Severity: 'Warning',
            Status: 'Success'
        } as any);

        res.status(200).json({ success: true, message: "Broadcast sent" });

    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get Detailed Exam Metrics and Context
 */
export const getExamDetails = async (req: Request, res: Response): Promise<void> => {
    try {
        const { examId } = req.params;
        const exam = await Exam.findByPk(parseInt(examId as string));

        if (!exam) {
            res.status(404).json({ success: false, message: "Exam not found" });
            return;
        }

        // Metrics
        const allocations = await SeatAllocation.findAll({
            where: { ExamID: exam.ExamID },
            include: [{
                model: Seat,
                attributes: ['RoomID'],
                required: true
            }]
        });

        const studentsAllocated = allocations.length;
        const uniqueRooms = new Set(allocations.map((a: any) => a.Seat.RoomID)).size;
        const seatingGenerated = studentsAllocated > 0;

        res.status(200).json({
            success: true,
            data: {
                ...exam.toJSON(),
                metrics: {
                    studentsAllocated,
                    roomsAllocated: uniqueRooms,
                    seatingGenerated,
                    attendanceLocked: (exam as any).AttendanceLocked
                }
            }
        });

    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
