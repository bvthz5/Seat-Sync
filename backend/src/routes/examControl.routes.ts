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
 * @route   GET /api/exam-control/overview
 * @desc    Get exam status overview
 * @access  Root Admin Only
 */
router.get("/overview", getExamStatusOverview);

/**
 * @route   PATCH /api/exam-control/:examId/override-status
 * @desc    Override exam status (Emergency)
 * @access  Root Admin Only
 */
router.patch("/:examId/override-status", overrideExamStatus);

/**
 * @route   PATCH /api/exam-control/:examId/pause
 * @desc    Pause active exam (Emergency)
 * @access  Root Admin Only
 */
router.patch("/:examId/pause", pauseExam);

/**
 * @route   PATCH /api/exam-control/:examId/resume
 * @desc    Resume paused exam
 * @access  Root Admin Only
 */
router.patch("/:examId/resume", resumeExam);

/**
 * @route   PATCH /api/exam-control/:examId/cancel
 * @desc    Cancel exam (Emergency)
 * @access  Root Admin Only
 */
router.patch("/:examId/cancel", cancelExam);

export default router;
