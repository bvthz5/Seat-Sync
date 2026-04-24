
import express from 'express';
import { ExamController } from '../controllers/exam.controller.js';
import { AuthMiddleware } from '../middlewares/auth.middleware.js';

import multer from 'multer';

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * tags:
 *   name: Exam
 *   description: Exam management endpoints
 */

/**
 * @swagger
 * /api/exams/stats:
 *   get:
 *     summary: Get exam statistics
 *     tags: [Exam]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Key metrics for dashboard
 */
router.get('/stats', AuthMiddleware.verifyAccessToken, ExamController.getStats);

/**
 * @swagger
 * /api/exams/preview-timetable:
 *   post:
 *     summary: Preview timetable without importing
 *     tags: [Exam]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
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
 *         description: Timetable preview data
 */
router.post('/preview-timetable', AuthMiddleware.verifyAccessToken, upload.single('file'), ExamController.previewTimetable);

/**
 * @swagger
 * /api/exams/{id}/eligible-students/import:
 *   post:
 *     summary: Import eligible students for a branch-specific exam
 *     tags: [Exam]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
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
 *         description: Eligible students imported
 */
router.post('/bulk-import-eligibility', AuthMiddleware.verifyAccessToken, upload.array('files'), ExamController.bulkImportEligibility);
router.post('/:id/eligible-students/import', AuthMiddleware.verifyAccessToken, upload.single('file'), ExamController.importEligibleStudents);

/**
 * @swagger
 * /api/exams:
 *   get:
 *     summary: Get all exams
 *     tags: [Exam]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of exams
 */
router.get('/', AuthMiddleware.verifyAccessToken, ExamController.getExams);

/**
 * @swagger
 * /api/exams:
 *   post:
 *     summary: Create a new exam
 *     tags: [Exam]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - SubjectID
 *               - ExamName
 *               - ExamDate
 *               - Session
 *               - Duration
 *             properties:
 *               SubjectID:
 *                 type: integer
 *               ExamName:
 *                 type: string
 *               ExamDate:
 *                 type: string
 *                 format: date
 *               Session:
 *                 type: string
 *               Duration:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Exam created
 */
router.post('/', AuthMiddleware.verifyAccessToken, ExamController.createExam);

/**
 * @swagger
 * /api/exams/{id}:
 *   put:
 *     summary: Update an exam
 *     tags: [Exam]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Exam updated
 */
router.put('/:id', AuthMiddleware.verifyAccessToken, ExamController.updateExam);

/**
 * @swagger
 * /api/exams/{id}/eligible-students:
 *   get:
 *     summary: Get eligible students for an exam
 *     tags: [Exam]
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
 *         description: List of eligible students
 */
router.get('/:id/eligible-students', AuthMiddleware.verifyAccessToken, ExamController.getEligibleStudents);

/**
 * @swagger
 * /api/exams/{id}:
 *   delete:
 *     summary: Delete an exam
 *     tags: [Exam]
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
 *         description: Exam deleted
 */
router.delete('/clear-eligibility', AuthMiddleware.verifyAccessToken, ExamController.clearEligibility);
router.delete('/delete-all', AuthMiddleware.verifyAccessToken, ExamController.deleteAllExams);
router.delete('/:id', AuthMiddleware.verifyAccessToken, ExamController.deleteExam);

/**
 * @swagger
 * /api/exams/import-timetable:
 *   post:
 *     summary: Import exam timetable
 *     tags: [Exam]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
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
 *         description: Imported successfully
 */
router.post('/import-timetable', AuthMiddleware.verifyAccessToken, upload.single('file'), ExamController.importTimetable);

/**
 * @swagger
 * /api/exams/template:
 *   get:
 *     summary: Download exam timetable template
 *     tags: [Exam]
 *     responses:
 *       200:
 *         description: Template file
 */
router.get('/template', AuthMiddleware.verifyAccessToken, ExamController.exportTimetableTemplate);

export default router;
