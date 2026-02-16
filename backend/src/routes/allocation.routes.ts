import express from "express";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";
import { allocateSeats } from "../controllers/allocation.controller.js";

const router = express.Router();

/**
 * @swagger
 * /api/allocation/create:
 *   post:
 *     summary: Allocate seats for an exam
 *     tags: [Allocation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - examId
 *             properties:
 *               examId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Allocation successful
 *       400:
 *         description: Bad request (no exam or students)
 *       500:
 *         description: Internal error
 */
router.post("/create", AuthMiddleware.requireAuth, allocateSeats);

export default router;
