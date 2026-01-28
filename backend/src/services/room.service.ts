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
    async getRooms(blockId: number, floorId: number) {
        if (!blockId || !floorId) throw new Error("Block and Floor are required");
        return roomRepo.findByLocation(blockId, floorId);
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
        console.log("Service Bulk Data:", JSON.stringify(data));
        const blockId = data.blockId || data.BlockID;
        const floorId = data.floorId || data.FloorID;

        if (!data.rooms || data.rooms.length === 0) {
            throw new Error("No rooms provided in payload");
        }

        const transaction = await sequelize.transaction();
        try {
            // 1. Validate Floor belongs to Block
            if (!blockId || !floorId) throw new Error(`Missing blockId (${blockId}) or floorId (${floorId})`);

            const floor = await Floor.findOne({ where: { FloorID: floorId, BlockID: blockId }, transaction });
            if (!floor) throw new Error("Invalid floor for selected block");

            // 2. Normalize and check duplicates in payload
            const codesSeen = new Set<string>();
            const roomsToCreate = [];

            for (const r of data.rooms) {
                const code = r.roomCode.trim();
                const capacity = r.capacity; // Capacity is per-room now

                // Basic validation
                if (!code) throw new Error("Room code cannot be empty");
                if (!capacity || capacity <= 0) throw new Error(`Invalid capacity for room '${code}'`);

                // Payload duplicate check
                if (codesSeen.has(code.toLowerCase())) {
                    throw new Error(`Duplicate room code '${code}' in payload`);
                }
                codesSeen.add(code.toLowerCase());

                // Prepare object
                roomsToCreate.push({
                    RoomCode: code,
                    BlockID: blockId,
                    FloorID: floorId,
                    Capacity: capacity,
                    ExamUsable: true, // Default to true for bulk
                    Status: "Active",
                    TotalRows: 0,
                    BenchesPerRow: 0,
                    SeatsPerBench: 0
                });
            }

            // 3. DB Duplicate Check (Check all at once or one by one)
            // Checking one by one in repository is safer to catch specific conflicts
            for (const r of roomsToCreate) {
                const existing = await roomRepo.findByCode(r.RoomCode, floorId); // This needs to be transaction aware if possible, but findByCode is read-only.
                // ideally roomRepo.findByCode should accept transaction or we just trust the read. 
                // For stricter safety, we can rely on unique constraint violation from catch block, 
                // but checking here gives better error message.
                if (existing) {
                    throw new Error(`Room code '${r.RoomCode}' already exists on this floor`);
                }
            }

            // 4. Bulk Insert
            const created = await roomRepo.bulkCreate(roomsToCreate, transaction);

            await transaction.commit();
            return created;

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    async updateRoom(roomId: number, updates: any) {
        // TODO: If changing Capacity, warn/check usage?
        // For now, allow update.
        return roomRepo.update(roomId, updates);
    }

    async disableRoom(roomId: number) {
        const room = await roomRepo.findById(roomId);
        if (!room) throw new Error("Room not found");

        // Check if room is in use (Mock implementation, requires Seat/Exam/Allocation models)
        // For now, we update status
        return room.update({ Status: "Inactive" });
    }
}
