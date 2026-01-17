import express from "express";
import { AuthController } from "../controllers/auth.controller.js";

const router = express.Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 1
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     UserID:
 *                       type: integer
 *                     Email:
 *                       type: string
 *                     Role:
 *                       type: string
 *                     IsRootAdmin:
 *                       type: boolean
 *       401:
 *         description: Authentication failed
 */
router.post("/login", AuthController.login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *       401:
 *         description: Refresh token invalid or expired
 */
router.post("/refresh", AuthController.refresh);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post("/logout", AuthController.logout);

export default router;