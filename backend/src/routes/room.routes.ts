import express from "express";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";
import {
    getRooms,
    createRoom,
    bulkCreateRooms,
    updateRoom,
    disableRoom
} from "../controllers/room.controller.js";

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Room:
 *       type: object
 *       properties:
 *         RoomID:
 *           type: integer
 *         BlockID:
 *           type: integer
 *         FloorID:
 *           type: integer
 *         RoomCode:
 *           type: string
 *         Capacity:
 *           type: integer
 *         ExamUsable:
 *           type: boolean
 *         Status:
 *           type: string
 *           enum: [Active, Inactive]
 */

/**
 * @swagger
 * /api/rooms:
 *   get:
 *     summary: Get all rooms (filtered by block/floor)
 *     tags: [Structure]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: blockId
 *         schema:
 *           type: integer
 *         description: Filter by Block ID
 *       - in: query
 *         name: floorId
 *         schema:
 *           type: integer
 *         description: Filter by Floor ID
 *     responses:
 *       200:
 *         description: List of rooms
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Room'
 */
router.get("/", AuthMiddleware.requireAuth, getRooms);

/**
 * @swagger
 * /api/rooms:
 *   post:
 *     summary: Create a single room
 *     tags: [Structure]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - BlockID
 *               - FloorID
 *               - RoomCode
 *               - Capacity
 *             properties:
 *               BlockID:
 *                 type: integer
 *               FloorID:
 *                 type: integer
 *               RoomCode:
 *                 type: string
 *               Capacity:
 *                 type: integer
 *               ExamUsable:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Room created
 *       403:
 *         description: Root Admin required
 */
router.post("/", AuthMiddleware.requireRootAuth, createRoom);

/**
 * @swagger
 * /api/rooms/bulk:
 *   post:
 *     summary: Bulk create rooms
 *     tags: [Structure]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - blockId
 *               - floorId
 *               - rooms
 *             properties:
 *               blockId:
 *                 type: integer
 *               floorId:
 *                 type: integer
 *               rooms:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     roomCode:
 *                       type: string
 *                     capacity:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Rooms created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Room'
 *       400:
 *         description: Validation error
 */
router.post("/bulk", AuthMiddleware.requireRootAuth, bulkCreateRooms);

/**
 * @swagger
 * /api/rooms/{roomId}:
 *   put:
 *     summary: Update room details
 *     tags: [Structure]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               RoomCode:
 *                 type: string
 *               Capacity:
 *                 type: integer
 *               ExamUsable:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Room updated
 *       404:
 *         description: Room not found
 */
router.put("/:roomId", AuthMiddleware.requireRootAuth, updateRoom);

/**
 * @swagger
 * /api/rooms/{roomId}/disable:
 *   patch:
 *     summary: Disable a room
 *     tags: [Structure]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Room disabled
 *       404:
 *         description: Room not found
 */
router.patch("/:roomId/disable", AuthMiddleware.requireRootAuth, disableRoom);

export default router;
