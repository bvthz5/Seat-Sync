import express from "express";
import { StudentAuthController } from "../controllers/student.auth.controller.js";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";
import { getDepartments } from "../controllers/department.controller.js";
import { getPrograms } from "../controllers/program.controller.js";

const router = express.Router();

/**
 * Student Login
 */
router.post("/login", StudentAuthController.login);

/**
 * Student Registration
 */
router.post("/register", StudentAuthController.register);

/**
 * Change Password (Protected)
 */
router.post("/change-password", AuthMiddleware.verifyAccessToken, StudentAuthController.changePassword);

/**
 * Forgot Password
 */
router.post("/forgot-password", StudentAuthController.forgotPassword);

/**
 * Reset Password
 */
router.post("/reset-password", StudentAuthController.resetPassword);

/**
 * Public: Get registration metadata (departments + programs)
 */
router.get("/meta", async (req, res) => {
    try {
        const { default: Department } = await import("../models/Department.js");
        const { Program, ProgramDepartment } = await import("../models/index.js");
        const departments = await Department.findAll({ order: [['DepartmentName', 'ASC']] });
        const programs = await Program.findAll({
            include: [{
                model: Department,
                as: 'Departments',
                through: { attributes: [] },
                attributes: ['DepartmentID', 'DepartmentCode', 'DepartmentName']
            }],
            order: [['ProgramName', 'ASC']]
        });
        res.json({ departments, programs });
    } catch (error: any) {
        console.error("Error fetching registration meta:", error);
        res.status(500).json({ error: "Failed to load registration data" });
    }
});

export default router;
