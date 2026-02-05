import express from "express";
import {
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    getDepartmentById,
    importDepartments,
    exportDepartmentTemplate,
} from "../controllers/department.controller.js";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";
import multer from "multer";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Departments
 *   description: Department management
 */

/**
 * @swagger
 * /api/departments:
 *   get:
 *     summary: Get all departments
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all departments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   DepartmentID:
 *                     type: integer
 *                   DepartmentCode:
 *                     type: string
 *                   DepartmentName:
 *                     type: string
 */
router.get("/", AuthMiddleware.verifyAccessToken, getDepartments);

/**
 * @swagger
 * /api/departments/{id}:
 *   get:
 *     summary: Get a department by ID with details
 *     tags: [Departments]
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
 *         description: Department details
 *       404:
 *         description: Department not found
 */
router.get("/:id", AuthMiddleware.verifyAccessToken, getDepartmentById);

/**
 * @swagger
 * /api/departments:
 *   post:
 *     summary: Create a new department
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - DepartmentCode
 *               - DepartmentName
 *             properties:
 *               DepartmentCode:
 *                 type: string
 *               DepartmentName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Department created successfully
 */
router.post("/", AuthMiddleware.requireRootAuth, createDepartment);

/**
 * @swagger
 * /api/departments/{id}:
 *   put:
 *     summary: Update a department
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Department ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               DepartmentCode:
 *                 type: string
 *               DepartmentName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Department updated successfully
 *       404:
 *         description: Department not found
 */
router.put("/:id", AuthMiddleware.requireRootAuth, updateDepartment);

const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * /api/departments/import:
 *   post:
 *     summary: Import departments from Excel file
 *     tags: [Departments]
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
router.post("/import", AuthMiddleware.requireRootAuth, upload.single('file'), importDepartments);

/**
 * @swagger
 * /api/departments/template:
 *   get:
 *     summary: Download department import template
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Excel template file
 */
router.get("/template", AuthMiddleware.verifyAccessToken, exportDepartmentTemplate);

/**
 * @swagger
 * /api/departments/{id}:
 *   delete:
 *     summary: Delete a department
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Department ID
 *     responses:
 *       200:
 *         description: Department deleted successfully
 *       404:
 *         description: Department not found
 */
router.delete("/:id", AuthMiddleware.requireRootAuth, deleteDepartment);

export default router;
