import { Request, Response } from "express";
import { sequelize } from "../config/database.js";
import { InternalBlock } from "../models/InternalBlock.js";
import { InternalFloor } from "../models/InternalFloor.js";
import { InternalRoom } from "../models/InternalRoom.js";
import { InternalSeat } from "../models/InternalSeat.js";
import { Op } from "sequelize";
import { InternalInfrastructureImportService } from "../services/internal/internalInfrastructureImport.service.js";
import { InternalLayoutGeneratorService } from "../services/internal/internalLayoutGenerator.service.js";

// ─── Seat Engine ────────────────────────────────────────────────────────────

// ─── BLOCKS ─────────────────────────────────────────────────────────────────

export const getInternalBlocks = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 100; // Increased default limit for admin dropdowns
    const search = req.query.search as string;
    const status = req.query.status as string;
    const offset = (page - 1) * limit;

    const where: any = {};
    if (search) where.BlockName = { [Op.like]: `%${search}%` };
    if (status) where.Status = status;

    const { count, rows } = await InternalBlock.findAndCountAll({
      where, limit, offset, order: [["BlockName", "ASC"]],
    });

    const data = await Promise.all(rows.map(async (block) => {
      const floorCount = await InternalFloor.count({ where: { BlockID: block.BlockID } });
      return { ...block.toJSON(), floorCount };
    }));

    res.json({ total: count, pages: Math.ceil(count / limit), currentPage: page, data });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createInternalBlock = async (req: Request, res: Response) => {
  try {
    const { BlockName, Status } = req.body;
    const existing = await InternalBlock.findOne({ where: { BlockName } });
    if (existing) return res.status(400).json({ message: "Block Name must be unique" });
    const block = await InternalBlock.create({ BlockName, Status: Status || "Active" });
    res.status(201).json(block);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateInternalBlock = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { BlockName, Status } = req.body;
    const block = await InternalBlock.findByPk(id);
    if (!block) return res.status(404).json({ message: "Block not found" });
    if (BlockName !== block.BlockName) {
      const existing = await InternalBlock.findOne({ where: { BlockName } });
      if (existing) return res.status(400).json({ message: "Block Name already taken" });
    }
    block.BlockName = BlockName;
    if (Status) block.Status = Status;
    await block.save();
    res.json(block);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteInternalBlock = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const rooms = await InternalRoom.findAll({ where: { BlockID: id }, attributes: ["RoomID"] });
    const roomIds = rooms.map((r: any) => r.RoomID);

    await sequelize.transaction(async (t) => {
      if (roomIds.length > 0) {
        await InternalSeat.destroy({ where: { RoomID: { [Op.in]: roomIds } }, transaction: t });
      }
      await InternalRoom.destroy({ where: { BlockID: id }, transaction: t });
      await InternalFloor.destroy({ where: { BlockID: id }, transaction: t });
      await InternalBlock.destroy({ where: { BlockID: id }, transaction: t });
    });

    res.json({ message: "Block deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── FLOORS ─────────────────────────────────────────────────────────────────

export const getInternalFloors = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const blockId = req.query.blockId ? Number(req.query.blockId) : undefined;
    const status = req.query.status as string;
    const search = req.query.search as string;
    const offset = (page - 1) * limit;

    const where: any = {};
    if (blockId) where.BlockID = blockId;
    if (status) where.Status = status;
    if (search && !isNaN(Number(search))) where.FloorNumber = Number(search);

    const { count, rows } = await InternalFloor.findAndCountAll({
      where,
      include: [{ model: InternalBlock, as: 'Block', attributes: ["BlockName"] }],
      limit, offset,
      order: [["BlockID", "ASC"], ["FloorNumber", "ASC"]],
    });

    res.json({ total: count, pages: Math.ceil(count / limit), currentPage: page, data: rows });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getFloorsByBlock = async (req: Request, res: Response) => {
  try {
    const blockId = Number(req.params.blockId);
    const floors = await InternalFloor.findAll({
      where: { BlockID: blockId },
      order: [["FloorNumber", "ASC"]]
    });
    res.json(floors);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createInternalFloor = async (req: Request, res: Response) => {
  try {
    const { BlockID, FloorNumber, Status } = req.body;
    const existing = await InternalFloor.findOne({ where: { BlockID, FloorNumber } });
    if (existing) return res.status(400).json({ message: "Floor Number already exists in this block" });
    const floor = await InternalFloor.create({ BlockID, FloorNumber, Status: Status || "Active" });
    res.status(201).json(floor);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateInternalFloor = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { FloorNumber, Status } = req.body;
    const floor = await InternalFloor.findByPk(id);
    if (!floor) return res.status(404).json({ message: "Floor not found" });

    if (FloorNumber !== floor.FloorNumber) {
      const existing = await InternalFloor.findOne({ where: { BlockID: floor.BlockID, FloorNumber } });
      if (existing) return res.status(400).json({ message: "Floor Number already exists in this block" });
    }

    if (Status === "Inactive" && floor.Status === "Active") {
      const activeRooms = await InternalRoom.count({ where: { FloorID: id, Status: "Active" } });
      if (activeRooms > 0) return res.status(400).json({ message: "Cannot disable floor with active rooms." });
    }

    if (FloorNumber !== undefined) floor.FloorNumber = FloorNumber;
    if (Status !== undefined) floor.Status = Status;
    await floor.save();
    res.json(floor);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteInternalFloor = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const rooms = await InternalRoom.findAll({ where: { FloorID: id }, attributes: ["RoomID"] });
    const roomIds = rooms.map((r: any) => r.RoomID);

    await sequelize.transaction(async (t) => {
      if (roomIds.length > 0) {
        await InternalSeat.destroy({ where: { RoomID: { [Op.in]: roomIds } }, transaction: t });
      }
      await InternalRoom.destroy({ where: { FloorID: id }, transaction: t });
      await InternalFloor.destroy({ where: { FloorID: id }, transaction: t });
    });

    res.json({ message: "Floor deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── ROOMS ───────────────────────────────────────────────────────────────────

export const getInternalRooms = async (req: Request, res: Response) => {
  try {
    const { search, status, blockId, floorId, page, limit } = req.query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) where.RoomCode = { [Op.like]: `%${search}%` };
    if (status) where.Status = status;
    if (blockId) where.BlockID = parseInt(blockId as string);
    if (floorId) where.FloorID = parseInt(floorId as string);

    const { count, rows } = await InternalRoom.findAndCountAll({
      where,
      include: [
        { model: InternalBlock, as: 'Block', attributes: ["BlockName"] },
        { model: InternalFloor, as: 'Floor', attributes: ["FloorNumber"] },
      ],
      limit: limitNum,
      offset,
      order: [["RoomCode", "ASC"]],
    });

    res.json({ data: rows, total: count, pages: Math.ceil(count / limitNum), currentPage: pageNum });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createInternalRoom = async (req: Request, res: Response) => {
  try {
    const { BlockID, FloorID, RoomCode, ExamUsable, Status, TotalCapacity, RowLayout, SeatsPerBench, OverrideCap, RoomType, SeatMode } = req.body;

    const existing = await InternalRoom.findOne({ where: { RoomCode, FloorID } });
    if (existing) return res.status(400).json({ message: "Room Code must be unique in this floor" });

    const spb = SeatsPerBench || 2;
    const finalLayout: number[] = RowLayout || InternalLayoutGeneratorService.generateRowLayout(TotalCapacity || 0);
    const calcCapacity = TotalCapacity || finalLayout.reduce((a: number, b: number) => a + b, 0) * spb;

    const room = await InternalRoom.create({
      BlockID, FloorID, RoomCode,
      RoomType: RoomType || "Classroom",
      ExamUsable: ExamUsable ?? true,
      Status: Status ?? "Active",
      TotalCapacity: calcCapacity,
      RowLayout: finalLayout,
      SeatsPerBench: spb,
      SeatMode: SeatMode || "Dual",
      OverrideCap: OverrideCap ?? null,
    } as any);

    if (finalLayout.length > 0) {
      await InternalLayoutGeneratorService.generateSeats(room as any, undefined as any);
    }

    res.status(201).json(room);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateInternalRoom = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const room = await InternalRoom.findByPk(id) as any;
    if (!room) return res.status(404).json({ message: "Room not found" });

    const RoomCode = req.body.RoomCode || req.body.roomCode;
    const Status = req.body.Status || req.body.status;
    const ExamUsable = req.body.ExamUsable !== undefined ? req.body.ExamUsable : req.body.examUsable;
    const TotalCapacity = req.body.TotalCapacity !== undefined ? Number(req.body.TotalCapacity) : undefined;
    const RowLayout = req.body.RowLayout || req.body.rowLayout;
    const SeatsPerBench = req.body.SeatsPerBench !== undefined ? req.body.SeatsPerBench : req.body.seatsPerBench;
    const OverrideCap = req.body.OverrideCap !== undefined ? req.body.OverrideCap : req.body.overrideCap;
    const RoomType = req.body.RoomType || req.body.roomType;
    const SeatMode = req.body.SeatMode || req.body.seatMode;

    if (RoomCode) room.RoomCode = RoomCode;
    if (Status) room.Status = Status;
    if (ExamUsable !== undefined) room.ExamUsable = ExamUsable;
    if (OverrideCap !== undefined) room.OverrideCap = OverrideCap;
    if (RoomType) room.RoomType = RoomType;
    if (SeatMode) room.SeatMode = SeatMode;

    let regenerate = false;
    if (RowLayout !== undefined || SeatsPerBench !== undefined) {
      const newLayout = RowLayout !== undefined ? RowLayout : room.RowLayout;
      const newSpb = SeatsPerBench !== undefined ? Number(SeatsPerBench) : room.SeatsPerBench;
      room.RowLayout = newLayout;
      room.SeatsPerBench = newSpb;

      if (TotalCapacity !== undefined) {
        room.TotalCapacity = TotalCapacity;
      } else if (Array.isArray(newLayout) && newLayout.length > 0) {
        room.TotalCapacity = newLayout.reduce((a: number, b: number) => a + b, 0) * newSpb;
      }
      regenerate = true;
    } else if (TotalCapacity !== undefined) {
      room.TotalCapacity = TotalCapacity;
    }

    await room.save();
    if (regenerate) await InternalLayoutGeneratorService.generateSeats(room);

    res.json({ room, seatsUpdated: regenerate });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const bulkCreateInternalRooms = async (req: Request, res: Response) => {
  try {
    const { blockId, floorId, rooms } = req.body;
    if (!Array.isArray(rooms)) return res.status(400).json({ message: "rooms must be an array" });

    await sequelize.transaction(async (t) => {
      for (const r of rooms) {
        const existing = await InternalRoom.findOne({ where: { RoomCode: r.code, FloorID: floorId }, transaction: t });
        if (existing) continue;

        const created = await InternalRoom.create({
          BlockID: blockId,
          FloorID: floorId,
          RoomCode: r.code,
          TotalCapacity: Number(r.capacity) || 0,
          ExamUsable: true,
          Status: "Active",
          RowLayout: InternalLayoutGeneratorService.generateRowLayout(Number(r.capacity) || 0),
          SeatsPerBench: 2,
        } as any, { transaction: t });

        await InternalLayoutGeneratorService.generateSeats(created as any, t);
      }
    });

    res.status(201).json({ message: "Rooms created successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const disableInternalRoom = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const room = await InternalRoom.findByPk(id);
    if (!room) return res.status(404).json({ message: "Room not found" });
    room.Status = "Inactive";
    room.ExamUsable = false;
    await room.save();
    res.json({ message: "Room disabled successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const enableInternalRoom = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const room = await InternalRoom.findByPk(id);
    if (!room) return res.status(404).json({ message: "Room not found" });
    room.Status = "Active";
    room.ExamUsable = true;
    await room.save();
    res.json({ message: "Room enabled successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteInternalRoom = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await sequelize.transaction(async (t) => {
      await InternalSeat.destroy({ where: { RoomID: id }, transaction: t });
      await InternalRoom.destroy({ where: { RoomID: id }, transaction: t });
    });
    res.json({ message: "Room and associated seats deleted permanently" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── LAYOUT ──────────────────────────────────────────────────────────────────

export const getInternalRoomLayout = async (req: Request, res: Response) => {
  try {
    const roomId = Number(req.params.id);
    const room = await InternalRoom.findByPk(roomId) as any;
    if (!room) return res.status(404).json({ message: "Room not found" });

    let seats = await InternalSeat.findAll({
      where: { RoomID: roomId },
      order: [["RowLabel", "ASC"], ["BenchNumber", "ASC"], ["SeatNumber", "ASC"]],
    });

    if (room.RowLayout && Array.isArray(room.RowLayout) && room.SeatsPerBench) {
      const expected = room.RowLayout.reduce((sum: number, n: number) => sum + n, 0) * room.SeatsPerBench;
      if (seats.length !== expected) {
        await InternalLayoutGeneratorService.generateSeats(room);
        seats = await InternalSeat.findAll({
          where: { RoomID: roomId },
          order: [["RowLabel", "ASC"], ["BenchNumber", "ASC"], ["SeatNumber", "ASC"]],
        });
      }
    }

    res.json({ room, seats, seatCount: seats.length });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateInternalRoomLayout = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const room = await InternalRoom.findByPk(id) as any;
    if (!room) return res.status(404).json({ message: "Room not found" });

    const { RowLayout, SeatsPerBench } = req.body;
    if (RowLayout !== undefined) room.RowLayout = RowLayout;
    if (SeatsPerBench !== undefined) room.SeatsPerBench = Number(SeatsPerBench);

    if (room.RowLayout && Array.isArray(room.RowLayout)) {
      room.TotalCapacity = room.RowLayout.reduce((a: number, b: number) => a + b, 0) * (room.SeatsPerBench || 2);
    }
    await room.save();
    await InternalLayoutGeneratorService.generateSeats(room);

    res.json({ message: "Layout updated and seats regenerated", room });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateInternalSeatStates = async (req: Request, res: Response) => {
  try {
    const roomId = Number(req.params.id);
    const { updates } = req.body;

    if (!Array.isArray(updates)) return res.status(400).json({ message: "updates must be an array" });

    const room = await InternalRoom.findByPk(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    await sequelize.transaction(async (t) => {
      const promises = updates.map((u: any) => {
        const data: any = {};
        if (u.IsActive !== undefined) data.IsActive = u.IsActive;
        if (Object.keys(data).length > 0) {
          return InternalSeat.update(data, { where: { SeatID: u.SeatID }, transaction: t });
        }
        return Promise.resolve();
      });
      await Promise.all(promises);
    });

    res.json({ message: "Seat states updated successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── BULK IMPORT ──────────────────────────────────────────────────────────────

export const importInternalStructure = async (req: Request, res: Response) => {
  try {
    const rawData = req.body.data;
    if (!rawData) return res.status(400).json({ message: "No data provided" });

    const stats = await InternalInfrastructureImportService.importBatch(rawData);
    res.json(stats);
  } catch (error: any) {
    console.error("INTERNAL IMPORT ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteAllInternalStructureData = async (req: Request, res: Response) => {
  try {
    await sequelize.transaction(async (t) => {
      await InternalSeat.destroy({ where: {}, transaction: t });
      await InternalRoom.destroy({ where: {}, transaction: t });
      await InternalFloor.destroy({ where: {}, transaction: t });
      await InternalBlock.destroy({ where: {}, transaction: t });
    });
    res.json({ message: "All internal structure data deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
