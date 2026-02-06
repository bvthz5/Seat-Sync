import express from "express";
import {
    importUnifiedAcademic,
    exportUnifiedTemplate,
} from "../controllers/unified_academic.controller.js";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";
import multer from "multer";

const router = express.Router();

/**
 * Configure multer for file uploads
 */
const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * @swagger
 * tags:
 *   name: Unified Academic
 *   description: Unified academic data management (Departments, Programs, Subjects)
 */

/**
 * @swagger
 * /api/academic/import-unified:
 *   post:
 *     summary: Import departments, programs, and subjects from a single Excel file
 *     tags: [Unified Academic]
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
 *     responses:
 *       200:
 *         description: Academic data imported successfully
 */
router.post(
    "/import-unified",
    AuthMiddleware.requireRootAuth,
    upload.single("file"),
    importUnifiedAcademic
);

/**
 * @swagger
 * /api/academic/template-unified:
 *   get:
 *     summary: Download unified academic data template
 *     tags: [Unified Academic]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Template file downloaded successfully
 */
router.get(
    "/template-unified",
    AuthMiddleware.verifyAccessToken,
    exportUnifiedTemplate
);

export default router;
