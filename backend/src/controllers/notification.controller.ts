import { Request, Response } from "express";
import { Notification, ActivityLog, User } from "../models/index.js";
import { Op } from "sequelize";

/**
 * Notification Controller
 * Root Admin Only - Broadcast notifications
 */

/**
 * Get all notifications
 */
export const getAllNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
        const { targetRole, limit = 50 } = req.query;

        const where: any = {};
        if (targetRole && targetRole !== 'all') {
            where.TargetRole = targetRole;
        }

        const notifications = await Notification.findAll({
            where,
            order: [['SentAt', 'DESC']],
            limit: parseInt(limit as string)
        });

        res.status(200).json({
            success: true,
            data: notifications
        });
    } catch (error: any) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch notifications",
            error: error.message
        });
    }
};

/**
 * Create and broadcast notification
 */
export const createNotification = async (req: Request, res: Response): Promise<void> => {
    try {
        const { Title, Message, TargetRole, ScheduledFor } = req.body;
        const currentUser = (req as any).user;

        // Validation
        if (!Title || !Message || !TargetRole) {
            res.status(400).json({
                success: false,
                message: "Title, Message, and TargetRole are required"
            });
            return;
        }

        if (!['student', 'invigilator', 'all'].includes(TargetRole)) {
            res.status(400).json({
                success: false,
                message: "Invalid TargetRole. Must be 'student', 'invigilator', or 'all'"
            });
            return;
        }

        const notification = await Notification.create({
            Title,
            Message,
            TargetRole,
            SentBy: currentUser.UserID,
            SentAt: ScheduledFor || new Date(),
            ScheduledFor: ScheduledFor || null,
            IsRead: false
        });

        // Log activity
        await ActivityLog.create({
            UserID: currentUser.UserID,
            Action: 'SEND_NOTIFICATION',
            EntityType: 'Notification',
            EntityID: notification.NotificationID,
            Details: `Sent notification to ${TargetRole}: ${Title}`,
            IPAddress: req.ip || 'unknown',
            UserAgent: req.get('user-agent') || 'unknown'
        });

        res.status(201).json({
            success: true,
            message: "Notification created successfully",
            data: notification
        });
    } catch (error: any) {
        console.error("Error creating notification:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create notification",
            error: error.message
        });
    }
};

/**
 * Delete notification
 */
export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
    try {
        const { notificationId } = req.params;
        const currentUser = (req as any).user;

        const notification = await Notification.findByPk(parseInt(notificationId as string));
        if (!notification) {
            res.status(404).json({
                success: false,
                message: "Notification not found"
            });
            return;
        }

        await notification.destroy();

        // Log activity
        await ActivityLog.create({
            UserID: currentUser.UserID,
            Action: 'DELETE_NOTIFICATION',
            EntityType: 'Notification',
            EntityID: parseInt(notificationId as string),
            Details: `Deleted notification: ${notification.Title}`,
            IPAddress: req.ip || 'unknown',
            UserAgent: req.get('user-agent') || 'unknown'
        });

        res.status(200).json({
            success: true,
            message: "Notification deleted successfully"
        });
    } catch (error: any) {
        console.error("Error deleting notification:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete notification",
            error: error.message
        });
    }
};

/**
 * Get scheduled notifications
 */
export const getScheduledNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
        const notifications = await Notification.findAll({
            where: {
                ScheduledFor: {
                    [Op.ne]: null,
                    [Op.gt]: new Date()
                }
            },
            order: [['ScheduledFor', 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: notifications
        });
    } catch (error: any) {
        console.error("Error fetching scheduled notifications:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch scheduled notifications",
            error: error.message
        });
    }
};
