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
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get all notifications (history)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 */
router.get("/", getAllNotifications);

/**
 * @swagger
 * /api/notifications:
 *   post:
 *     summary: Create and broadcast notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - Title
 *               - Message
 *               - TargetRole
 *             properties:
 *               Title:
 *                 type: string
 *               Message:
 *                 type: string
 *               TargetRole:
 *                 type: string
 *                 enum: [student, invigilator, all]
 *               ScheduledFor:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Notification created and sent
 */
router.post("/", createNotification);

/**
 * @swagger
 * /api/notifications/scheduled:
 *   get:
 *     summary: Get scheduled notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of scheduled notifications
 */
router.get("/scheduled", getScheduledNotifications);

/**
 * @swagger
 * /api/notifications/{notificationId}:
 *   delete:
 *     summary: Delete notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Notification deleted
 */
router.delete("/:notificationId", deleteNotification);

export default router;
