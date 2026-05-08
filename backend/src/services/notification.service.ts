
import { Notification } from "../models/Notification.js";
import { NotificationRecipient } from "../models/NotificationRecipient.js";
import { User } from "../models/User.js";
import { getIO } from "../config/socket.js";
import { Op } from "sequelize";
import { sequelize } from "../config/database.js";

class NotificationService {
    /**
     * Create a notification and broadcast it via Socket.IO
     */
    async createNotification(data: any, senderId: number) {
        const {
            Title,
            Message,
            Type = "INFO",
            Category = "SYSTEM",
            TargetType = "ALL",
            TargetId,
            Priority = "NORMAL",
            Metadata,
            ExpiresAt,
            Channels = ["in_app"] // Array of strings e.g. ["in_app", "email"]
        } = data;

        // 1. Save to DB - Use GETDATE() literal for SQL Server compatibility
        const notification = await Notification.create({
            Title,
            Message,
            Type,
            Category,
            TargetType,
            TargetId,
            Priority,
            Metadata,
            SentBy: senderId,
            ExpiresAt,
            SentAt: sequelize.literal('GETDATE()') as any
        });

        // 2. Identify Recipients
        let recipientIds: number[] = [];

        if (TargetType === "ALL") {
            const users = await User.findAll({ attributes: ["UserID"] });
            recipientIds = users.map(u => u.UserID);
        } else if (TargetType === "ROLE") {
            const users = await User.findAll({ where: { Role: TargetId }, attributes: ["UserID"] });
            recipientIds = users.map(u => u.UserID);
        } else if (TargetType === "USER") {
            if (Array.isArray(TargetId)) {
                recipientIds = TargetId.map(id => Number(id));
            } else {
                recipientIds = [Number(TargetId)];
            }
        }
        // TODO: Handle EXAM and DEPARTMENT target types if needed by querying respective tables

        // 3. Create Recipient Records (Bulk)
        if (recipientIds.length > 0) {
            const recipientData = recipientIds.map(uid => ({
                NotificationID: notification.NotificationID,
                UserID: uid,
                IsRead: false
            }));
            await NotificationRecipient.bulkCreate(recipientData);
        }

        // 4. Broadcast via Socket.IO
        try {
            const io = getIO();
            const payload = {
                id: notification.NotificationID,
                title: notification.Title,
                message: notification.Message,
                type: notification.Type,
                priority: notification.Priority,
                category: notification.Category,
                createdAt: notification.SentAt,
                metadata: notification.Metadata
            };

            if (TargetType === "ALL") {
                io.emit("notification", payload);
            } else if (TargetType === "ROLE") {
                // Assuming users join rooms named after their role e.g. "role_student"
                // io.to(`role_${TargetId}`).emit("notification", payload);
                // For now, simpler to loop if rooms aren't set up, or just emit to all if volume is low.
                // Better: Emit to individual user rooms.
                recipientIds.forEach(uid => {
                    io.to(`user_${uid}`).emit("notification", payload);
                });
            } else {
                recipientIds.forEach(uid => {
                    io.to(`user_${uid}`).emit("notification", payload);
                });
            }

            // Emergency Override
            if (Type === "EMERGENCY" || Priority === "CRITICAL") {
                io.emit("emergency_alert", payload);
            }

        } catch (err) {
            console.error("Socket broadcast failed:", err);
        }

        return notification;
    }

