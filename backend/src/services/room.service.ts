import { Op } from "sequelize";
import { RoomRepository } from "../repositories/room.repository.js";
import { Floor } from "../models/Floor.js";
import { Block } from "../models/Block.js";
import { sequelize } from "../config/database.js";
import { Room } from "../models/Room.js";
import { Seat } from "../models/Seat.js";

const roomRepo = new RoomRepository();

interface CreateRoomDTO {
    roomCode: string;
    blockId: number;
    floorId: number;
    capacity: number;
    isExamUsable: boolean;
    rowLayout?: number[];
    seatsPerBench?: number;
}

interface BulkCreateRoomDTO {
    blockId: number;
    floorId: number;
    rooms: { roomCode: string; capacity: number; rowLayout?: number[]; seatsPerBench?: number }[];
}

export class RoomService {


    async getRooms(blockId: number | undefined, floorId: number | undefined, options: { page?: number, limit?: number, search?: string, status?: string } = {}) {
        return roomRepo.findByLocation(blockId, floorId, options);
    }

    private async generateSeats(roomId: number, layout: number[], seatsPerBench: number, transaction: any) {
        if (!layout || layout.length === 0) return;
        const seatsToCreate = [];
        for (let rowIndex = 0; rowIndex < layout.length; rowIndex++) {
            const benches = layout[rowIndex] || 0;
            if (benches === 0) continue;
            for (let benchIndex = 1; benchIndex <= benches; benchIndex++) {
                for (let seatIndex = 1; seatIndex <= seatsPerBench; seatIndex++) {
                    seatsToCreate.push({
                        RoomID: roomId,
                        RowIndex: String.fromCharCode(65 + rowIndex),
                        BenchIndex: benchIndex,
                        SeatIndex: seatIndex,
                        IsActive: true
                    });
                }
            }
        }
        if (seatsToCreate.length > 0) {
            await Seat.bulkCreate(seatsToCreate, { transaction });
        }
    }

