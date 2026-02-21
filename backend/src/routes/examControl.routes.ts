import { Router } from "express";
import {
    getExamStatusOverview,
    overrideExamStatus,
    toggleExamVisibility,
    triggerEmergencyAllocation,
    disableRoomEmergency,
    lockAttendance,
    getExamActivityLogs,
    broadcastNotification,
    getExamDetails
} from "../controllers/examControl.controller.js";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

// All routes require root admin authentication
router.use(AuthMiddleware.requireRootAuth);

/**
 * @swagger
 * /api/exam-control/overview:
 *   get:
 *     summary: Get exam status overview
 *     tags: [Exam Control]
 */
router.get("/overview", getExamStatusOverview);

/**
 * @swagger
 * /api/exam-control/logs:
 *   get:
 *     summary: Get all activity logs
 *     tags: [Exam Control]
 */
router.get("/logs", getExamActivityLogs);

/**
 * @swagger
 * /api/exam-control/{examId}/logs:
 *   get:
 *     summary: Get activity logs for specific exam
 *     tags: [Exam Control]
 */
router.get("/:examId/logs", getExamActivityLogs);

/**
 * @swagger
 * /api/exam-control/{examId}/status:
 *   patch:
 *     summary: Override exam status
 *     tags: [Exam Control]
 */
router.patch("/:examId/status", overrideExamStatus);

/**
 * @swagger
 * /api/exam-control/{examId}/visibility:
 *   patch:
 *     summary: Toggle exam visibility (Publish/Unpublish)
 *     tags: [Exam Control]
 */
router.patch("/:examId/visibility", toggleExamVisibility);

/**
 * @swagger
 * /api/exam-control/{examId}/emergency/allocate:
 *   post:
 *     summary: Emergency Seating Regeneration
 *     tags: [Exam Control]
 */
router.post("/:examId/emergency/allocate", triggerEmergencyAllocation);

/**
 * @swagger
 * /api/exam-control/emergency/disable-room:
 *   post:
 *     summary: Emergency Room Disable (Global)
 *     tags: [Exam Control]
 */
router.post("/emergency/disable-room", disableRoomEmergency);

/**
 * @swagger
 * /api/exam-control/{examId}/lock-attendance:
 *   patch:
 *     summary: Force Lock Attendance
 *     tags: [Exam Control]
 */
router.patch("/:examId/lock-attendance", lockAttendance);

/**
 * @swagger
 * /api/exam-control/{examId}/broadcast:
 *   post:
 *     summary: Broadcast Notification
 *     tags: [Exam Control]
 */
router.post("/:examId/broadcast", broadcastNotification);


/**
 * @swagger
 * /api/exam-control/{examId}/details:
 *   get:
 *     summary: Get Detailed Exam Context
 *     tags: [Exam Control]
 */
router.get("/:examId/details", getExamDetails);

export default router;
