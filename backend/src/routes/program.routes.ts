import express from "express";
import {
    getPrograms,
    createProgram,
    updateProgram,
    deleteProgram,
    importPrograms,
    exportProgramTemplate,
} from "../controllers/program.controller.js";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";
import multer from "multer";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * tags:
 *   name: Programs
 *   description: Program management
 */

/**
 * @swagger
 * /api/programs:
 *   get:
 *     summary: Get all programs
 *     tags: [Programs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all programs
 */
router.get("/", AuthMiddleware.verifyAccessToken, getPrograms);

/**
 * @swagger
 * /api/programs:
 *   post:
 *     summary: Create a new program
 *     tags: [Programs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ProgramCode
 *               - ProgramName
 *               - DepartmentID
 *             properties:
 *               ProgramCode:
 *                 type: string
 *               ProgramName:
 *                 type: string
 *               DepartmentID:
 *                 type: integer
 *               DurationYears:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Program created successfully
 */
router.post("/", AuthMiddleware.requireRootAuth, createProgram);

/**
 * @swagger
 * /api/programs/import:
 *   post:
 *     summary: Import programs from Excel file
 *     tags: [Programs]
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
 *         description: Import completed
 */
router.post("/import", AuthMiddleware.requireRootAuth, upload.single('file'), importPrograms);

/**
 * @swagger
 * /api/programs/template:
 *   get:
 *     summary: Download program import template
 *     tags: [Programs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Excel template file
 */
router.get("/template", AuthMiddleware.verifyAccessToken, exportProgramTemplate);

/**
 * @swagger
 * /api/programs/{id}:
 *   put:
 *     summary: Update a program
 *     tags: [Programs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               ProgramCode:
 *                 type: string
 *               ProgramName:
 *                 type: string
 *               DepartmentID:
 *                 type: integer
 *               DurationYears:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Program updated successfully
 */
router.put("/:id", AuthMiddleware.requireRootAuth, updateProgram);

/**
 * @swagger
 * /api/programs/{id}:
 *   delete:
 *     summary: Delete a program
 *     tags: [Programs]
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
 *         description: Program deleted successfully
 */
router.delete("/:id", AuthMiddleware.requireRootAuth, deleteProgram);

export default router;
