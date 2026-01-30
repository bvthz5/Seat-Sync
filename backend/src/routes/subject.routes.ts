
import express from "express";
import { getSubjects } from "../controllers/subject.controller.js";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Apply Auth if needed, usually Admin accesses this
router.use(AuthMiddleware.requireAuth);

/**
 * @swagger
 * /api/subjects:
 *   get:
 *     summary: Get all subjects
 *     tags: [Subjects]
 *     responses:
 *       200:
 *         description: List of subjects
 */
router.get("/", getSubjects);

export default router;
