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

        const cleanName = roomName.trim();

        // Extract block (first word), remove any digits to fix "EH1" -> "EH"
        let blockCode = cleanName.split(" ")[0] || "MAIN";
        blockCode = blockCode.replace(/\d+/g, "");
        if (!blockCode) blockCode = "MAIN";

        // Extract first number in string
        const roomNumberMatch = cleanName.match(/\d+/);
        const roomNumber = roomNumberMatch ? parseInt(roomNumberMatch[0], 10) : null;
        
        let floor = 1;
        if (roomNumber !== null) {
            floor = Math.floor(roomNumber / 100);
            if (floor <= 0) floor = 1;
        }

        console.log("Parsed Room:", { original: roomName, block: blockCode, roomNumber, floor });
        return { block: blockCode, roomNumber, floor };
    }

    /**
     * Helper: Identify if headers contain the detailed Excel format
     * with "Room Number with block" or similar merged header format
     */
    private parseUnifiedFile(fileBuffer: Buffer): { roomName: string; block?: string; floor?: number; rowLayout: number[]; totalCapacity: number; seatsPerBench: number }[] {
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("No sheets found in file");

        const sheet = workbook.Sheets[sheetName];
        if (!sheet) throw new Error("Sheet not found");

        const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
        if (!rawRows || rawRows.length === 0) throw new Error("File is empty or invalid format.");

        const results: { roomName: string; block?: string; floor?: number; rowLayout: number[]; totalCapacity: number; seatsPerBench: number }[] = [];
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
                    // Match headers like "Row A", "A", "row a"
                    const normalize = (key: string) => key.toLowerCase().trim();
                    const normHeader = normalize(val);
                    if (normHeader === 'a' || normHeader === 'row a') colMap.set('row a', c);
                    else if (normHeader === 'b' || normHeader === 'row b') colMap.set('row b', c);
                    else if (normHeader === 'c' || normHeader === 'row c') colMap.set('row c', c);
                    else if (normHeader === 'd' || normHeader === 'row d') colMap.set('row d', c);
                    else if (normHeader === 'e' || normHeader === 'row e') colMap.set('row e', c);
                    else if (normHeader === 'f' || normHeader === 'row f') colMap.set('row f', c);
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
            let rTotalCapacity = 0;

            const safeNumber = (v: any) => {
                if (v === null || v === undefined || v === '') return 0;
                const n = Number(String(v).replace(/[^\d.-]/g, ''));
                return isNaN(n) ? 0 : n;
            };

            let excelCapacity = capColIdx !== -1 ? safeNumber(row[capColIdx]) : 0;
            let rSeatsPerBench = 2;

            if (colMap.size > 0) {
                const rowKeys = ["row a","row b","row c","row d","row e","row f"];
                
                rowLayout = rowKeys.map(k => {
                    const cIdx = colMap.get(k);
                    if (cIdx === undefined) return 0;
                    return safeNumber(row[cIdx]);
                });

                // Trim trailing zeros from rowLayout to keep it clean, but keep internal zeros for irregular layouts
                let lastValidIndex = -1;
                for (let i = 0; i < rowLayout.length; i++) {
                    if ((rowLayout[i] ?? 0) > 0) lastValidIndex = i;
                }

                if (lastValidIndex !== -1) {
                    rowLayout = rowLayout.slice(0, lastValidIndex + 1);
                } else {
                    rowLayout = [];
                }
                
                const totalBenches = rowLayout.reduce((a,b) => a+b, 0);

                // EDGE CASE 1: All rows = 0 -> skip
                if (totalBenches === 0) continue;

                // Edge case 3: missing capacity -> compute
                if (excelCapacity === 0) {
                    excelCapacity = totalBenches * 2;
                }
                
                rTotalCapacity = excelCapacity;

                // EDGE CASE 2: Capacity 0 -> skip
                if (rTotalCapacity === 0) continue;

                // STEP 4: Determine SeatsPerBench
                if (rTotalCapacity === totalBenches) {
                    rSeatsPerBench = 1;
                } else {
                    rSeatsPerBench = 2;
                }

                // STEP 5: Validation
                const expectedCapacity = totalBenches * rSeatsPerBench;
                if (expectedCapacity !== rTotalCapacity) {
                    console.warn(`Capacity mismatch for Room ${roomName}. Expected ${expectedCapacity}, got ${rTotalCapacity}`);
                }
            } else {
                 if (excelCapacity === 0) continue;
                 rTotalCapacity = excelCapacity;
            }

            if (rowLayout.length > 6) rowLayout = rowLayout.slice(0, 6);

            console.log("ROOM:", roomName);
            console.log("ROWS:", rowLayout);
            console.log("CAPACITY:", rTotalCapacity);
            console.log("SEATS/BENCH:", rSeatsPerBench);

            const res:any = { roomName, rowLayout, totalCapacity: rTotalCapacity, seatsPerBench: rSeatsPerBench };
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

            for (const item of parsedData) {
                const parsed = this.parseRoomCode(item.roomName);
                
                const blockName = item.block || parsed.block;
                let floorNum = item.floor !== undefined ? item.floor : parsed.floor;
                
                const roomCode = item.roomName; // keep full name exactly as provided

                const isExamUsable = true;
                const seatsPerBench = item.seatsPerBench || 2;

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

                const totalSeats = item.totalCapacity;
                const roomType = totalSeats <= 80 ? 'ROOM' : 'HALL';

                if (!existingRoom) {
                    const newRoom = await Room.create(
                        {
                            RoomCode: roomCode,
                            BlockID: blockId,
                            FloorID: floorId,
                            TotalCapacity: totalSeats,
                            ExamUsable: isExamUsable,
                            Status: 'Active',
                            RoomType: roomType,
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
                    // Update existing room if totalCapacity or layout changed     
                    let needsUpdate = false;

                    if (existingRoom.TotalCapacity !== totalSeats) {
                        existingRoom.TotalCapacity = totalSeats;
                        needsUpdate = true;
                    }
                    if (existingRoom.RoomType !== roomType) {
                        existingRoom.RoomType = roomType;
                        needsUpdate = true;
                    }
                    if (existingRoom.SeatsPerBench !== seatsPerBench) {
                        existingRoom.SeatsPerBench = seatsPerBench;
                        needsUpdate = true;
                    }

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







