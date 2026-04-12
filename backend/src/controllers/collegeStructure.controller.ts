import { generateSeats } from '../services/seatEngine.js';
import { Request, Response } from "express";
import { sequelize } from "../config/database.js";
import { Block } from "../models/Block.js";
import { Floor } from "../models/Floor.js";
import { Room } from "../models/Room.js";
import { Seat } from "../models/Seat.js";
import { Zone } from "../models/Zone.js";
import { Exam } from "../models/Exam.js";
import { SeatAllocation } from "../models/SeatAllocation.js";
import { Op } from "sequelize";

// --- BLOCKS ---

export const getBlocks = async (req: Request, res: Response) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const search = req.query.search as string;
        const status = req.query.status as string;

        const offset = (page - 1) * limit;

        const whereClause: any = {};
        if (search) {
            whereClause.BlockName = { [Op.like]: `%${search}%` };
        }
        if (status) {
            whereClause.Status = status;
        }

        const { count, rows } = await Block.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: [['BlockName', 'ASC']]
        });

        const responseData = await Promise.all(rows.map(async (block) => {
            const floorCount = await Floor.count({ where: { BlockID: block.BlockID } });
            return {
                ...block.toJSON(),
                floorCount,
            };
        }));

        res.json({
            total: count,
            pages: Math.ceil(count / limit),
            currentPage: page,
            data: responseData
        });
    } catch (error: any) {
        console.error("GET BLOCKS ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

export const createBlock = async (req: Request, res: Response) => {
    try {
        const { BlockName, Status } = req.body;
        const existing = await Block.findOne({ where: { BlockName } });
        if (existing) return res.status(400).json({ message: "Block Name must be unique" });

        const block = await Block.create({ BlockName, Status: Status || 'Active' });
        res.status(201).json(block);
    } catch (error: any) {
        console.error("CREATE BLOCK ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

export const updateBlock = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const { BlockName, Status } = req.body;

        const block = await Block.findByPk(id);
        if (!block) return res.status(404).json({ message: "Block not found" });

        if (BlockName !== block.BlockName) {
            const existing = await Block.findOne({ where: { BlockName } });
            if (existing) return res.status(400).json({ message: "Block Name already taken" });
        }


        block.BlockName = BlockName;
        block.Status = Status || block.Status;
        await block.save();

        res.json(block);

    } catch (error: any) {
        console.error("UPDATE BLOCK ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

export const deleteBlock = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const floorCount = await Floor.count({ where: { BlockID: id } });

        if (floorCount > 0) {
            return res.status(400).json({ message: "Cannot delete block with existing floors." });
        }

        await Block.destroy({ where: { BlockID: id } });
        res.json({ message: "Block deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// --- FLOORS ---

export const getFloors = async (req: Request, res: Response) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const search = req.query.search as string;
        const status = req.query.status as string;
        const blockId = req.query.blockId ? Number(req.query.blockId) : undefined;

        const offset = (page - 1) * limit;

        const whereClause: any = {};
        if (blockId) whereClause.BlockID = blockId;
        if (status) whereClause.Status = status;
        if (search) {
            // Searching by floor number is tricky with LIKE if it's Int, 
            // but we can try to cast or just do exact match if it looks like a number
            if (!isNaN(Number(search))) {
                whereClause.FloorNumber = Number(search);
            }
        }

        const { count, rows } = await Floor.findAndCountAll({
            where: whereClause,
            include: [{ model: Block, attributes: ['BlockName'] }],
            limit,
            offset,
            order: [['BlockID', 'ASC'], ['FloorNumber', 'ASC']]
        });

        res.json({
            total: count,
            pages: Math.ceil(count / limit),
            currentPage: page,
            data: rows
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createFloor = async (req: Request, res: Response) => {
    try {
        const { BlockID, FloorNumber, Status } = req.body;

        const existing = await Floor.findOne({ where: { BlockID, FloorNumber } });
        if (existing) return res.status(400).json({ message: "Floor Number already exists in this block" });

        const floor = await Floor.create({ BlockID, FloorNumber, Status: Status || 'Active' });
        res.status(201).json(floor);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateFloor = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const { FloorNumber, Status } = req.body;

        const floor = await Floor.findByPk(id);
        if (!floor) return res.status(404).json({ message: "Floor not found" });

        if (FloorNumber !== floor.FloorNumber) {
            const existing = await Floor.findOne({ where: { BlockID: floor.BlockID, FloorNumber } });
            if (existing) return res.status(400).json({ message: "Floor Number already exists in this block" });
        }

        if (Status === 'Inactive' && floor.Status === 'Active') {
            const activeRooms = await Room.count({ where: { FloorID: id, Status: 'Active' } });
            if (activeRooms > 0) {
                return res.status(400).json({ message: "Cannot disable floor with active rooms." });
            }
        }


        if (FloorNumber !== undefined) floor.FloorNumber = FloorNumber;
        if (Status !== undefined) floor.Status = Status;
        await floor.save();


        res.json(floor);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteFloor = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const roomCount = await Room.count({ where: { FloorID: id } });

        if (roomCount > 0) {
            return res.status(400).json({ message: "Cannot delete floor with existing rooms." });
        }

        await Floor.destroy({ where: { FloorID: id } });
        res.json({ message: "Floor deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// --- ROOMS & LAYOUT ---


export const getRooms = async (req: Request, res: Response) => {
    try {
        const { search, limit, offset, status, blockId, floorId } = req.query;

        const whereClause: any = {};
        if (search) {
            whereClause.RoomCode = { [Op.like]: `%${search}%` };
        }
        if (status) {
            whereClause.Status = status;
        }
        if (blockId) {
            whereClause.BlockID = parseInt(blockId as string);
        }
        if (floorId) {
            whereClause.FloorID = parseInt(floorId as string);
        }

        const limitNum = limit ? parseInt(limit as string) : undefined;
        const offsetNum = offset ? parseInt(offset as string) : undefined;

        const qOpts: any = {
            where: whereClause,
            include: [
                { model: Block, attributes: ['BlockName'] },
                { model: Floor, attributes: ['FloorNumber'] }
            ],
            order: [['RoomCode', 'ASC']]
        };
        if (limitNum !== undefined && !isNaN(limitNum)) qOpts.limit = limitNum;
        if (offsetNum !== undefined && !isNaN(offsetNum)) qOpts.offset = offsetNum;
        
        const { count, rows } = await Room.findAndCountAll(qOpts);

        res.json({
            data: rows,
            total: count,
            totalPages: limitNum ? Math.ceil(count / limitNum) : 1
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};


export const getRoomLayout = async (req: Request, res: Response) => {
    try {
        const roomId = Number(req.params.id);
        const room = await Room.findByPk(roomId);
        if (!room) return res.status(404).json({ message: "Room not found" });

        const seats = await Seat.findAll({
            attributes: ['SeatID', 'RoomID', 'RowLabel', 'BenchNumber', 'SeatNumber', 'IsActive', 'ZoneID'], // Explicitly select ZoneID
            where: { RoomID: roomId },
            order: [
                ['RowLabel', 'ASC'],
                ['BenchNumber', 'ASC'],
                ['SeatNumber', 'ASC']
            ]
        });

        const zones = await Zone.findAll({ where: { RoomID: roomId } });

        res.json({
            room,
            seats,
            zones,
            seatCount: seats.length
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createRoom = async (req: Request, res: Response) => {
    try {
        const { BlockID, FloorID, RoomCode, ExamUsable, Status, TotalRows, BenchesPerRow, SeatsPerBench, Capacity, RowLayout } = req.body;

        const existing = await Room.findOne({ where: { RoomCode } });
        if (existing) return res.status(400).json({ message: "Room Code/Name must be unique" });

        const finalRowLayout = RowLayout || (TotalRows && BenchesPerRow ? Array(TotalRows).fill(BenchesPerRow) : []);

        const room = await Room.create({
            BlockID,
            FloorID,
            RoomCode,
            ExamUsable: ExamUsable ?? false,
            Status: Status ?? 'Active',
            Capacity: Capacity || 0,
            RowLayout: finalRowLayout,
            SeatsPerBench: SeatsPerBench || 0
        } as any);

        if (finalRowLayout.length > 0 && SeatsPerBench > 0) {
            await generateSeats(room);
        }

        res.status(201).json(room);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateRoom = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const { RoomCode, Status, ExamUsable, TotalRows, BenchesPerRow, SeatsPerBench, Capacity, RoomType, RowLayout } = req.body;

        const room = await Room.findByPk(id) as any;
        if (!room) return res.status(404).json({ message: "Room not found" });

        const newRowLayout = RowLayout || (TotalRows && BenchesPerRow ? Array(TotalRows).fill(BenchesPerRow) : undefined);

        // ... Layout check ...
        const isPhysicalLayoutChange = (
            (newRowLayout !== undefined && JSON.stringify(newRowLayout) !== JSON.stringify(room.RowLayout)) ||
            (SeatsPerBench !== undefined && SeatsPerBench !== room.SeatsPerBench)
        );

        const isLayoutChange = isPhysicalLayoutChange;

        if (isLayoutChange) {
            const futureAllocations = await SeatAllocation.count({
                include: [
                    {
                        model: Seat,
                        where: { RoomID: id },
                        required: true
                    },
                    {
                        model: Exam,
                        where: {
                            ExamDate: { [Op.gte]: new Date() }
                        },
                        required: true
                    }
                ]
            });

            if (futureAllocations > 0) {
                return res.status(400).json({ message: "Cannot modify layout. Room is booked for future exams." });
            }
        }

        if (RoomCode) room.RoomCode = RoomCode;
        if (Status) room.Status = Status;
        if (Capacity) room.Capacity = Capacity;
        if (ExamUsable !== undefined) room.ExamUsable = ExamUsable;
        if (RoomType) room.RoomType = RoomType;

        let shouldRegenerateSeats = false;
        if (isPhysicalLayoutChange) {
            if (newRowLayout !== undefined) room.RowLayout = newRowLayout;
            if (SeatsPerBench !== undefined) room.SeatsPerBench = SeatsPerBench;
            shouldRegenerateSeats = true;
        }

        await room.save();

        if (shouldRegenerateSeats) {
            await generateSeats(room);
        }

        res.json(room);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteRoom = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);

        const allocations = await SeatAllocation.count({
            include: [{ model: Seat, where: { RoomID: id } }]
        });

        if (allocations > 0) {
            return res.status(400).json({ message: "Cannot delete room. It has examination history." });
        }

        await Seat.destroy({ where: { RoomID: id } });
        await Room.destroy({ where: { RoomID: id } });

        res.json({ message: "Room deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};


export const bulkCreateRooms = async (req: Request, res: Response) => {
    try {
        const { rooms } = req.body;
        if (!Array.isArray(rooms)) {
            return res.status(400).json({ message: "rooms must be an array" });      
        }

        // We run in a transaction
        await sequelize.transaction(async (t) => {
            const createdRooms = await Room.bulkCreate(rooms, { transaction: t });   
            
            // Note: seats need to be generated for each room individually because rowLayout logic
            for (const r of createdRooms) {
                await generateSeats(r);
            }
        });

        res.status(201).json({ message: "Rooms structurally built successfully" });  
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
// --- ZONES ---

export const getZones = async (req: Request, res: Response) => {
    try {
        const roomId = Number(req.params.roomId);
        const zones = await Zone.findAll({ where: { RoomID: roomId } });
        res.json(zones);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createZone = async (req: Request, res: Response) => {
    try {
        const roomId = Number(req.params.roomId);
        const { ZoneCode, ZoneName, Color } = req.body;

        const zone = await Zone.create({
            RoomID: roomId,
            ZoneCode,
            ZoneName,
            Color
        });

        res.status(201).json(zone);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteZone = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);

        // Remove zone assignments from seats before deleting the zone
        await Seat.update({ ZoneID: null }, { where: { ZoneID: id } });

        await Zone.destroy({ where: { ZoneID: id } });
        res.json({ message: "Zone deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};


export const autoZoneRoom = async (req: Request, res: Response) => {
    try {
        const roomId = Number(req.params.roomId);
        const { zoneCount } = req.body;

        if (!zoneCount || zoneCount < 2 || zoneCount > 6) {
            return res.status(400).json({ message: "zoneCount must be between 2 and 6" });
        }

        const room = await Room.findByPk(roomId);
        if (!room) return res.status(404).json({ message: "Room not found" });       

        // 1. Fetch seats sorted by RowIndex, BenchIndex, SeatIndex
        const seats = await Seat.findAll({
            where: { RoomID: roomId, IsActive: true },
            order: [['RowIndex', 'ASC'], ['BenchIndex', 'ASC'], ['SeatIndex', 'ASC']]
        });

        if (seats.length === 0) {
            return res.status(400).json({ message: "No active seats found to zone." });
        }

        // Clean existing zones
        await Seat.update({ ZoneID: null }, { where: { RoomID: roomId } });
        await Zone.destroy({ where: { RoomID: roomId } });

        // Create new zones
        const colors = ['blue', 'red', 'green', 'yellow', 'purple', 'orange'];       
        const zones: any[] = [];
        for (let i = 0; i < zoneCount; i++) {
            const z = await Zone.create({
                RoomID: roomId,
                ZoneCode: `Z${i+1}`,
                ZoneName: `Zone ${i+1}`,
                Color: colors[i % colors.length] as string
            });
            zones.push(z);
        }

        // 2. Determine max columns
        const maxColumns = Math.max(...seats.map(s => s.BenchIndex));

        // 3. Divide columns into zones
        const columnsPerZone = Math.ceil(maxColumns / zoneCount);

        // 4. Assign seats
        const updatePromises = seats.map(seat => {
            const zoneIndex = Math.min(Math.floor((seat.BenchIndex - 1) / columnsPerZone), zoneCount - 1);
            const targetZoneId = (zones[zoneIndex] as any).ZoneID;
            return Seat.update({ ZoneID: targetZoneId }, { where: { SeatID: seat.SeatID } });
        });

        await Promise.all(updatePromises);
        res.json({ message: 'Auto-zoning completed successfully', zones });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// --- SEAT MANAGEMENT ---

export const updateSeatZones = async (req: Request, res: Response) => {
    try {
        const roomId = Number(req.params.roomId);
        const { updates } = req.body; // Array of { SeatID, ZoneID, IsActive }

        if (!Array.isArray(updates)) {
            return res.status(400).json({ message: "Invalid updates format. Expected array." });
        }

        const room = await Room.findByPk(roomId);
        if (!room) return res.status(404).json({ message: "Room not found" });

        // Transactional update for safety
        await sequelize.transaction(async (t) => {
            const updatePromises = updates.map(update => {
                const { SeatID, ZoneID, IsActive } = update;
                const updateData: any = {};

                // Allow null to clear the zone
                if (ZoneID !== undefined) updateData.ZoneID = ZoneID;
                if (IsActive !== undefined) updateData.IsActive = IsActive;

                if (Object.keys(updateData).length > 0) {
                    return Seat.update(updateData, { where: { SeatID }, transaction: t });
                }
                return Promise.resolve();
            });

            await Promise.all(updatePromises);
        });

        res.json({ message: "Seat configurations updated successfully" });

    } catch (error: any) {
        console.error("UPDATE SEAT ZONES ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};
