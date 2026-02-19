
import { Request, Response } from "express";
import { notificationService } from "../services/notification.service.js";

// --- Admin / Creation ---

export const createNotification = async (req: Request, res: Response) => {
    try {
        const senderId = (req as any).user?.UserID || 0;
        const notification = await notificationService.createNotification(req.body, senderId);
        res.status(201).json({
            success: true,
            data: notification
        });
    } catch (error: any) {
        console.error("Create notification error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteNotification = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await notificationService.deleteNotification(Number(id));
        res.json({ success: true, message: "Notification deleted" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getAllNotificationsAdmin = async (req: Request, res: Response) => {
    try {
        const result = await notificationService.getAllNotificationsAdmin(req.query);
        res.json({ success: true, ...result });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- User / Consumption ---

export const getMyNotifications = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.UserID;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

        const result = await notificationService.getUserNotifications(userId, req.query);
        res.json({ success: true, ...result });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.UserID;
        const { id } = req.params; // Notification ID (which is mapped to NotificationID in recipient table)
        // Wait, the UI sends NotificationID, but we need to find the Recipient entry.
        // The service handles this logic.
        await notificationService.markAsRead(userId, Number(id));
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const markAllAsRead = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.UserID;
        await notificationService.markAllAsRead(userId);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getUserStats = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.UserID;
        if (!userId) return res.status(200).json({ unread: 0, critical: 0 }); // Fallback

        const stats = await notificationService.getUserStats(userId);
        res.json({ success: true, data: stats });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
