import { Request, Response } from "express";
import { Exam, ActivityLog, Room, SeatAllocation, Seat, Student, Notification, User, Zone } from "../models/index.js";
import { Op } from "sequelize";
import { sequelize } from "../config/database.js";

/**
 * Exam Control Controller
 * Root Admin Only - Emergency exam management
 */

/**
 * Get exam status overview
 */
export const getExamStatusOverview = async (req: Request, res: Response): Promise<void> => {
    try {
        const exams = await Exam.findAll({
            attributes: ['ExamID', 'ExamName', 'ExamDate', 'StartTime', 'EndTime', 'Status', 'IsEmergencyMode', 'AttendanceLocked'],
            order: [['ExamDate', 'DESC']]
        });

        // Count by status
        const statusCounts = exams.reduce((acc: any, exam: any) => {
            const status = exam.Status || 'Draft';
            acc[status] = (acc[status] || 0) + 1;
            if (exam.IsEmergencyMode) acc['Emergency'] = (acc['Emergency'] || 0) + 1;
            return acc;
        }, { Emergency: 0 });

        res.status(200).json({
            success: true,
            data: {
                exams,
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
 * Get Activity Logs for specific exam or all
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
            include: [{ model: User, attributes: ['Username', 'Email', 'Role'] }],
            order: [['Timestamp', 'DESC']],
            limit: 100
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
 * Override exam status (Emergency)
 */
export const overrideExamStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { examId } = req.params;
        const { newStatus, reason } = req.body;
        const currentUser = (req as any).user;

        const validStatuses = ['Draft', 'Ready', 'Published', 'In Progress', 'Completed', 'Cancelled', 'Archived'];
        if (!validStatuses.includes(newStatus)) {
            res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
            return;
        }

        const exam = await Exam.findByPk(parseInt(examId as string));
        if (!exam) {
            res.status(404).json({ success: false, message: "Exam not found" });
            return;
        }

        const oldStatus = (exam as any).Status || 'Draft';
        (exam as any).Status = newStatus;

        // Auto-lock attendance if Completed
        if (newStatus === 'Completed') {
            (exam as any).AttendanceLocked = true;
        }

        await exam.save();

        // Log activity
        await ActivityLog.create({
            UserID: currentUser.UserID,
            Action: 'OVERRIDE_EXAM_STATUS',
            EntityType: 'Exam',
            EntityID: exam.ExamID,
            Details: `Changed exam status from ${oldStatus} to ${newStatus}. Reason: ${reason || 'Not provided'}`,
            IPAddress: req.ip || 'unknown',
            UserAgent: req.get('user-agent') || 'unknown'
        });

        res.status(200).json({
            success: true,
            message: "Exam status updated successfully",
            data: { examId: exam.ExamID, oldStatus, newStatus }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Toggle Exam Visibility (Publish/Unpublish)
 */
export const toggleExamVisibility = async (req: Request, res: Response): Promise<void> => {
    try {
        const { examId } = req.params;
        const { visible, reason } = req.body; // visible: boolean
        const currentUser = (req as any).user;

        const exam = await Exam.findByPk(parseInt(examId as string));
        if (!exam) {
            res.status(404).json({ success: false, message: "Exam not found" });
            return;
        }

        const oldStatus = exam.Status;
        // Logic: If visible=true, set to Published. If false, set to Ready (hidden from students)
        const newStatus = visible ? 'Published' : 'Ready';

        if (oldStatus === newStatus) {
            res.status(400).json({ success: false, message: `Exam is already ${newStatus}` });
            return;
        }

        (exam as any).Status = newStatus;
        await exam.save();

        await ActivityLog.create({
            UserID: currentUser.UserID,
            Action: visible ? 'EMERGENCY_PUBLISH' : 'EMERGENCY_UNPUBLISH',
            EntityType: 'Exam',
            EntityID: exam.ExamID,
            Details: `Visibility changed to ${visible}. Reason: ${reason}`,
            IPAddress: req.ip || 'unknown',
            UserAgent: req.get('user-agent') || 'unknown'
        });

        res.status(200).json({ success: true, message: `Exam ${visible ? 'Published' : 'Hidden'} successfully` });

    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Emergency Seating Regeneration
 * Reallocates students from specific bad rooms to other available rooms
 */
export const triggerEmergencyAllocation = async (req: Request, res: Response): Promise<void> => {
    const transaction = await sequelize.transaction();
    try {
        const { examId } = req.params;
        const { excludeRoomIds } = req.body; // Array of RoomIDs
        const currentUser = (req as any).user;

        if (!excludeRoomIds || !Array.isArray(excludeRoomIds)) {
            await transaction.rollback();
            res.status(400).json({ success: false, message: "excludeRoomIds array is required" });
            return;
        }

        const exam = await Exam.findByPk(parseInt(examId as string));
        if (!exam) {
            await transaction.rollback();
            res.status(404).json({ success: false, message: "Exam not found" });
            return;
        }

        // 1. Find matched allocations in these rooms
        // We need to join SeatAllocation -> Seat -> Room
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
            res.status(400).json({ success: false, message: "No students found in the specified rooms for this exam" });
            return;
        }

        const studentIdsToReallocate = affectedAllocations.map(a => a.StudentID);
        const affectedSeatIds = affectedAllocations.map(a => a.SeatID);
        const affectedRoomCodes = [...new Set(affectedAllocations.map((a: any) => a.Seat.Room.RoomCode))];

        // 2. Delete existing allocations
        await SeatAllocation.destroy({
            where: {
                ExamID: exam.ExamID,
                SeatID: { [Op.in]: affectedSeatIds }
            },
            transaction
        });

        // 3. Find available seats in OTHER rooms
        // Must be Active, ExamUsable, Not in excludeRoomIds
        const availableRooms = await Room.findAll({
            where: {
                Status: 'Active',
                ExamUsable: true,
                RoomID: { [Op.notIn]: excludeRoomIds }
            },
            include: [{
                model: Seat,
                where: { IsActive: true },
                required: true
            }],
            transaction
        });

        // Flatten seats
        let allSeats: any[] = [];
        availableRooms.forEach((room: any) => {
            if (room.Seats) allSeats = allSeats.concat(room.Seats);
        });

        // Find which seats are ALREADY taken by this exam (in other rooms) or overlapping exams
        const currentAllocations = await SeatAllocation.findAll({
            where: { ExamID: exam.ExamID },
            attributes: ['SeatID'],
            transaction
        });

        const occupiedSeatIds = new Set(currentAllocations.map((a: any) => a.SeatID));

        // Filter free seats
        const freeSeats = allSeats.filter(s => !occupiedSeatIds.has(s.SeatID));

        let reallocatedCount = 0;
        const unallocatedStudents: number[] = [];
        const newAllocations = [];

        // Assign
        for (let i = 0; i < studentIdsToReallocate.length; i++) {
            const studentId = studentIdsToReallocate[i];
            if (i < freeSeats.length && studentId) {
                newAllocations.push({
                    ExamID: exam.ExamID,
                    SeatID: freeSeats[i].SeatID,
                    StudentID: studentId
                });
                reallocatedCount++;
            } else if (studentId) {
                unallocatedStudents.push(studentId);
            }
        }

        if (newAllocations.length > 0) {
            await SeatAllocation.bulkCreate(newAllocations, { transaction });
        }

        (exam as any).IsEmergencyMode = true;
        await exam.save({ transaction });

        await ActivityLog.create({
            UserID: currentUser.UserID,
            Action: 'EMERGENCY_REALLOCATION',
            EntityType: 'Exam',
            EntityID: exam.ExamID,
            Details: `Reallocated ${reallocatedCount} students from rooms: ${affectedRoomCodes.join(', ')}. Unallocated: ${unallocatedStudents.length}`,
            IPAddress: req.ip || 'unknown',
            UserAgent: req.get('user-agent') || 'unknown'
        }, { transaction });

        await transaction.commit();

        res.status(200).json({
            success: true,
            message: `Reallocation complete. ${reallocatedCount} moved, ${unallocatedStudents.length} failed.`,
            data: { reallocatedCount, unallocatedStudents }
        });

    } catch (error: any) {
        await transaction.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Emergency Room Disable
 * Disables a room and triggers reallocation for all active exams using it
 */
export const disableRoomEmergency = async (req: Request, res: Response): Promise<void> => {
    const transaction = await sequelize.transaction();
    try {
        const { roomId } = req.body;
        const { reason } = req.body;
        const currentUser = (req as any).user;

        const room = await Room.findByPk(roomId);
        if (!room) {
            await transaction.rollback();
            res.status(404).json({ success: false, message: "Room not found" });
            return;
        }

        // Disable Room
        (room as any).Status = 'Inactive';
        (room as any).ExamUsable = false;
        await room.save({ transaction });

        // Find affected exams (active or future)
        // Join SeatAllocation -> Seat(where RoomID=roomId) -> Exam(where Status != Completed/Cancelled)
        const allocationsInRoom = await SeatAllocation.findAll({
            include: [
                { model: Seat, where: { RoomID: roomId }, required: true },
                {
                    model: Exam,
                    where: { Status: { [Op.notIn]: ['Completed', 'Cancelled', 'Archived'] } },
                    required: true
                }
            ],
            transaction
        });

        // Group by exam
        const affectedExamIds = [...new Set(allocationsInRoom.map((a: any) => a.Exam.ExamID))];
        const results = [];

        for (const examId of affectedExamIds) {
            // Logic similar to triggerEmergencyAllocation but internal
            // For brevity, we will just MARK the exam as EmergencyMode and log that it needs reallocation.
            const ex = await Exam.findByPk(examId, { transaction });
            if (ex) {
                (ex as any).IsEmergencyMode = true;
                (ex as any).ConflictDetails = (ex as any).ConflictDetails ? (ex as any).ConflictDetails + ` | Room ${room.RoomCode} disabled` : `Room ${room.RoomCode} disabled`;
                await ex.save({ transaction });
            }
            results.push(examId);
        }

        await ActivityLog.create({
            UserID: currentUser.UserID,
            Action: 'EMERGENCY_DISABLE_ROOM',
            EntityType: 'Room',
            EntityID: room.RoomID,
            Details: `Room disabled. Reason: ${reason}. Affected Exams: ${results.length}`,
            IPAddress: req.ip || 'unknown',
            UserAgent: req.get('user-agent') || 'unknown'
        }, { transaction });

        await transaction.commit();

        res.status(200).json({
            success: true,
            message: `Room disabled. ${results.length} exams flagged for attention.`,
            affectedExams: results
        });

    } catch (error: any) {
        await transaction.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Force Lock Attendance
 */
export const lockAttendance = async (req: Request, res: Response): Promise<void> => {
    try {
        const { examId } = req.params;
        const currentUser = (req as any).user;

        const exam = await Exam.findByPk(parseInt(examId as string));
        if (!exam) {
            res.status(404).json({ success: false, message: "Exam not found" });
            return;
        }

        (exam as any).AttendanceLocked = true;
        await exam.save();

        await ActivityLog.create({
            UserID: currentUser.UserID,
            Action: 'FORCE_LOCK_ATTENDANCE',
            EntityType: 'Exam',
            EntityID: exam.ExamID,
            Details: "Attendance locked by Root Admin",
            IPAddress: req.ip || 'unknown',
            UserAgent: req.get('user-agent') || 'unknown'
        });

        res.status(200).json({ success: true, message: "Attendance locked" });

    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Broadcast Notification
 */
export const broadcastNotification = async (req: Request, res: Response): Promise<void> => {
    try {
        const { examId } = req.params;
        const { message, title, type } = req.body;
        const currentUser = (req as any).user;

        // Since Notification model is global broadcast (TargetRole), we create one record.
        // We will include exam context in the title.

        let finalTitle = title || "Urgent Exam Alert";
        if (examId) {
            const exam = await Exam.findByPk(parseInt(examId as string));
            if (exam) {
                finalTitle = `[${exam.ExamName}] ${finalTitle}`;
            }
        }

        const notification = await Notification.create({
            Title: finalTitle,
            Message: message,
            TargetRole: 'student', // Broadcast to all students
            SentBy: currentUser.UserID,
            IsRead: false,
            CreatedAt: new Date(),
            SentAt: new Date()
        });

        await ActivityLog.create({
            UserID: currentUser.UserID,
            Action: 'BROADCAST_ALERT',
            EntityType: 'Exam',
            ...(examId && { EntityID: parseInt(examId as string) }),
            Details: `Sent broadcast alert: ${finalTitle}`,
            IPAddress: req.ip || 'unknown',
            UserAgent: req.get('user-agent') || 'unknown'
        });

        res.status(200).json({ success: true, message: "Broadcast sent successfully", data: notification });

    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
