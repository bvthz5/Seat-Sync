
import express from 'express';
import { AuthMiddleware } from '../middlewares/auth.middleware.js';
import { getStudentUsers, deleteUser, deleteAllStudentUsers } from '../controllers/user_management.controller.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: UserManagement
 *   description: Managing User Accounts (separate from Student/Faculty profiles)
 */

/**
 * @swagger
 * /api/users/students:
 *   get:
 *     summary: List all users with 'student' role
 *     tags: [UserManagement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/students', AuthMiddleware.verifyAccessToken, getStudentUsers);

/**
 * @swagger
 * /api/users/students/delete-all:
 *   delete:
 *     summary: Bulk delete all student user accounts
 *     tags: [UserManagement]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Deleted count
 */
router.delete('/students/delete-all', AuthMiddleware.verifyAccessToken, deleteAllStudentUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete a specific user account
 *     tags: [UserManagement]
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
 *         description: User deleted
 */
router.delete('/:id', AuthMiddleware.verifyAccessToken, deleteUser);

export default router;
