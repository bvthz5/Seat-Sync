import { Router } from "express";
import {
    getAllAcademicYears,
    createAcademicYear,
    setCurrentAcademicYear,
    getAllDepartments,
    createDepartment,
    getAllPrograms,
    createProgram,
    getAllSemesters,
    createSemester,
    getAllSubjects,
    createSubject
} from "../controllers/academicSetup.controller.js";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

// All routes require root admin authentication
router.use(AuthMiddleware.requireRootAuth);

// ==================== ACADEMIC YEARS ====================

/**
 * @route   GET /api/academic-setup/years
 * @desc    Get all academic years
 * @access  Root Admin Only
 */
router.get("/years", getAllAcademicYears);

/**
 * @route   POST /api/academic-setup/years
 * @desc    Create new academic year
 * @access  Root Admin Only
 */
router.post("/years", createAcademicYear);

/**
 * @route   PATCH /api/academic-setup/years/:yearId/set-current
 * @desc    Set current academic year
 * @access  Root Admin Only
 */
router.patch("/years/:yearId/set-current", setCurrentAcademicYear);

// ==================== DEPARTMENTS ====================

/**
 * @route   GET /api/academic-setup/departments
 * @desc    Get all departments
 * @access  Root Admin Only
 */
router.get("/departments", getAllDepartments);

/**
 * @route   POST /api/academic-setup/departments
 * @desc    Create new department
 * @access  Root Admin Only
 */
router.post("/departments", createDepartment);

// ==================== PROGRAMS ====================

/**
 * @route   GET /api/academic-setup/programs
 * @desc    Get all programs
 * @access  Root Admin Only
 */
router.get("/programs", getAllPrograms);

/**
 * @route   POST /api/academic-setup/programs
 * @desc    Create new program
 * @access  Root Admin Only
 */
router.post("/programs", createProgram);

// ==================== SEMESTERS ====================

/**
 * @route   GET /api/academic-setup/semesters
 * @desc    Get all semesters
 * @access  Root Admin Only
 */
router.get("/semesters", getAllSemesters);

/**
 * @route   POST /api/academic-setup/semesters
 * @desc    Create new semester
 * @access  Root Admin Only
 */
router.post("/semesters", createSemester);

// ==================== SUBJECTS ====================

/**
 * @route   GET /api/academic-setup/subjects
 * @desc    Get all subjects
 * @access  Root Admin Only
 */
router.get("/subjects", getAllSubjects);

/**
 * @route   POST /api/academic-setup/subjects
 * @desc    Create new subject
 * @access  Root Admin Only
 */
router.post("/subjects", createSubject);

export default router;
