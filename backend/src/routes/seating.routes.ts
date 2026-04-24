import express from "express";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";
import {
    getSeries,
    getExamDates,
    getExamDepartments,
    getHalls,
    getHallLayout,
    getDepartments,
    autoAssign,
    getAllocationForHall,
    saveAllocation,
    clearAllocation,
    clearAllAllocations,
    getStudentsByDept,
    getAllocationSummary,
    bulkAssign,
    shuffleGlobal,
    quickAddExamSlot,
    importSeatingFromExcel,
    searchStudent,
    exportSeatingToExcel,
    getGlobalAllocations
} from "../controllers/seating.controller.js";

const router = express.Router();

// All routes require authentication
// router.use(AuthMiddleware.requireAuth);

// Exam series list (for optional filter)
router.get("/series", getSeries);

// Distinct exam dates (with optional ?seriesId= filter)
router.get("/exam-dates", getExamDates);

// Get departments with exams on a specific date+session
router.get("/exam-departments", getExamDepartments);

// Get all active halls
router.get("/halls", getHalls);

// Get seat layout grid for a specific hall
router.get("/halls/:hallId/layout", getHallLayout);

// Get all departments with student counts
router.get("/departments", getDepartments);

// Get students by department
router.get("/students/:deptId", getStudentsByDept);

// Per-hall allocation summary for a date+session
router.get("/allocation-summary/:examDate/:session", getAllocationSummary);

// Auto-assign students to a single hall
router.post("/auto-assign", autoAssign);

// Bulk-assign students across multiple halls
router.post("/bulk-assign", bulkAssign);

// Globally shuffle assigned students
router.post("/shuffle-global", shuffleGlobal);

// Quick add exam slot
router.post("/quick-add-slot", quickAddExamSlot);

// Import seating from Excel
router.post("/import-excel", importSeatingFromExcel);

// Search student by reg number or name within a slot
router.get("/search-student", searchStudent);

// Export seating to Excel
router.get("/export", exportSeatingToExcel);


// Save seating allocation
router.post("/save", saveAllocation);

// Get existing allocation for date + session + hall
router.get("/allocation/:examDate/:session/:hallId", getAllocationForHall);

// Clear allocation for date + session + hall
router.delete("/allocation/:examDate/:session/:hallId", clearAllocation);

// Get global allocations
router.get("/global-allocations/:examDate/:session", getGlobalAllocations);

// Clear ALL allocations for an entire date + session
router.delete("/allocation/:examDate/:session", clearAllAllocations);

export default router;
