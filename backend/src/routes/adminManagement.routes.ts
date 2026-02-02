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
 * @route   GET /api/admin-management/stats
 * @desc    Get dashboard stats
 * @access  Root Admin Only
 */
router.get("/stats", getDashboardStats);

/**
 * @route   GET /api/admin-management
 * @desc    Get all exam admins
 * @access  Root Admin Only
 */
router.get("/", getAllAdmins);

/**
 * @route   POST /api/admin-management
 * @desc    Create new exam admin
 * @access  Root Admin Only
 */
router.post("/", createAdmin);

/**
 * @route   PATCH /api/admin-management/:adminId/toggle-status
 * @desc    Enable/Disable admin account
 * @access  Root Admin Only
 */
router.patch("/:adminId/toggle-status", toggleAdminStatus);

/**
 * @route   PATCH /api/admin-management/:adminId/reset-password
 * @desc    Reset admin password
 * @access  Root Admin Only
 */
router.patch("/:adminId/reset-password", resetAdminPassword);

/**
 * @route   GET /api/admin-management/:adminId/activity
 * @desc    Get admin activity logs
 * @access  Root Admin Only
 */
router.get("/:adminId/activity", getAdminActivity);

/**
 * @route   DELETE /api/admin-management/:adminId
 * @desc    Delete admin (soft delete)
 * @access  Root Admin Only
 */
router.delete("/:adminId", deleteAdmin);

export default router;
