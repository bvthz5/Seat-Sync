import { Request, Response } from "express";
import { Block } from "../models/Block.js";
import { Floor } from "../models/Floor.js";
import { Room } from "../models/Room.js";
import { Seat } from "../models/Seat.js";
import { Exam } from "../models/Exam.js";
import { SeatAllocation } from "../models/SeatAllocation.js";
import { Op } from "sequelize";

// --- BLOCKS ---

export const getBlocks = async (req: Request, res: Response) => {
    try {
        const blocks = await Block.findAll();

        const responseData = await Promise.all(blocks.map(async (block) => {
            const floorCount = await Floor.count({ where: { BlockID: block.BlockID } });
            return {
                ...block.toJSON(),
                floorCount,
            };
        }));

        res.json(responseData);
    } catch (error: any) {
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
        const blockId = req.query.blockId ? Number(req.query.blockId) : undefined;
        const whereClause = blockId ? { BlockID: blockId } : {};

        const floors = await Floor.findAll({
            where: whereClause,
            include: [{ model: Block, attributes: ['BlockName'] }]
        });
        res.json(floors);
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
        const floorId = req.query.floorId ? Number(req.query.floorId) : undefined;

        let whereClause = {};
        let includeOptions: any[] = [{ model: Floor, include: [Block] }];

        if (floorId) {
            whereClause = { FloorID: floorId };
        }

        const rooms = await Room.findAll({
            where: whereClause,
            include: includeOptions
        });
        res.json(rooms);
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
            where: { RoomID: roomId },
            order: [
                ['RowLabel', 'ASC'],
                ['BenchNumber', 'ASC'],
                ['SeatNumber', 'ASC']
            ]
        });

        res.json({
            room,
            seats,
            seatCount: seats.length
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createRoom = async (req: Request, res: Response) => {
    try {
        const { BlockID, FloorID, RoomCode, ExamUsable, Status, TotalRows, BenchesPerRow, SeatsPerBench, Capacity } = req.body;

        const existing = await Room.findOne({ where: { RoomCode } });
        if (existing) return res.status(400).json({ message: "Room Code/Name must be unique" });

        const room = await Room.create({
            BlockID,
            FloorID,
            RoomCode,
            ExamUsable: ExamUsable ?? false,
            Status: Status ?? 'Active',
            Capacity: Capacity || 0,
            TotalRows: TotalRows || 0,
            BenchesPerRow: BenchesPerRow || 0,
            SeatsPerBench: SeatsPerBench || 0
        });

        if (TotalRows > 0 && BenchesPerRow > 0 && SeatsPerBench > 0) {
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
        const { RoomCode, Status, ExamUsable, TotalRows, BenchesPerRow, SeatsPerBench, Capacity } = req.body;

        const room = await Room.findByPk(id);
        if (!room) return res.status(404).json({ message: "Room not found" });

        // ... Layout check ...
        const isLayoutChange = (
            TotalRows !== undefined && TotalRows !== room.TotalRows ||
            BenchesPerRow !== undefined && BenchesPerRow !== room.BenchesPerRow ||
            SeatsPerBench !== undefined && SeatsPerBench !== room.SeatsPerBench
        );

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

        let shouldRegenerateSeats = false;
        if (isLayoutChange) {
            room.TotalRows = TotalRows;
            room.BenchesPerRow = BenchesPerRow;
            room.SeatsPerBench = SeatsPerBench;
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

const generateSeats = async (room: Room) => {
    await Seat.destroy({ where: { RoomID: room.RoomID } });

    const seats = [];
    for (let r = 1; r <= room.TotalRows; r++) {
        const rowLabel = String.fromCharCode(64 + r);
        for (let b = 1; b <= room.BenchesPerRow; b++) {
            for (let s = 1; s <= room.SeatsPerBench; s++) {
                seats.push({
                    RoomID: room.RoomID,
                    RowLabel: rowLabel,
                    BenchNumber: b,
                    SeatNumber: s
                });
            }
        }
    }

    if (seats.length > 0) {
        await Seat.bulkCreate(seats);
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
