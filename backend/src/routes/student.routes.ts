import express from 'express';
import multer from 'multer';
import { getAllStudents, importStudents, createStudent, getCreateOptions, updateStudent, deleteStudent, exportStudents } from '../controllers/student.controller.js';
import { AuthMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Multer setup for file upload (memory storage is fine for parsing immediately)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
            file.mimetype === "application/vnd.ms-excel") {
            cb(null, true);
        } else {
            cb(new Error("Only Excel files are allowed"));
        }
    }
});

// Routes
/**
 * @swagger
 * tags:
 *   name: Student
 *   description: Student management and retrieval
 */

/**
 * @swagger
 * /api/students/export:
 *   get:
 *     summary: Export students to Excel
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, or register number
 *       - in: query
 *         name: dept
 *         schema:
 *           type: integer
 *         description: Filter by Department ID
 *       - in: query
 *         name: program
 *         schema:
 *           type: integer
 *         description: Filter by Program ID
 *       - in: query
 *         name: semester
 *         schema:
 *           type: integer
 *         description: Filter by Semester ID
 *     responses:
 *       200:
 *         description: Excel file containing student data
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       500:
 *         description: Server error
 */
router.get('/export', AuthMiddleware.verifyAccessToken, exportStudents);

/**
 * @swagger
 * /api/students:
 *   get:
 *     summary: Get all students with pagination and filtering
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: dept
 *         schema:
 *           type: integer
 *       - in: query
 *         name: program
 *         schema:
 *           type: integer
 *       - in: query
 *         name: semester
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of students and stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 students:
 *                   type: array
 *                   items:
 *                     type: object
 *                 totalItems:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 currentPage:
 *                   type: integer
 *       500:
 *         description: Server error
 */
router.get('/', AuthMiddleware.verifyAccessToken, getAllStudents);

/**
 * @swagger
 * /api/students:
 *   post:
 *     summary: Create a new student
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - FullName
 *               - Email
 *               - RegisterNumber
 *               - DepartmentID
 *               - ProgramID
 *               - SemesterID
 *               - BatchYear
 *             properties:
 *               FullName:
 *                 type: string
 *               Email:
 *                 type: string
 *               RegisterNumber:
 *                 type: string
 *               DepartmentID:
 *                 type: integer
 *               ProgramID:
 *                 type: integer
 *               SemesterID:
 *                 type: integer
 *               BatchYear:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Student created successfully
 *       400:
 *         description: Missing fields
 *       409:
 *         description: Duplicate register number
 *       500:
 *         description: Server error
 */
router.post('/', AuthMiddleware.verifyAccessToken, createStudent);

/**
 * @swagger
 * /api/students/{id}:
 *   put:
 *     summary: Update a student
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Student ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               FullName:
 *                 type: string
 *               Email:
 *                 type: string
 *               RegisterNumber:
 *                 type: string
 *               DepartmentID:
 *                 type: integer
 *               ProgramID:
 *                 type: integer
 *               SemesterID:
 *                 type: integer
 *               BatchYear:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Student updated successfully
 *       404:
 *         description: Student not found
 *       500:
 *         description: Server error
 */
router.put('/:id', AuthMiddleware.verifyAccessToken, updateStudent);

/**
 * @swagger
 * /api/students/{id}:
 *   delete:
 *     summary: Delete a student
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Student deleted successfully
 *       404:
 *         description: Student not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', AuthMiddleware.verifyAccessToken, deleteStudent);

/**
 * @swagger
 * /api/students/meta/create-options:
 *   get:
 *     summary: Get metadata for creating/filtering students
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of departments, programs, and semesters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 departments:
 *                   type: array
 *                 programs:
 *                   type: array
 *                 semesters:
 *                   type: array
 *       500:
 *         description: Server error
 */
router.get('/meta/create-options', AuthMiddleware.verifyAccessToken, getCreateOptions);

/**
 * @swagger
 * /api/students/import:
 *   post:
 *     summary: Bulk import students from Excel
 *     tags: [Student]
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
 *         description: Import complete
 *       400:
 *         description: Invalid file or missing data
 *       500:
 *         description: Server error
 */
router.post('/import', AuthMiddleware.verifyAccessToken, upload.single('file'), importStudents);

export default router;
