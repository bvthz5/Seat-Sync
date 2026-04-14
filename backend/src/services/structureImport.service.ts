import * as XLSX from 'xlsx';
import { sequelize } from '../config/database.js';
import { Block } from '../models/Block.js';
import { Floor } from '../models/Floor.js';
import { Room } from '../models/Room.js';
import { generateSeats } from './seatEngine.js';

interface SheetRow {
    [key: string]: any;
}


interface ImportResult {
    blocksCreated: number;
    floorsCreated: number;
    roomsCreated: number;
    roomsUpdated?: number;
}

export class StructureImportService {
    /**
     * Helper: Extract room code and block name from "Room Number with block" format
     * Examples: "A101", "B-205", "Block A Room 101"
     */
    private parseRoomCode(roomName: string): { block: string; roomNumber: number | null; floor: number } {
        if (!roomName || typeof roomName !== "string") {
            return { block: "MAIN", roomNumber: null, floor: 1 };
        }

        const trimmed = roomName.trim();
        // Match leading letters (Block) and optional digits (Room Number)
        const match = trimmed.match(/^([A-Za-z]+)\s*[-_#]*\s*(\d+)?/);

        let block = "MAIN";
        let roomNumber: number | null = null;

        if (match && match[1]) {
            block = match[1].toUpperCase();
            if (match[2]) {
                roomNumber = parseInt(match[2], 10);
            }
        }

        // Special handling for edge cases without a direct prefix letter
        if (!match || /^(ROOM|BLOCK)$/i.test(block)) {
            const alphaMatch = trimmed.match(/([a-zA-Z]+)/g);
            if (alphaMatch) {
                const validAlpha = alphaMatch.find(i => !/^(room|block)$/i.test(i));
                if (validAlpha) block = validAlpha.toUpperCase();
            }
            const numMatch = trimmed.match(/(\d+)/);
            if (numMatch && numMatch[1]) roomNumber = parseInt(numMatch[1], 10);
        }

        let floor = 1; // Default
        if (roomNumber !== null) {
            const calcFloor = Math.floor(roomNumber / 100);
            if (calcFloor > 0) {
                floor = calcFloor;
            }
        }

        console.log("Parsed Room:", {
            original: roomName,
            block,
            roomNumber,
            floor
        });

        return { block, roomNumber, floor };
    }

    /**
     * Helper: Identify if headers contain the detailed Excel format
     * with "Room Number with block" or similar merged header format
     */
    private parseUnifiedFile(fileBuffer: Buffer): { roomName: string; block?: string; floor?: number; rowLayout: number[]; capacity: number }[] {
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("No sheets found in file");

        const sheet = workbook.Sheets[sheetName];
        if (!sheet) throw new Error("Sheet not found");

        const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
        if (!rawRows || rawRows.length === 0) throw new Error("File is empty or invalid format.");

        const results: { roomName: string; block?: string; floor?: number; rowLayout: number[]; capacity: number }[] = [];
        const seenRooms = new Set<string>();

        let roomColIdx = -1;
        let capColIdx = -1;
        let blockColIdx = -1;
        let floorColIdx = -1;
        const colMap = new Map<string, number>();

        // Scan the first 5 rows to aggressively find headers
        for (let i = 0; i < Math.min(5, rawRows.length); i++) {
            const row = rawRows[i];
            if (!row) continue;
            for (let c = 0; c < row.length; c++) {
                const val = String(row[c] || '').toLowerCase().trim();
                if (!val || val === 'null' || val === 'undefined') continue;

                if (val.includes('room') || val === 'code' || val === 'roomcode' || val === 'roomname') {
                    if (roomColIdx === -1) roomColIdx = c;
                } else if (val.includes('capacit') || val === 'seats' || val === 'cap') {
                    if (capColIdx === -1) capColIdx = c;
                } else if (val.includes('block') || val === 'building') {
                    if (blockColIdx === -1) blockColIdx = c;
                } else if (val.includes('floor') || val === 'level') {
                    if (floorColIdx === -1) floorColIdx = c;
                } else {
                    const m = val.match(/^(?:row\s*)?([a-f])$/i);
                    if (m && m[1]) {
                        colMap.set(m[1].toLowerCase(), c);
                    }
                }
            }
        }

        if (roomColIdx === -1) throw new Error("Could not detect Room column in Excel headers.");

        for (let i = 0; i < rawRows.length; i++) {
            const row = rawRows[i];
            const lineNum = i + 1;
            
            if (!row || row.length === 0 || row.every(k => k === null || String(k).trim() === '')) continue;

            const roomVal = row[roomColIdx];
            if (!roomVal || String(roomVal).toLowerCase().includes('room') || String(roomVal).toLowerCase().includes('code')) {
                continue; // Skip header row instances
            }

            const disregardTypes = row.some((v: any) => typeof v === 'string' && v.includes('//Disregard//'));
            if (disregardTypes) continue;

            let roomName = String(roomVal).trim();
            if (!roomName) continue;

            let blockStr = blockColIdx !== -1 && row[blockColIdx] ? String(row[blockColIdx]).trim().toUpperCase() : undefined;
            let floorNum = floorColIdx !== -1 && row[floorColIdx] !== null && !isNaN(Number(row[floorColIdx])) ? Math.floor(Number(row[floorColIdx])) : undefined;

            if (seenRooms.has(roomName.toLowerCase())) {
                throw new Error(`Row ${lineNum}: Duplicate room name '${roomName}'. Check your Excel entries.`);
            }
            seenRooms.add(roomName.toLowerCase());

            let rowLayout: number[] = [];
            let rCapacity = 0;
            
            if (colMap.size > 0) {
                // Execute precise map layout extraction based on detected column anchors
                for (const char of ['a', 'b', 'c', 'd', 'e', 'f']) {
                    if (colMap.has(char)) {
                        const cIdx = colMap.get(char)!;
                        const val = row[cIdx];
                        const benches = (val === null || val === undefined || String(val).trim() === '') ? 0 : Number(val) || 0;
                        rowLayout.push(benches);
                        rCapacity += benches * 2;
                    }
                }
            } else {
                // Fallback mechanism to split seats into roughly equal 3 matrices
                const capVal = capColIdx !== -1 ? row[capColIdx] : null;
                const cap = parseInt(capVal) || 0;
                if (cap > 0) {
                    const benches = Math.ceil(cap / 2);
                    const cols = Math.min(benches, 3);
                    if (cols > 0) {
                        const rowSize = Math.floor(benches / cols);
                        for (let c = 0; c < cols; c++) rowLayout.push(rowSize);
                        const rem = benches % cols;
                        if (rem > 0 && rowLayout.length > 0) rowLayout[0] = (rowLayout[0] || 0) + rem;
                    }
                    rCapacity = cap;
                }
            }

            if (rowLayout.length > 6) rowLayout = rowLayout.slice(0, 6);

            const res:any = { roomName, rowLayout, capacity: rCapacity };
            if (blockStr !== undefined) res.block = blockStr;
            if (floorNum !== undefined) res.floor = floorNum;
            results.push(res);
        }
        
        return results;
    }

    async importFromCSV(fileBuffer: Buffer, options?: { autoZone: boolean; zoneCount: number }): Promise<ImportResult> {
        let parsedData;
        try {
            parsedData = await Promise.resolve(this.parseUnifiedFile(fileBuffer));
        } catch(e) { throw e; }

        const transaction = await sequelize.transaction();
        let blocksCreated = 0;
        let floorsCreated = 0;
        let roomsCreated = 0;
        let roomsUpdated = 0;
        const roomsToZone: number[] = [];

        try {
            const blockCache = new Map<string, number>();
            const floorCache = new Map<string, number>();
            const seatsPerBench = 2;

            for (const item of parsedData) {
                const parsed = this.parseRoomCode(item.roomName);
                
                const blockName = item.block || parsed.block;
                let floorNum = item.floor !== undefined ? item.floor : parsed.floor;
                
                const roomCode = item.roomName; // keep full name exactly as provided

                const isExamUsable = true;

                let blockId = blockCache.get(blockName.toLowerCase());
                if (!blockId) {
                    let block = await Block.findOne(
                        { where: { BlockName: blockName }, transaction }
                    );
                    if (!block) {
                        block = await Block.create(
                            { BlockName: blockName, Status: 'Active' },
                            { transaction }
                        );
                        blocksCreated++;
                    }
                    const blockData = (block as any).toJSON ? (block as any).toJSON() : block;
                    blockId = blockData.BlockID;
                    blockCache.set(blockName.toLowerCase(), blockId!);
                }

                if (!blockId) throw new Error("BlockID required");

                const floorKey = `${blockId}-${floorNum}`;
                let floorId = floorCache.get(floorKey);
                if (!floorId) {
                    let floor = await Floor.findOne(
                        { where: { BlockID: blockId, FloorNumber: floorNum }, transaction }
                    );
                    if (!floor) {
                        floor = await Floor.create(
                            { BlockID: blockId, FloorNumber: floorNum, Status: 'Active' },
                            { transaction }
                        );
                        floorsCreated++;
                    }
                    const floorData = (floor as any).toJSON ? (floor as any).toJSON() : floor;
                    floorId = floorData.FloorID;
                    floorCache.set(floorKey, floorId!);
                }

                if (!floorId) throw new Error("FloorID required");

                let existingRoom = await Room.findOne(
                    { where: { RoomCode: roomCode }, transaction }
                );

                if (!existingRoom) {
                    const newRoom = await Room.create(
                        {
                            RoomCode: roomCode,
                            BlockID: blockId,
                            FloorID: floorId,
                            Capacity: item.capacity,
                            ExamUsable: isExamUsable,
                            Status: 'Active',
                            RoomType: 'ROOM',
                            LayoutType: 'CUSTOM',
                            RowLayout: item.rowLayout,
                            SeatsPerBench: seatsPerBench,
                            IsLayoutLocked: false
                        },
                        { transaction }
                    );
                    roomsCreated++;

                    // Generate exact seats inside the room transaction
                    await generateSeats(newRoom, transaction);
                    
                    if (options?.autoZone) roomsToZone.push(newRoom.RoomID);
                } else {
                    console.warn("Room already exists:", roomCode);
                    // Update existing room if capacity or layout changed
                    let needsUpdate = false;
                    
                    if (existingRoom.Capacity !== item.capacity) {
                        existingRoom.Capacity = item.capacity;
                        needsUpdate = true;
                    }

                    // Check if RowLayout explicitly differs
                    const currentLayout = existingRoom.RowLayout || [];
                    const newLayout = item.rowLayout || [];
                    let layoutChanged = currentLayout.length !== newLayout.length;
                    if (!layoutChanged) {
                        for (let i = 0; i < currentLayout.length; i++) {
                            if (currentLayout[i] !== newLayout[i]) {
                                layoutChanged = true;
                                break;
                            }
                        }
                    }

                    if (layoutChanged) {
                        existingRoom.RowLayout = newLayout;
                        needsUpdate = true;
                    }

                    if (needsUpdate) {
                        try {
                            await existingRoom.save({ transaction });
                            // Re-generate seats efficiently if properties updated
                            await generateSeats(existingRoom, transaction);
                            roomsUpdated++;
                        } catch (err) {
                            console.error('Update room error', err);
                        }
                    }

                    if (options?.autoZone) roomsToZone.push(existingRoom.RoomID);
                }
            }

            await transaction.commit();

            if (options?.autoZone && roomsToZone.length > 0) {
                const { RoomService } = await import('./room.service.js');
                const roomService = new RoomService();
                for (const rId of roomsToZone) {
                    try {
                        await roomService.autoZoneRoom(rId, options.zoneCount);
                    } catch (err: any) {
                        console.error(`AutoZoning failed for room ${rId}:`, err.message);
                    }
                }
            }

            return {
                blocksCreated,
                floorsCreated,
                roomsCreated,
                roomsUpdated
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}







