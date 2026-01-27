import { Router } from "express";
import multer from "multer";
import { importStructureMetrics } from "../controllers/structureImport.controller.js";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Only Root Admin can import structure
/**
 * @swagger
 * /api/college-structure/import/csv:
 *   post:
 *     summary: Import College Structure (Blocks, Floors, Rooms) from CSV
 *     tags: [Structure]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file with columns BlockName, FloorNumber, RoomCode, Capacity, IsExamUsable
 *     responses:
 *       200:
 *         description: Structure imported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 blocksCreated:
 *                   type: integer
 *                 floorsCreated:
 *                   type: integer
 *                 roomsCreated:
 *                   type: integer
 *       400:
 *         description: Bad request (Invalid CSV or validation failed)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Root Admin only)
 *       500:
 *         description: Internal server error
 */
router.post(
    "/csv",
    AuthMiddleware.verifyAccessToken,
    AuthMiddleware.requireRootAdmin,
    upload.single("file"),
    importStructureMetrics
);

export default router;
