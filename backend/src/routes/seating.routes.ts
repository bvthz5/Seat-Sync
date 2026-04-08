import express from "express";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";
import {
    getExams,
    getHalls,
    getHallLayout,
    getDepartments,
    autoAssign,
    getAllocationForHall,
    saveAllocation,
    clearAllocation,
    getStudentsByDept,
} from "../controllers/seating.controller.js";

const router = express.Router();

// All routes require authentication
router.use(AuthMiddleware.requireAuth);

// Get exams list for dropdown
router.get("/exams", getExams);

// Get all active halls
router.get("/halls", getHalls);

// Get seat layout grid for a specific hall
router.get("/halls/:hallId/layout", getHallLayout);

// Get all departments with student counts
router.get("/departments", getDepartments);

// Get students by department (for manual dropdowns)
router.get("/students/:deptId", getStudentsByDept);

// Auto-assign students to a hall based on left/right departments
router.post("/auto-assign", autoAssign);

// Save seating allocation for an exam + hall
router.post("/save", saveAllocation);

// Get existing allocation for an exam + hall
router.get("/:examId/:hallId", getAllocationForHall);

// Clear allocation for an exam + hall
router.delete("/:examId/:hallId", clearAllocation);

export default router;
