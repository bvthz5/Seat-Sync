import express from "express";
const router = express.Router();
import { AuthMiddleware } from "../middlewares/auth.middleware.js";
import {
  getInternalBlocks, createInternalBlock, updateInternalBlock, deleteInternalBlock,
  getInternalFloors, createInternalFloor, updateInternalFloor, deleteInternalFloor,
  getInternalRooms, createInternalRoom, bulkCreateInternalRooms, updateInternalRoom,
  disableInternalRoom, enableInternalRoom, deleteInternalRoom,
  getInternalRoomLayout, updateInternalRoomLayout, updateInternalSeatStates,
  deleteAllInternalStructureData, importInternalStructure, previewInternalStructure, getFloorsByBlock
} from "../controllers/internalStructure.controller.js";

// All routes require root admin auth
router.use(AuthMiddleware.requireRootAuth);

// --- BULK OPERATIONS ---
router.delete("/all", deleteAllInternalStructureData);
router.post("/import/preview", previewInternalStructure);
router.post("/import", importInternalStructure);

// --- BLOCKS ---
router.get("/blocks", getInternalBlocks);
router.post("/blocks", createInternalBlock);
router.put("/blocks/:id", updateInternalBlock);
router.delete("/blocks/:id", deleteInternalBlock);
router.get("/blocks/:blockId/floors", getFloorsByBlock);

// --- FLOORS ---
router.get("/floors", getInternalFloors);
router.post("/floors", createInternalFloor);
router.put("/floors/:id", updateInternalFloor);
router.delete("/floors/:id", deleteInternalFloor);

// --- ROOMS ---
router.get("/rooms", getInternalRooms);
router.post("/rooms", createInternalRoom);
router.post("/rooms/bulk", bulkCreateInternalRooms);
router.put("/rooms/:id", updateInternalRoom);
router.patch("/rooms/:id/disable", disableInternalRoom);
router.patch("/rooms/:id/enable", enableInternalRoom);
router.delete("/rooms/:id", deleteInternalRoom);

// --- LAYOUT ---
router.get("/rooms/:id/layout", getInternalRoomLayout);
router.put("/rooms/:id/layout", updateInternalRoomLayout);
router.put("/rooms/:id/seats", updateInternalSeatStates);

export default router;
