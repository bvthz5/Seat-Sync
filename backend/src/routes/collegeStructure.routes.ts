import express from "express";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";
import {
    getBlocks, createBlock, updateBlock, deleteBlock,
    getFloors, createFloor, updateFloor, deleteFloor,
    getRooms, createRoom, updateRoom, deleteRoom, getRoomLayout
} from "../controllers/collegeStructure.controller.js";

const router = express.Router();

// Apply Root Admin protection to all routes
router.use(AuthMiddleware.requireRootAuth);

/**
 * @swagger
 * tags:
 *   name: Structure
 *   description: College structure management (Blocks, Floors, Rooms)
 */

// --- BLOCKS ---

/**
 * @swagger
 * /api/admin/college-structure/blocks:
 *   get:
 *     summary: Get all blocks
 *     tags: [Structure]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of blocks with detailed statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   BlockID:
 *                     type: integer
 *                   BlockName:
 *                     type: string
 *                   Status:
 *                     type: string
 *                     enum: [Active, Inactive]
 *                   floorCount:
 *                     type: integer
 *       500:
 *         description: Server error
 */
router.get("/blocks", getBlocks);

/**
 * @swagger
 * /api/admin/college-structure/blocks:
 *   post:
 *     summary: Create a new block
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
 *               - BlockName
 *             properties:
 *               BlockName:
 *                 type: string
 *               Status:
 *                 type: string
 *                 enum: [Active, Inactive]
 *                 default: Active
 *     responses:
 *       201:
 *         description: Block created successfully
 *       400:
 *         description: Block Name must be unique
 *       500:
 *         description: Server error
 */
router.post("/blocks", createBlock);

/**
 * @swagger
 * /api/admin/college-structure/blocks/{id}:
 *   put:
 *     summary: Update a block
 *     tags: [Structure]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Block ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               BlockName:
 *                 type: string
 *               Status:
 *                 type: string
 *                 enum: [Active, Inactive]
 *     responses:
 *       200:
 *         description: Block updated successfully
 *       400:
 *         description: Block Name already taken
 *       404:
 *         description: Block not found
 *       500:
 *         description: Server error
 */
router.put("/blocks/:id", updateBlock);

/**
 * @swagger
 * /api/admin/college-structure/blocks/{id}:
 *   delete:
 *     summary: Delete a block
 *     tags: [Structure]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Block ID
 *     responses:
 *       200:
 *         description: Block deleted successfully
 *       400:
 *         description: Cannot delete block with existing floors
 *       500:
 *         description: Server error
 */
router.delete("/blocks/:id", deleteBlock);

// --- FLOORS ---

/**
 * @swagger
 * /api/admin/college-structure/floors:
 *   get:
 *     summary: Get all floors
 *     tags: [Structure]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: blockId
 *         schema:
 *           type: integer
 *         description: Filter by Block ID
 *     responses:
 *       200:
 *         description: List of floors
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   FloorID:
 *                     type: integer
 *                   BlockID:
 *                     type: integer
 *                   FloorNumber:
 *                     type: integer
 *                   Status:
 *                     type: string
 *                     enum: [Active, Inactive]
 *                   Block:
 *                     type: object
 *                     properties:
 *                       BlockName:
 *                         type: string
 *       500:
 *         description: Server error
 */
router.get("/floors", getFloors);

/**
 * @swagger
 * /api/admin/college-structure/floors:
 *   post:
 *     summary: Create a new floor
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
 *               - FloorNumber
 *             properties:
 *               BlockID:
 *                 type: integer
 *               FloorNumber:
 *                 type: integer
 *               Status:
 *                 type: string
 *                 enum: [Active, Inactive]
 *                 default: Active
 *     responses:
 *       201:
 *         description: Floor created successfully
 *       400:
 *         description: Floor Number already exists in this block
 *       500:
 *         description: Server error
 */
router.post("/floors", createFloor);

