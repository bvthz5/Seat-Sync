
import express from 'express';
import { ExamController } from '../controllers/exam.controller.js';
import { AuthMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

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
router.delete('/:id', AuthMiddleware.verifyAccessToken, ExamController.deleteExam);

export default router;
