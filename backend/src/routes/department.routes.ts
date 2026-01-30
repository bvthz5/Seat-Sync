import express from "express";
import {
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
} from "../controllers/department.controller.js";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";

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
