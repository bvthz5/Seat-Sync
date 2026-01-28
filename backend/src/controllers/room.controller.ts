import { Request, Response } from "express";
import { RoomService } from "../services/room.service.js";

const roomService = new RoomService();

export const getRooms = async (req: Request, res: Response) => {
    try {
        const { blockId, floorId } = req.query;
        if (!blockId || !floorId) {
            return res.status(400).json({ message: "blockId and floorId are required" });
        }

        const rooms = await roomService.getRooms(Number(blockId), Number(floorId));
        res.json(rooms); // Returns mapped data if repo maps it, currently repo returns Room instances
        // The repo findByLocation returns Room instances with Block/Floor included. 
        // We can just return it or transform it. The prompt didn't specify strict response shape separate from DB.
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createRoom = async (req: Request, res: Response) => {
    try {
        const { BlockID, FloorID, RoomCode, Capacity, ExamUsable } = req.body;
        const newRoom = await roomService.createRoom({
            blockId: BlockID,
            floorId: FloorID,
            roomCode: RoomCode,
            capacity: Capacity,
            isExamUsable: ExamUsable
        });
        res.status(201).json(newRoom);
    } catch (error: any) {
        // Simple error handling, could be improved with custom error classes
        res.status(400).json({ message: error.message });
    }
};

export const bulkCreateRooms = async (req: Request, res: Response) => {
    console.log("--- BULK CREATE HIT ---");
    console.log("BODY:", JSON.stringify(req.body));
    try {
        const { blockId, BlockID, floorId, FloorID, rooms } = req.body;
        // Construct clean payload to avoid any hidden prop issues
        const cleanPayload = {
            blockId: blockId || BlockID,
            floorId: floorId || FloorID,
            rooms: rooms
        };
        console.log("Clean Payload:", JSON.stringify(cleanPayload));

        const result = await roomService.bulkCreateRooms(cleanPayload);
        res.status(201).json(result);
    } catch (error: any) {
        console.error("BULK FAIL TRACE:", error);
        res.status(400).json({
            message: error?.message || "Unknown Error",
            name: error?.name,
            str: String(error),
            stack: error?.stack
        });
    }
};

export const updateRoom = async (req: Request, res: Response) => {
    try {
        const roomId = Number(req.params.roomId);
        const updated = await roomService.updateRoom(roomId, req.body);
        res.json(updated);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const disableRoom = async (req: Request, res: Response) => {
    try {
        const roomId = Number(req.params.roomId);
        await roomService.disableRoom(roomId);
        res.json({ message: "Room disabled successfully" });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};
