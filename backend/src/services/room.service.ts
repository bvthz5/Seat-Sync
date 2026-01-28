import { RoomRepository } from "../repositories/room.repository.js";
import { Floor } from "../models/Floor.js";
import { Block } from "../models/Block.js";
import { sequelize } from "../config/database.js";
import { Room } from "../models/Room.js";

const roomRepo = new RoomRepository();

interface CreateRoomDTO {
    roomCode: string;
    blockId: number;
    floorId: number;
    capacity: number;
    isExamUsable: boolean;
}

interface BulkCreateRoomDTO {
    blockId: number;
    floorId: number;
    rooms: { roomCode: string; capacity: number }[];
}

export class RoomService {
    async getRooms(blockId: number, floorId: number, options: { page?: number, limit?: number, search?: string, status?: string } = {}) {
        if (!blockId || !floorId) throw new Error("Block and Floor are required");
        return roomRepo.findByLocation(blockId, floorId, options);
    }

    async createRoom(data: CreateRoomDTO) {
        // 1. Validate Capacity
        if (data.capacity <= 0) throw new Error("Capacity must be greater than 0");

        // 2. Validate Floor belongs to Block
        const floor = await Floor.findOne({ where: { FloorID: data.floorId, BlockID: data.blockId } });
        if (!floor) throw new Error("Invalid floor for selected block");

        // 3. Duplicate check
        const existing = await roomRepo.findByCode(data.roomCode, data.floorId);
        if (existing) throw new Error(`Room code '${data.roomCode}' already exists on this floor`);

        return roomRepo.create({
            RoomCode: data.roomCode,
            BlockID: data.blockId,
            FloorID: data.floorId,
            Capacity: data.capacity,
            ExamUsable: data.isExamUsable,
            Status: "Active",
            // Legacy fields default to 0
            TotalRows: 0,
            BenchesPerRow: 0,
            SeatsPerBench: 0
        });
    }

    async bulkCreateRooms(data: any) {
        const blockId = Number(data.blockId || data.BlockID);
        const floorId = Number(data.floorId || data.FloorID);

        if (!data.rooms || !Array.isArray(data.rooms) || data.rooms.length === 0) {
            throw new Error("No rooms provided in payload");
        }

        if (isNaN(blockId) || isNaN(floorId) || !blockId || !floorId) {
            throw new Error(`Invalid location context: blockId=${blockId}, floorId=${floorId}`);
        }

        // 1. Validate Floor exists
        const floor = await Floor.findByPk(floorId);
        if (!floor) throw new Error(`Floor ID ${floorId} not found`);
        if (floor.BlockID !== blockId) throw new Error(`Floor ${floorId} does not belong to block ${blockId}`);

        const transaction = await sequelize.transaction();
        try {
            const roomsToCreate = [];
            const codesInPayload = new Set<string>();

            for (const r of data.rooms) {
                const code = (r.roomCode || r.RoomCode || r.code)?.toString().trim();
                const capacity = Number(r.capacity || r.Capacity);

                if (!code) throw new Error("Room code cannot be empty");
                if (isNaN(capacity) || capacity <= 0) {
                    throw new Error(`Invalid capacity (${r.capacity || r.Capacity}) for room '${code}'`);
                }

                if (codesInPayload.has(code.toLowerCase())) {
                    throw new Error(`Duplicate room code '${code}' in your list`);
                }
                codesInPayload.add(code.toLowerCase());

                // Check DB for each (could be optimized with Op.in)
                const existing = await roomRepo.findByCode(code, floorId);
                if (existing) {
                    throw new Error(`Room '${code}' already exists on this floor`);
                }

                roomsToCreate.push({
                    RoomCode: code,
                    BlockID: blockId,
                    FloorID: floorId,
                    Capacity: capacity,
                    ExamUsable: true,
                    Status: "Active",
                    TotalRows: 0,
                    BenchesPerRow: 0,
                    SeatsPerBench: 0
                });
            }

            const created = await roomRepo.bulkCreate(roomsToCreate, transaction);
            await transaction.commit();
            return created;

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    async updateRoom(roomId: number, updates: any) {
        const room = await roomRepo.findById(roomId);
        if (!room) throw new Error("Room not found");

        // Map frontend fields to backend model if needed
        const data: any = {};
        if (updates.roomCode !== undefined) data.RoomCode = updates.roomCode;
        if (updates.RoomCode !== undefined) data.RoomCode = updates.RoomCode;
        if (updates.capacity !== undefined) data.Capacity = Number(updates.capacity);
        if (updates.Capacity !== undefined) data.Capacity = Number(updates.Capacity);
        if (updates.examUsable !== undefined) data.ExamUsable = !!updates.examUsable;
        if (updates.ExamUsable !== undefined) data.ExamUsable = !!updates.ExamUsable;
        if (updates.status !== undefined) data.Status = updates.status;
        if (updates.Status !== undefined) data.Status = updates.Status;

        return room.update(data);
    }

    async disableRoom(roomId: number) {
        const room = await roomRepo.findById(roomId);
        if (!room) throw new Error("Room not found");
        return room.update({ Status: "Inactive" });
    }
}
