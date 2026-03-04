import { Router } from "express";
import { getAllInvigilators, createInvigilator, deleteInvigilator, getInvigilatorStats, toggleInvigilatorFlag, toggleInvigilatorEligibility, bulkImportInvigilators, clearAllFaculties } from "../controllers/invigilator.controller.js";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

// Protect all routes - only accessible by Root Admin
router.use((req, res, next) => AuthMiddleware.requireRootAuth(req, res, next));

/**
 * @swagger
 * tags:
 *   name: Invigilator
 *   description: Invigilator management (Root Admin only)
 */

/**
 * @swagger
 * /api/invigilators:
 *   get:
 *     summary: Get all invigilators
 *     tags: [Invigilator]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of invigilators
 *       500:
 *         description: Server error
 */
router.get("/", getAllInvigilators);

/**
 * @swagger
 * /api/invigilators/stats:
 *   get:
 *     summary: Get invigilator statistics
 *     tags: [Invigilator]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Invigilator stats
 */
router.get("/stats", getInvigilatorStats);

/**
 * @swagger
 * /api/invigilators:
 *   post:
 *     summary: Create a new invigilator
 *     tags: [Invigilator]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - FullName
 *               - Email
 *               - Password
 *             properties:
 *               FullName:
 *                 type: string
 *               Email:
 *                 type: string
 *               Password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created successfully
 *       400:
 *         description: Missing fields
 *       409:
 *         description: Email already exists
 */
router.post("/", createInvigilator);
router.post("/bulk-import", bulkImportInvigilators);

/**
 * @swagger
 * /api/invigilators/{id}/toggle-flag:
 *   patch:
 *     summary: Toggle flagged status of an invigilator
 *     tags: [Invigilator]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Toggle successful
 *       404:
 *         description: Not found
 */
router.patch("/:id/toggle-flag", toggleInvigilatorFlag);

/**
 * @swagger
 * /api/invigilators/{id}/toggle-eligibility:
 *   patch:
 *     summary: Toggle eligibility status of an invigilator
 *     tags: [Invigilator]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Toggle successful
 *       404:
 *         description: Not found
 */
router.patch("/:id/toggle-eligibility", toggleInvigilatorEligibility);

/**
 * @swagger
 * /api/invigilators/{id}:
 *   delete:
 *     summary: Delete an invigilator
 *     tags: [Invigilator]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deleted successfully
 *       404:
 *         description: Not found
 */
router.delete("/clear-all", clearAllFaculties);
router.delete("/:id", deleteInvigilator);

export default router;
