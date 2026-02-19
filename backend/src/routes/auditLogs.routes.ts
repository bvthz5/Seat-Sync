import { Router } from "express";
import { getAuditLogs, getAuditStats } from "../controllers/auditLogs.controller.js";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

// Root Admin Authentication
router.use(AuthMiddleware.requireRootAuth);

/**
 * @swagger
 * /api/audit/logs:
 *   get:
 *     summary: Search Audit Logs
 *     tags: [Audit & Logs]
 */
router.get("/logs", getAuditLogs);

/**
 * @swagger
 * /api/audit/stats:
 *   get:
 *     summary: Get Audit Dashboard Stats
 *     tags: [Audit & Logs]
 */
router.get("/stats", getAuditStats);

export default router;
