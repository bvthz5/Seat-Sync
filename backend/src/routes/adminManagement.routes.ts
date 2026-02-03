import { Router } from "express";
import {
    getAllAdmins,
    getDashboardStats,
    createAdmin,
    toggleAdminStatus,
    resetAdminPassword,
    getAdminActivity,
    deleteAdmin
} from "../controllers/adminManagement.controller.js";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

// All routes require root admin authentication
router.use(AuthMiddleware.requireRootAuth);

/**
 * @swagger
 * /api/admin-management/stats:
 *   get:
 *     summary: Get dashboard stats
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalAdmins:
 *                       type: integer
 *                     activeAdmins:
 *                       type: integer
 *                     rootAdmins:
 *                       type: integer
 */
router.get("/stats", getDashboardStats);

/**
 * @swagger
 * /api/admin-management:
 *   get:
 *     summary: Get all exam admins
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *     responses:
 *       200:
 *         description: List of admins
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     admins:
 *                       type: array
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get("/", getAllAdmins);

/**
 * @swagger
 * /api/admin-management:
 *   post:
 *     summary: Create new exam admin
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - fullName
 *             properties:
 *               email:
 *                 type: string
 *               fullName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Admin created successfully
 */
router.post("/", createAdmin);

/**
 * @swagger
 * /api/admin-management/{adminId}/toggle-status:
 *   patch:
 *     summary: Enable/Disable admin account
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: adminId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
router.patch("/:adminId/toggle-status", toggleAdminStatus);

/**
 * @swagger
 * /api/admin-management/{adminId}/reset-password:
 *   patch:
 *     summary: Reset admin password
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: adminId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Password reset successfully
 */
router.patch("/:adminId/reset-password", resetAdminPassword);

/**
 * @swagger
 * /api/admin-management/{adminId}/activity:
 *   get:
 *     summary: Get admin activity logs
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: adminId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Activity logs retrieved
 */
router.get("/:adminId/activity", getAdminActivity);

/**
 * @swagger
 * /api/admin-management/{adminId}:
 *   delete:
 *     summary: Delete admin (soft delete)
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: adminId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Admin deleted successfully
 */
router.delete("/:adminId", deleteAdmin);

export default router;
