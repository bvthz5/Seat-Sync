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
    private parseRoomCode(roomStr: string): { block: string; roomNumber: number; floor: number } {
        if (!roomStr || typeof roomStr !== "string") {
            return { block: "MAIN", roomNumber: 0, floor: 0 };
        }
        
        const trimmed = roomStr.trim();
        let block = "MAIN";
        let roomNumber = 0;
        
        const match = trimmed.match(/^(?:room\s+)?(?:block\s+)?([a-zA-Z]+)(?:\s+room)?\s*[-_#]*\s*(\d+)$/i);
        const validBlockMatch = match && match[1] && match[2] && !/^(room|block)$/i.test(match[1]);
        
        if (validBlockMatch && match && match[1] && match[2]) {
            block = match[1].toUpperCase();
            roomNumber = parseInt(match[2], 10);
        } else {
            const numMatch = trimmed.match(/(\d+)/);
            if (numMatch && numMatch[1]) roomNumber = parseInt(numMatch[1], 10);
            
            const alphaMatch = trimmed.match(/([a-zA-Z]+)/g);
            if (alphaMatch) {
                const validAlpha = alphaMatch.find(i => !/^(room|block)$/i.test(i));
                if (validAlpha) block = validAlpha.toUpperCase();
            }
        }
        
        const floor = Math.floor(roomNumber / 100);
        
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

        let rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: null });
        if (!rows || rows.length === 0) throw new Error("File is empty or invalid format.");

        const results: { roomName: string; block?: string; floor?: number; rowLayout: number[]; capacity: number }[] = [];
        const seenRooms = new Set<string>();

        const firstRowHeaders = Object.keys(rows[0]);
        const colMap = new Map<string, string>();
        for (const h of firstRowHeaders) {
             const m = h.toLowerCase().trim().match(/^(?:row\s*)?([a-f])$/i);
             if (m && m[1]) colMap.set(m[1].toLowerCase(), h);
        }

        let roomCol = firstRowHeaders.find(h => h.toLowerCase().includes('room') || h.toLowerCase() === 'code' || h.toLowerCase() === 'roomcode' || h.toLowerCase() === 'roomname');
        let capCol = firstRowHeaders.find(h => h.toLowerCase().includes('capacit') || h.toLowerCase() === 'seats' || h.toLowerCase() === 'cap');
        let blockCol = firstRowHeaders.find(h => h.toLowerCase().includes('block') || h.toLowerCase() === 'building');
        let floorCol = firstRowHeaders.find(h => h.toLowerCase().includes('floor') || h.toLowerCase() === 'level');

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const lineNum = i + 2;

            if (Object.keys(row).every(k => !row[k])) continue;

            const disregardTypes = Object.values(row).some(v => typeof v === 'string' && v.includes('//Disregard//'));
            if (disregardTypes) continue;

            let roomVal = roomCol ? row[roomCol] : (row['RoomCode'] || row['RoomName'] || row['Code']);
            let capVal = capCol ? row[capCol] : (row['Capacity'] || row['Cap']);
            let blockVal = blockCol ? row[blockCol] : (row['BlockName'] || row['Block']);
            let floorVal = floorCol ? row[floorCol] : (row['FloorNumber'] || row['Floor']);

            if (!roomVal && !capVal) continue;
            
            let roomName = String(roomVal || '').trim();
            if (!roomName) continue;

            let blockStr = blockVal ? String(blockVal).trim().toUpperCase() : undefined;
            let floorNum = floorVal !== null && floorVal !== undefined && !isNaN(Number(floorVal)) ? Math.floor(Number(floorVal)) : undefined;

            if (seenRooms.has(roomName.toLowerCase())) {
                throw new Error(`Row ${lineNum}: Duplicate room name '${roomName}'`);
            }
            seenRooms.add(roomName.toLowerCase());

            let rowLayout: number[] = [];
            let rCapacity = 0;
            if (colMap.size > 0) {
               for (const char of ['a', 'b', 'c', 'd', 'e', 'f']) {
                  if (colMap.has(char)) {
                     const val = row[colMap.get(char)!];
                     const benches = val === null || val === undefined ? 0 : Number(val) || 0;
                     rowLayout.push(benches);
                     rCapacity += benches * 2;
                  }
               }
            } else {
               const cap = parseInt(capVal) || 0;
               if (cap > 0) {
                   const benches = Math.ceil(cap / 2);
                   const cols = Math.min(benches, 3);
                   if (cols > 0) {
                       const rowSize = Math.floor(benches / cols);
                       for (let c = 0; c < cols; c++) rowLayout.push(rowSize);
                       const rem = benches % cols;
                       if (rem > 0 && rowLayout.length > 0) {
                           rowLayout[0] = (rowLayout[0] || 0) + rem;
                       }
                   }
                   rCapacity = cap;
               }
            }

            if (rowLayout.length > 6) {
                rowLayout = rowLayout.slice(0, 6);
            }

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
                
                let roomCode = item.roomName;
                if (!item.roomName.includes(blockName)) {
                    const roomNumber = parsed.roomNumber > 0 ? parsed.roomNumber : (parseInt(item.roomName.replace(/\D/g, '')) || 0);
                    if (roomNumber > 0) {
                        roomCode = `${blockName} - ${roomNumber}`;
                    }
                }

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
                    { where: { RoomCode: roomCode, FloorID: floorId }, transaction }
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







