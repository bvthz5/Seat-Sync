import { Request, Response } from "express";
import { sequelize } from "../config/database.js";
import { InternalBlock } from "../models/InternalBlock.js";
import { InternalFloor } from "../models/InternalFloor.js";
import { InternalRoom } from "../models/InternalRoom.js";
import { InternalSeat } from "../models/InternalSeat.js";
import { Op } from "sequelize";

// ─── Seat Engine ────────────────────────────────────────────────────────────

/**
 * generateInternalSeats — generates InternalSeat rows from InternalRoom.RowLayout.
 * Row label = A, B, C... (one per RowLayout entry)
 * BenchNumber = 1..N within that row
 * SeatNumber = 1 (Left) or 2 (Right) when SeatsPerBench=2
 *
 * Non-destructive: adds new seats, marks surplus inactive.
 */
async function generateInternalSeats(room: InternalRoom, transaction?: any): Promise<void> {
  const roomId = room.RoomID;
  const layout: number[] = Array.isArray(room.RowLayout) ? room.RowLayout : [];
  const seatsPerBench = room.SeatsPerBench || 2;

  const expectedSeats: { RowLabel: string; BenchNumber: number; SeatNumber: number }[] = [];
  layout.forEach((benchCount, rowIdx) => {
    const rowLabel = String.fromCharCode(65 + rowIdx); // A, B, C...
    for (let b = 1; b <= benchCount; b++) {
      for (let s = 1; s <= seatsPerBench; s++) {
        expectedSeats.push({ RowLabel: rowLabel, BenchNumber: b, SeatNumber: s });
      }
    }
  });

  // Load existing seats
  const existingSeats = await InternalSeat.findAll({ where: { RoomID: roomId }, transaction });
  const existingKeys = new Set(existingSeats.map(s => `${s.RowLabel}-${s.BenchNumber}-${s.SeatNumber}`));
  const expectedKeys = new Set(expectedSeats.map(s => `${s.RowLabel}-${s.BenchNumber}-${s.SeatNumber}`));

  // Create missing seats
  const toCreate = expectedSeats.filter(s => !existingKeys.has(`${s.RowLabel}-${s.BenchNumber}-${s.SeatNumber}`));
  if (toCreate.length > 0) {
    await InternalSeat.bulkCreate(toCreate.map(s => ({ ...s, RoomID: roomId, IsActive: true })), { transaction });
  }

  // Deactivate surplus seats (seats that no longer exist in the layout)
  const surplus = existingSeats.filter(s => !expectedKeys.has(`${s.RowLabel}-${s.BenchNumber}-${s.SeatNumber}`));
  if (surplus.length > 0) {
    await InternalSeat.update(
      { IsActive: false },
      { where: { SeatID: { [Op.in]: surplus.map(s => s.SeatID) } }, transaction }
    );
  }

  // Reactivate seats that are now back in layout
  await InternalSeat.update(
    { IsActive: true },
    { 
      where: { RoomID: roomId, RowLabel: { [Op.in]: [...expectedKeys].map(k => k.split('-')[0]).filter(Boolean) as string[] } },
      transaction 
    }
  );
}

// ─── BLOCKS ─────────────────────────────────────────────────────────────────