    async createRoom(data: CreateRoomDTO) {
        if (data.capacity <= 0) throw new Error("Capacity must be greater than 0");
        const floor = await Floor.findOne({ where: { FloorID: data.floorId, BlockID: data.blockId } });
        if (!floor) throw new Error("Invalid floor for selected block");        

        const existing = await roomRepo.findByCode(data.roomCode, data.floorId);
        if (existing) throw new Error(`Room code '${data.roomCode}' already exists on this floor`);

        const rowLayout = Array.isArray(data.rowLayout) ? data.rowLayout : [];
        const seatsPerBench = data.seatsPerBench ?? 2;

        const transaction = await sequelize.transaction();
        try {
            const room = await Room.create({
                RoomCode: data.roomCode,
                BlockID: data.blockId,
                FloorID: data.floorId,
                TotalCapacity: data.capacity,
                OverrideCap: (data as any).overrideCap ?? (data as any).OverrideCap ?? null,
                ExamUsable: data.isExamUsable,
                Status: "Active",
                RoomType: "ROOM",
                LayoutType: "CUSTOM",
                RowLayout: rowLayout,
                SeatsPerBench: seatsPerBench,
                IsLayoutLocked: false
            }, { transaction });

            // Generate Seats
            await this.generateSeats(room.RoomID, rowLayout, seatsPerBench, transaction);

            await transaction.commit();
            return room;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
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

        const floor = await Floor.findByPk(floorId);
        if (!floor) throw new Error(`Floor ID ${floorId} not found`);
        if (floor.BlockID !== blockId) throw new Error(`Floor ${floorId} does not belong to block ${blockId}`);

        const transaction = await sequelize.transaction();
        try {
            // 1. Fetch existing room codes for this floor to prevent O(N) DB queries
            const existingRooms = await Room.findAll({
                where: { FloorID: floorId },
                attributes: ['RoomCode'],
                transaction
            });
            const existingCodeSet = new Set(existingRooms.map(r => r.RoomCode.toLowerCase()));

            const codesInPayload = new Set<string>();
            const roomsToCreate = [];

            // 2. Validate all payload items in memory
            for (const r of data.rooms) {
                const code = (r.roomCode || r.RoomCode || r.code)?.toString().trim();
                const capacity = Number(r.capacity || r.Capacity);
                const rowLayout = Array.isArray(r.rowLayout || r.RowLayout) ? (r.rowLayout || r.RowLayout) : [];
                const seatsPerBench = Number(r.seatsPerBench || r.SeatsPerBench) || 2;

                if (!code) throw new Error("Room code cannot be empty");        
                if (isNaN(capacity) || capacity <= 0) {
                    throw new Error(`Invalid capacity (${r.capacity || r.Capacity}) for room '${code}'`);
                }

                const lowerCode = code.toLowerCase();
                if (codesInPayload.has(lowerCode)) {
                    throw new Error(`Duplicate room code '${code}' in your list`);
                }
                codesInPayload.add(lowerCode);

                if (existingCodeSet.has(lowerCode)) {
                    throw new Error(`Room '${code}' already exists on this floor`);
                }

                roomsToCreate.push({
                    RoomCode: code,
                    BlockID: blockId,
                    FloorID: floorId,
                    TotalCapacity: capacity,
                    OverrideCap: r.overrideCap ?? r.OverrideCap ?? null,
                    ExamUsable: true,
                    Status: "Active",
                    RoomType: "ROOM",
                    LayoutType: "CUSTOM",
                    RowLayout: rowLayout,
                    SeatsPerBench: seatsPerBench,
                    IsLayoutLocked: false
                });
            }

            // 3. Bulk insert rooms natively
            const createdRooms = await Room.bulkCreate(roomsToCreate as any[], { transaction, returning: true });

            // 4. Gather seats to create across all newly inserted rooms scaling efficiently
            const allSeatsToCreate: any[] = [];
            for (const room of createdRooms) {
                const layout = room.RowLayout;
                const spb = room.SeatsPerBench;
                if (!layout || !Array.isArray(layout) || layout.length === 0) continue;
                for (let rowIndex = 0; rowIndex < layout.length; rowIndex++) {
                    const benches = layout[rowIndex] || 0;
                    if (benches === 0) continue;
                    for (let benchIndex = 1; benchIndex <= benches; benchIndex++) {
                        for (let seatIndex = 1; seatIndex <= spb; seatIndex++) {
                            allSeatsToCreate.push({
                                RoomID: room.RoomID,
                                RowIndex: String.fromCharCode(65 + rowIndex),
                                BenchIndex: benchIndex,
                                SeatIndex: seatIndex,
                                IsActive: true
                            });
                        }
                    }
                }
            }

            if (allSeatsToCreate.length > 0) {
                await Seat.bulkCreate(allSeatsToCreate, { transaction });
            }

            await transaction.commit();
            return createdRooms;

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    async updateRoom(roomId: number, updates: any) {
        const room = await roomRepo.findById(roomId);
        if (!room) throw new Error("Room not found");

        const data: any = {};
        if (updates.roomCode !== undefined) data.RoomCode = updates.roomCode;   
        if (updates.RoomCode !== undefined) data.RoomCode = updates.RoomCode;   
        if (updates.capacity !== undefined) data.TotalCapacity = Number(updates.capacity);
        if (updates.Capacity !== undefined) data.TotalCapacity = Number(updates.Capacity);
        if (updates.TotalCapacity !== undefined) data.TotalCapacity = Number(updates.TotalCapacity);
        if (updates.overrideCap !== undefined) data.OverrideCap = updates.overrideCap === "" ? null : Number(updates.overrideCap);
        if (updates.OverrideCap !== undefined) data.OverrideCap = updates.OverrideCap === "" ? null : Number(updates.OverrideCap);
        if (updates.examUsable !== undefined) data.ExamUsable = !!updates.examUsable;
        if (updates.ExamUsable !== undefined) data.ExamUsable = !!updates.ExamUsable;
        if (updates.status !== undefined) data.Status = updates.status;
        if (updates.Status !== undefined) data.Status = updates.Status;
        if (updates.rowLayout !== undefined) data.RowLayout = updates.rowLayout;
        if (updates.RowLayout !== undefined) data.RowLayout = updates.RowLayout;
        if (updates.seatsPerBench !== undefined) data.SeatsPerBench = updates.seatsPerBench;
        if (updates.SeatsPerBench !== undefined) data.SeatsPerBench = updates.SeatsPerBench;

        const oldRowLayout = JSON.stringify(room.RowLayout);
        const oldSeatsPerBench = room.SeatsPerBench;

        await room.update(data);

        const newRowLayout = JSON.stringify(room.RowLayout);
        const newSeatsPerBench = room.SeatsPerBench;

        if (oldRowLayout !== newRowLayout || oldSeatsPerBench !== newSeatsPerBench) {
            const { generateSeats } = await import('./seatEngine.js');
            await generateSeats(room);
        }

        return room;
    }

    async disableRoom(roomId: number) {
        const room = await roomRepo.findById(roomId);
        if (!room) throw new Error("Room not found");
        return room.update({ Status: "Inactive", ExamUsable: false });
    }

    async enableRoom(roomId: number) {
        const room = await roomRepo.findById(roomId);
        if (!room) throw new Error("Room not found");
        return room.update({ Status: "Active", ExamUsable: true });
    }

    async deleteRoom(roomId: number) {
        const room = await roomRepo.findById(roomId);
        if (!room) throw new Error("Room not found");
        
        // Ensure not referenced in history before complete termination
        // (For now just deleting it)
        await room.destroy();
    }
}
