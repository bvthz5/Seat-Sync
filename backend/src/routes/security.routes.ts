import { Router } from "express";
import {
    getAllActiveSessions,
    forceLogoutSession,
    forceLogoutUser,
    invalidateAllTokens,
    getSessionStats,
    getDashboardStats
} from "../controllers/security.controller.js";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

// All routes require root admin authentication
router.use(AuthMiddleware.requireRootAuth);

/**
 * @swagger
 * /api/security/sessions:
 *   get:
 *     summary: Get all active sessions
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active sessions
 */
router.get("/sessions", getAllActiveSessions);

/**
 * @swagger
 * /api/security/dashboard-stats:
 *   get:
 *     summary: Get comprehensive security dashboard stats
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard metrics and graph data
 */
router.get("/dashboard-stats", getDashboardStats);

/**
 * @swagger
 * /api/security/sessions/stats:
 *   get:
 *     summary: Get session statistics
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Session stats (active users, devices, etc.)
 */
router.get("/sessions/stats", getSessionStats);

/**
 * @swagger
 * /api/security/sessions/{sessionId}:
 *   delete:
 *     summary: Force logout specific session
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Session terminated
 */
router.delete("/sessions/:sessionId", forceLogoutSession);

/**
 * @swagger
 * /api/security/users/{userId}/sessions:
 *   delete:
 *     summary: Force logout all sessions for a user
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User logged out from all devices
 */
router.delete("/users/:userId/sessions", forceLogoutUser);

/**
 * @swagger
 * /api/security/invalidate-all:
 *   post:
 *     summary: Invalidate all tokens (Emergency)
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All tokens invalidated
 */
router.post("/invalidate-all", invalidateAllTokens);

export default router;
