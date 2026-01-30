import { Router } from "express";
import {
    getAllActiveSessions,
    forceLogoutSession,
    forceLogoutUser,
    invalidateAllTokens,
    getSessionStats
} from "../controllers/security.controller.js";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

// All routes require root admin authentication
router.use(AuthMiddleware.requireRootAuth);

/**
 * @route   GET /api/security/sessions
 * @desc    Get all active sessions
 * @access  Root Admin Only
 */
router.get("/sessions", getAllActiveSessions);

/**
 * @route   GET /api/security/sessions/stats
 * @desc    Get session statistics
 * @access  Root Admin Only
 */
router.get("/sessions/stats", getSessionStats);

/**
 * @route   DELETE /api/security/sessions/:sessionId
 * @desc    Force logout specific session
 * @access  Root Admin Only
 */
router.delete("/sessions/:sessionId", forceLogoutSession);

/**
 * @route   DELETE /api/security/users/:userId/sessions
 * @desc    Force logout all sessions for a user
 * @access  Root Admin Only
 */
router.delete("/users/:userId/sessions", forceLogoutUser);

/**
 * @route   POST /api/security/invalidate-all
 * @desc    Invalidate all tokens (Emergency)
 * @access  Root Admin Only
 */
router.post("/invalidate-all", invalidateAllTokens);

export default router;