/**
 * @swagger
 * /api/admin/college-structure/floors/{id}:
 *   put:
 *     summary: Update a floor
 *     tags: [Structure]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Floor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               FloorNumber:
 *                 type: integer
 *               Status:
 *                 type: string
 *                 enum: [Active, Inactive]
 *     responses:
 *       200:
 *         description: Floor updated successfully
 *       400:
 *         description: Floor Number already exists or cannot disable floor with active rooms
 *       404:
 *         description: Floor not found
 *       500:
 *         description: Server error
 */
router.put("/floors/:id", updateFloor);

/**
 * @swagger
 * /api/admin/college-structure/floors/{id}:
 *   delete:
 *     summary: Delete a floor
 *     tags: [Structure]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Floor ID
 *     responses:
 *       200:
 *         description: Floor deleted successfully
 *       400:
 *         description: Cannot delete floor with existing rooms
 *       500:
 *         description: Server error
 */
router.delete("/floors/:id", deleteFloor);

// --- ROOMS ---

/**
 * @swagger
 * /api/admin/college-structure/rooms:
 *   get:
 *     summary: Get all rooms
 *     tags: [Structure]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *                 type: object
 *                 properties:
 *                   RoomID:
 *                     type: integer
 *                   FloorID:
 *                     type: integer
 *                   RoomCode:
 *                     type: string
 *                   Capacity:
 *                     type: integer
 *                   TotalRows:
 *                     type: integer
 *                   BenchesPerRow:
 *                     type: integer
 *                   SeatsPerBench:
 *                     type: integer
 *                   Status:
 *                     type: string
 *                     enum: [Active, Inactive]
 *                   ExamUsable:
 *                     type: boolean
 *                   Floor:
 *                     type: object
 *                     properties:
 *                       Block:
 *                         type: object
 *       500:
 *         description: Server error
 */
router.get("/rooms", getRooms);

/**
 * @swagger
 * /api/admin/college-structure/rooms/{id}/layout:
 *   get:
 *     summary: Get room seating layout
 *     tags: [Structure]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Room details and generated seats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 room:
 *                   type: object
 *                 seats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       SeatID:
 *                         type: integer
 *                       RowLabel:
 *                         type: string
 *                       BenchNumber:
 *                         type: integer
 *                       SeatNumber:
 *                         type: integer
 *                 seatCount:
 *                   type: integer
 *       404:
 *         description: Room not found
 *       500:
 *         description: Server error
 */
router.get("/rooms/:id/layout", getRoomLayout);

/**
 * @swagger
 * /api/admin/college-structure/rooms:
 *   post:
 *     summary: Create a new room (Legacy/Full Structure)
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
 *               - FloorID
 *               - RoomCode
 *               - Capacity
 *             properties:
 *               FloorID:
 *                 type: integer
 *               RoomCode:
 *                 type: string
 *               Capacity:
 *                 type: integer
 *               ExamUsable:
 *                 type: boolean
 *                 default: true
 *               Status:
 *                 type: string
 *                 enum: [Active, Inactive]
 *                 default: Active
 *               TotalRows:
 *                 type: integer
 *               BenchesPerRow:
 *                 type: integer
 *               SeatsPerBench:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Room created successfully
 *       400:
 *         description: Room Code must be unique
 *       500:
 *         description: Server error
 */
router.post("/rooms", createRoom);

/**
 * @swagger
 * /api/admin/college-structure/rooms/{id}:
 *   put:
 *     summary: Update a room
 *     tags: [Structure]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Room ID
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
 *               Status:
 *                 type: string
 *                 enum: [Active, Inactive]
 *               ExamUsable:
 *                 type: boolean
 *               TotalRows:
 *                 type: integer
 *               BenchesPerRow:
 *                 type: integer
 *               SeatsPerBench:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Room updated successfully
 *       400:
 *         description: Cannot modify layout if exams are booked
 *       404:
 *         description: Room not found
 *       500:
 *         description: Server error
 */
router.put("/rooms/:id", updateRoom);

/**
 * @swagger
 * /api/admin/college-structure/rooms/{id}:
 *   delete:
 *     summary: Delete a room
 *     tags: [Structure]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Room deleted successfully
 *       400:
 *         description: Cannot delete room with history
 *       500:
 *         description: Server error
 */
router.delete("/rooms/:id", deleteRoom);

export default router;
