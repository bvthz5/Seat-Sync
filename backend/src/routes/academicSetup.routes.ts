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
 * @swagger
 * /api/academic-setup/years:
 *   get:
 *     summary: Get all academic years
 *     tags: [Academic Setup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of academic years
 */
router.get("/years", getAllAcademicYears);

/**
 * @swagger
 * /api/academic-setup/years:
 *   post:
 *     summary: Create new academic year
 *     tags: [Academic Setup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - YearName
 *               - StartDate
 *               - EndDate
 *             properties:
 *               YearName:
 *                 type: string
 *               StartDate:
 *                 type: string
 *                 format: date
 *               EndDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Academic year created
 */
router.post("/years", createAcademicYear);

/**
 * @swagger
 * /api/academic-setup/years/{yearId}/set-current:
 *   patch:
 *     summary: Set current academic year
 *     tags: [Academic Setup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: yearId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Current academic year updated
 */
router.patch("/years/:yearId/set-current", setCurrentAcademicYear);

// ==================== DEPARTMENTS ====================

/**
 * @swagger
 * /api/academic-setup/departments:
 *   get:
 *     summary: Get all departments (Academic Setup View)
 *     tags: [Academic Setup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of departments
 */
router.get("/departments", getAllDepartments);

/**
 * @swagger
 * /api/academic-setup/departments:
 *   post:
 *     summary: Create new department
 *     tags: [Academic Setup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - DepartmentName
 *               - DepartmentCode
 *             properties:
 *               DepartmentName:
 *                 type: string
 *               DepartmentCode:
 *                 type: string
 *     responses:
 *       201:
 *         description: Department created
 */
router.post("/departments", createDepartment);

// ==================== PROGRAMS ====================

/**
 * @swagger
 * /api/academic-setup/programs:
 *   get:
 *     summary: Get all programs
 *     tags: [Academic Setup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of programs
 */
router.get("/programs", getAllPrograms);

/**
 * @swagger
 * /api/academic-setup/programs:
 *   post:
 *     summary: Create new program
 *     tags: [Academic Setup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ProgramName
 *               - ProgramCode
 *               - DepartmentID
 *               - DurationYears
 *             properties:
 *               ProgramName:
 *                 type: string
 *               ProgramCode:
 *                 type: string
 *               DepartmentID:
 *                 type: integer
 *               DurationYears:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Program created
 */
router.post("/programs", createProgram);

// ==================== SEMESTERS ====================

/**
 * @swagger
 * /api/academic-setup/semesters:
 *   get:
 *     summary: Get all semesters
 *     tags: [Academic Setup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of semesters
 */
router.get("/semesters", getAllSemesters);

/**
 * @swagger
 * /api/academic-setup/semesters:
 *   post:
 *     summary: Create new semester
 *     tags: [Academic Setup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - SemesterName
 *               - SemesterNumber
 *               - ProgramID
 *             properties:
 *               SemesterName:
 *                 type: string
 *               SemesterNumber:
 *                 type: integer
 *               ProgramID:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Semester created
 */
router.post("/semesters", createSemester);

// ==================== SUBJECTS ====================

/**
 * @swagger
 * /api/academic-setup/subjects:
 *   get:
 *     summary: Get all subjects (Academic Setup View)
 *     tags: [Academic Setup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of subjects
 */
router.get("/subjects", getAllSubjects);

/**
 * @swagger
 * /api/academic-setup/subjects:
 *   post:
 *     summary: Create new subject
 *     tags: [Academic Setup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - SubjectName
 *               - SubjectCode
 *               - DepartmentID
 *               - SemesterID
 *               - Credits
 *             properties:
 *               SubjectName:
 *                 type: string
 *               SubjectCode:
 *                 type: string
 *               DepartmentID:
 *                 type: integer
 *               SemesterID:
 *                 type: integer
 *               Credits:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Subject created
 */
router.post("/subjects", createSubject);

export default router;
