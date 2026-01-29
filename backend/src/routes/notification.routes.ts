import { Router } from "express";
import {
    getAllNotifications,
    createNotification,
    deleteNotification,
    getScheduledNotifications
} from "../controllers/notification.controller.js";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

// All routes require root admin authentication
router.use(AuthMiddleware.requireRootAuth);

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications
 * @access  Root Admin Only
 */
router.get("/", getAllNotifications);

/**
 * @route   POST /api/notifications
 * @desc    Create and broadcast notification
 * @access  Root Admin Only
 */
router.post("/", createNotification);

/**
 * @route   GET /api/notifications/scheduled
 * @desc    Get scheduled notifications
 * @access  Root Admin Only
 */
router.get("/scheduled", getScheduledNotifications);

/**
 * @route   DELETE /api/notifications/:notificationId
 * @desc    Delete notification
 * @access  Root Admin Only
 */
router.delete("/:notificationId", deleteNotification);

export default router;
