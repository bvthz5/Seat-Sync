import { Router } from "express";
import {
    getExamStatusOverview,
    overrideExamStatus,
    pauseExam,
    resumeExam,
    cancelExam
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
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overview of exam statuses
 */
router.get("/overview", getExamStatusOverview);

/**
 * @swagger
 * /api/exam-control/{examId}/override-status:
 *   patch:
 *     summary: Override exam status (Emergency)
 *     tags: [Exam Control]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status overridden
 */
router.patch("/:examId/override-status", overrideExamStatus);

/**
 * @swagger
 * /api/exam-control/{examId}/pause:
 *   patch:
 *     summary: Pause active exam (Emergency)
 *     tags: [Exam Control]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Exam paused
 */
router.patch("/:examId/pause", pauseExam);

/**
 * @swagger
 * /api/exam-control/{examId}/resume:
 *   patch:
 *     summary: Resume paused exam
 *     tags: [Exam Control]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Exam resumed
 */
router.patch("/:examId/resume", resumeExam);

/**
 * @swagger
 * /api/exam-control/{examId}/cancel:
 *   patch:
 *     summary: Cancel exam (Emergency)
 *     tags: [Exam Control]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Exam cancelled
 */
router.patch("/:examId/cancel", cancelExam);

export default router;