    /**
     * Get notifications for a specific user
     */
    async getUserNotifications(userId: number, query: any = {}) {
        const { page = 1, limit = 20, unreadOnly = false } = query;
        const offset = (page - 1) * limit;

        const whereClause: any = { UserID: userId };
        if (unreadOnly === 'true' || unreadOnly === true) {
            whereClause.IsRead = false;
        }

        try {
            // Simplified query: get recipients first, then notifications separately
            const { count, rows } = await NotificationRecipient.findAndCountAll({
                where: whereClause,
                attributes: ['RecipientID', 'NotificationID', 'UserID', 'IsRead', 'ReadAt'],
                order: [
                    ['IsRead', 'ASC'],
                    ['RecipientID', 'DESC']
                ],
                limit: Number(limit),
                offset: Number(offset),
                raw: true
            });

            if (rows.length === 0) {
                return {
                    total: count,
                    page: Number(page),
                    totalPages: Math.ceil(count / limit),
                    data: []
                };
            }

            // Get notification IDs
            const notifIds = rows.map((r: any) => r.NotificationID);

            // Fetch notifications separately to avoid join issues
            const notifications = await Notification.findAll({
                where: { NotificationID: notifIds },
                attributes: ['NotificationID', 'Title', 'Message', 'Type', 'Category', 'Priority', 'SentAt', 'Metadata'],
                raw: true
            });

            // Create a map for quick lookup
            const notifMap: any = {};
            notifications.forEach((n: any) => {
                notifMap[n.NotificationID] = n;
            });

            // Combine data
            const data = rows.map((r: any) => {
                const n = notifMap[r.NotificationID];
                if (!n) return null;
                return {
                    id: n.NotificationID,
                    recipientId: r.RecipientID,
                    title: n.Title,
                    message: n.Message,
                    type: n.Type,
                    category: n.Category,
                    priority: n.Priority,
                    sentAt: n.SentAt,
                    isRead: r.IsRead,
                    readAt: r.ReadAt,
                    metadata: n.Metadata
                };
            }).filter(Boolean);

            return {
                total: count,
                page: Number(page),
                totalPages: Math.ceil(count / limit),
                data
            };
        } catch (e: any) {
            console.error(`Error loading notifications for user ${userId}:`, e.message || e);
            return { total: 0, page: Number(page), totalPages: 0, data: [] };
        }
    }

    /**
     * Mark a notification as read
     */
    async markAsRead(userId: number, notificationId: number) {
        // Use direct update to avoid date conversion issues with .save()
        const result = await NotificationRecipient.update(
            { 
                IsRead: true, 
                ReadAt: sequelize.literal('GETDATE()') 
            },
            { 
                where: { UserID: userId, NotificationID: notificationId } 
            }
        );
        return result[0] > 0;
    }

    /**
     * Mark all as read for a user
     */
    async markAllAsRead(userId: number) {
        await NotificationRecipient.update(
            { 
                IsRead: true, 
                ReadAt: sequelize.literal('GETDATE()') 
            },
            { 
                where: { UserID: userId, IsRead: false } 
            }
        );
        return true;
    }

    /**
     * Get statistics for a user
     */
    async getUserStats(userId: number) {
        try {
            const unreadCount = await NotificationRecipient.count({
                where: { UserID: userId, IsRead: false }
            });

            // Count critical alerts (unread)
            const criticalCount = await NotificationRecipient.count({
                where: { UserID: userId, IsRead: false },
                include: [{
                    model: Notification,
                    as: 'Notification',
                    where: { Priority: 'CRITICAL' }
                }]
            });

            return {
                unread: unreadCount,
                critical: criticalCount
            };
        } catch (e) {
            console.warn(`Could not load notification stats for user ${userId}:`, e);
            return { unread: 0, critical: 0 };
        }
    }

    /**
     * Delete a notification (Admin only)
     */
    async deleteNotification(id: number) {
        return await Notification.destroy({ where: { NotificationID: id } });
    }

    /**
     * Get all notifications (Admin view)
     */
    async getAllNotificationsAdmin(query: any = {}) {
        const { page = 1, limit = 50, type, category } = query;
        const offset = (page - 1) * limit;
        const where: any = {};

        if (type) where.Type = type;
        if (category) where.Category = category;

        const { count, rows } = await Notification.findAndCountAll({
            where,
            order: [['SentAt', 'DESC']],
            limit: Number(limit),
            offset: Number(offset)
        });

        return {
            total: count,
            data: rows
        };
    }
}

export const notificationService = new NotificationService();