export const getInternalBlocks = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
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
      include: [{ model: InternalBlock, attributes: ["BlockName"] }],
      limit, offset,
      order: [["BlockID", "ASC"], ["FloorNumber", "ASC"]],
    });

    res.json({ total: count, pages: Math.ceil(count / limit), currentPage: page, data: rows });
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
        { model: InternalBlock, attributes: ["BlockName"] },
        { model: InternalFloor, attributes: ["FloorNumber"] },
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

    const finalLayout: number[] = RowLayout || [];
    const spb = SeatsPerBench || 2;
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
      await generateInternalSeats(room);
    }

    res.status(201).json(room);
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
        const existing = await InternalRoom.findOne({ where: { RoomCode: r.roomCode, FloorID: floorId }, transaction: t });
        if (existing) continue; // Skip duplicates silently

        const created = await InternalRoom.create({
          BlockID: blockId,
          FloorID: floorId,
          RoomCode: r.roomCode,
          TotalCapacity: r.TotalCapacity || 0,
          ExamUsable: true,
          Status: "Active",
          RowLayout: [],
          SeatsPerBench: 2,
        } as any, { transaction: t });
      }
    });

    res.status(201).json({ message: "Rooms created successfully" });
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
    // Update layout if provided
    if (RowLayout !== undefined || SeatsPerBench !== undefined) {
      const newLayout = RowLayout !== undefined ? RowLayout : room.RowLayout;
      const newSpb = SeatsPerBench !== undefined ? Number(SeatsPerBench) : room.SeatsPerBench;
      room.RowLayout = newLayout;
      room.SeatsPerBench = newSpb;
      
      // If TotalCapacity is also provided, respect it. 
      // Otherwise, update TotalCapacity based on the new layout.
      if (TotalCapacity !== undefined) {
        room.TotalCapacity = TotalCapacity;
      } else if (Array.isArray(newLayout) && newLayout.length > 0) {
        room.TotalCapacity = newLayout.reduce((a: number, b: number) => a + b, 0) * newSpb;
      }
      regenerate = true;
    } else if (TotalCapacity !== undefined) {
      // No layout change, just updating capacity manually
      room.TotalCapacity = TotalCapacity;
    }

    await room.save();
    if (regenerate) await generateInternalSeats(room);

    res.json({ room, seatsUpdated: regenerate });
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

    // Consistency check
    if (room.RowLayout && Array.isArray(room.RowLayout) && room.SeatsPerBench) {
      const expected = room.RowLayout.reduce((sum: number, n: number) => sum + n, 0) * room.SeatsPerBench;
      if (seats.length !== expected) {
        await generateInternalSeats(room);
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
    await generateInternalSeats(room);

    res.json({ message: "Layout updated and seats regenerated", room });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateInternalSeatStates = async (req: Request, res: Response) => {
  try {
    const roomId = Number(req.params.id);
    const { updates } = req.body; // Array of { SeatID, IsActive }

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

// ─── DELETE ALL ───────────────────────────────────────────────────────────────

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

// ─── BULK IMPORT ──────────────────────────────────────────────────────────────

export const importInternalStructure = async (req: Request, res: Response) => {
  try {
    const { data } = req.body as {
      data: { BlockName?: string; FloorNumber?: string | number; RoomCode: string; Capacity: string | number }[]
    };

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ message: "No data provided" });
    }

    let blocksCreated = 0;
    let floorsCreated = 0;
    let roomsCreated = 0;

    const blockCache = new Map<string, number>();
    const floorCache = new Map<string, number>();

    await sequelize.transaction(async (t) => {
      for (const row of data) {
        const rawCode = String(row.RoomCode || "").trim();
        if (!rawCode || rawCode.toUpperCase().includes("DISREGARD")) continue;

        // --- 1. Intelligent Normalization & Regex Splitting ---
        // Rule: Capture FIRST alphabetic token as Block, everything else as Room
        let blockName = "";
        let roomCode = "";

        const splitMatch = rawCode.match(/^([A-Za-z]+)\s*(.*)$/);
        if (splitMatch) {
          blockName = (splitMatch[1] || "").toUpperCase().trim();
          roomCode = (splitMatch[2] || "").trim() || rawCode;
        } else {
          blockName = "MISC";
          roomCode = rawCode;
        }

        // --- 2. Automatic Floor Deduction ---
        let floorNum = 0;
        // Standard rooms (starts with 105, 202 etc) -> floor = Math.floor(room / 100)
        // Special rooms (e.g. 19 (DRAWING HALL)) -> floor = 0 (Ground)
        const standardNumMatch = roomCode.match(/^(\d{3,})/); // 100 or above
        if (standardNumMatch) {
          const num = parseInt(standardNumMatch[1] || "0");
          floorNum = Math.floor(num / 100);
        } else {
          floorNum = 0; // Ground floor for special rooms or small room numbers
        }

        // Override if FloorNumber explicitly provided in Excel
        if (row.FloorNumber !== undefined && row.FloorNumber !== null && String(row.FloorNumber).trim() !== "") {
          floorNum = parseInt(String(row.FloorNumber)) || 0;
        }

        const capacity = parseInt(String(row.Capacity || "0")) || 0;

        // --- 3. Deduplicated Block Creation ---
        let blockId = blockCache.get(blockName);
        if (!blockId) {
          let block = await InternalBlock.findOne({ where: { BlockName: blockName }, transaction: t });
          if (!block) {
            block = await InternalBlock.create({ BlockName: blockName, Status: "Active" }, { transaction: t });
            blocksCreated++;
          }
          blockId = block.BlockID;
          blockCache.set(blockName, blockId);
        }

        // --- 4. Deduplicated Floor Creation ---
        const floorKey = `${blockId}-${floorNum}`;
        let floorId = floorCache.get(floorKey);
        if (!floorId) {
          let floor = await InternalFloor.findOne({ where: { BlockID: blockId, FloorNumber: floorNum }, transaction: t });
          if (!floor) {
            floor = await InternalFloor.create({ BlockID: blockId, FloorNumber: floorNum, Status: "Active" }, { transaction: t });
            floorsCreated++;
          }
          floorId = floor.FloorID;
          floorCache.set(floorKey, floorId);
        }

        // --- 5. Room & Auto-Layout Generation ---
        const existingRoom = await InternalRoom.findOne({ where: { RoomCode: roomCode, FloorID: floorId }, transaction: t });
        
        // Seating Layout Logic (Production Grade)
        const spb = 2; // Fixed Dual Mode for Internal
        const totalBenches = Math.ceil(capacity / spb);
        const benchesPerRow = capacity > 100 ? 10 : 6; 
        const rowCount = Math.ceil(totalBenches / benchesPerRow);
        
        const layout: number[] = [];
        let remaining = totalBenches;
        for (let i = 0; i < rowCount; i++) {
          const take = Math.min(remaining, benchesPerRow);
          layout.push(take);
          remaining -= take;
        }

        if (!existingRoom) {
          const room = await InternalRoom.create({
            BlockID: blockId,
            FloorID: floorId,
            RoomCode: roomCode,
            TotalCapacity: capacity,
            RowLayout: layout,
            SeatsPerBench: spb,
            RoomType: "Classroom", // Internal only
            SeatMode: "Dual",
            ExamUsable: true,
            Status: "Active",
          } as any, { transaction: t });
          
          if (layout.length > 0) {
            await generateInternalSeats(room, t);
          }
          roomsCreated++;
        } else {
          // Update existing room structure
          existingRoom.TotalCapacity = capacity;
          existingRoom.RowLayout = layout;
          existingRoom.SeatsPerBench = spb;
          await existingRoom.save({ transaction: t });
          await generateInternalSeats(existingRoom, t);
        }
      }
    });

    res.json({ blocksCreated, floorsCreated, roomsCreated });
  } catch (error: any) {
    console.error("INTERNAL IMPORT ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};
