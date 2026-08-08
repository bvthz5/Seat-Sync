import { Request, Response } from "express";
import { RoomService } from "../services/room.service.js";

const roomService = new RoomService();

export const getRooms = async (req: Request, res: Response) => {
    try {
        const { blockId, floorId, page, limit, search, status } = req.query;

        const p = Number(page) || 1;
        const l = Number(limit) || 10;

        const result = await roomService.getRooms(
            blockId ? Number(blockId) : undefined,
            floorId ? Number(floorId) : undefined,
            {
                page: p,
                limit: l,
                search: search as string,
                status: status as string
            }
        );

        res.json({
            total: result.count,
            pages: Math.ceil(result.count / l),
            currentPage: p,
            data: result.rows
        });
    } catch (error: any) {
        console.error("GET ROOMS ERROR:", error);
        if (error.original && error.original.errors) console.error("MSSQL ERRORS:", error.original.errors);
        res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const createRoom = async (req: Request, res: Response) => {
    try {
        const { BlockID, FloorID, RoomCode, Capacity, ExamUsable, RowLayout, SeatsPerBench } = req.body;  
        const newRoom = await roomService.createRoom({
            blockId: BlockID,
            floorId: FloorID,
            roomCode: RoomCode,
            capacity: Capacity,
            isExamUsable: ExamUsable !== undefined ? ExamUsable : true,
            rowLayout: RowLayout,
            seatsPerBench: SeatsPerBench
        });
        res.status(201).json(newRoom);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const bulkCreateRooms = async (req: Request, res: Response) => {
    try {
        const { blockId, BlockID, floorId, FloorID, rooms } = req.body;
        // Construct clean payload to avoid any hidden prop issues
        const cleanPayload = {
            blockId: blockId || BlockID,
            floorId: floorId || FloorID,
            rooms: rooms
        };

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

export const enableRoom = async (req: Request, res: Response) => {
    try {
        const roomId = Number(req.params.roomId);
        await roomService.enableRoom(roomId);
        res.json({ message: "Room enabled successfully" });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteRoom = async (req: Request, res: Response) => {
    try {
        // use params.id mapped to API /:id earlier
        const roomId = Number(req.params.id);
        await roomService.deleteRoom(roomId);
        res.json({ message: "Room deleted successfully" });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

