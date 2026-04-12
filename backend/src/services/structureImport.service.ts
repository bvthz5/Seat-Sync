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
}

export class StructureImportService {
    /**
     * Helper: Extract room code and block name from "Room Number with block" format
     * Examples: "A101", "B-205", "Block A Room 101"
     */
    private parseRoomNumberWithBlock(roomStr: string): { blockName: string; roomCode: string } {
        const trimmed = roomStr.trim();
        
        // Try pattern: "BlockName Room/Code" or "BlockName-Code" or "BlockNameCode"
        const match1 = trimmed.match(/^([A-Za-z]+)\s*[-]?\s*([A-Za-z0-9]+)$/);
        if (match1 && match1[1] && match1[2]) {
            return {
                blockName: match1[1].toUpperCase(),
                roomCode: match1[2]
            };
        }

        // Try pattern: "Room Block Name Code" (e.g., "Room A 101")
        const match2 = trimmed.match(/(?:room\s+)?([A-Za-z]+)\s+(\d+)/i);
        if (match2 && match2[1] && match2[2]) {
            return {
                blockName: match2[1].toUpperCase(),
                roomCode: match2[2]
            };
        }

        // Fallback: treat entire string as room code with default block
        return {
            blockName: 'MAIN',
            roomCode: trimmed
        };
    }

    /**
     * Helper: Identify if headers contain the detailed Excel format
     * with "Room Number with block" or similar merged header format
     */
    private detectFormat(headers: string[]):
        { type: 'detailed'; rowNumberCol: string } |
        { type: 'legacy' } |
        null {
        // Check for "Room Number with block" or similar variants
        const roomNumberCol = headers.find(h =>
            h.toLowerCase().includes('room') &&
            h.toLowerCase().includes('number') &&
            h.toLowerCase().includes('block')
        );

        if (roomNumberCol) {
            return { type: 'detailed', rowNumberCol: roomNumberCol };
        }

        // Check for legacy format
        if (headers.includes('BlockName') && 
            headers.includes('FloorNumber') && 
            headers.includes('RoomCode')) {
            return { type: 'legacy' };
        }

        return null;
    }

    /**
     * Helper: Extract numeric row layout from detailed Excel columns
     * Filters out __EMPTY and non-numeric columns, returns desk counts per row
     */
    private extractRowLayout(row: SheetRow, headers: string[]): number[] {
        const layout: number[] = [];
        
        for (const header of headers) {
            // Skip metadata columns
            if (header.toLowerCase().includes('room') || 
                header.toLowerCase().includes('block') ||
                header.toLowerCase().includes('capacity') ||
                header === 'Capacity' ||
                !header.trim() || 
                header.toLowerCase().startsWith('__empty')) {
                continue;
            }
            
            const value = row[header];
            if (value !== undefined && value !== null && value !== '') {
                const numValue = Number(value);
                if (!isNaN(numValue) && numValue > 0) {
                    layout.push(numValue);
                }
            }
        }
        
        // Remove trailing zeros
        while (layout.length > 0 && layout[layout.length - 1] === 0) {
            layout.pop();
        }
        
        return layout;
    }

    async importFromCSV(fileBuffer: Buffer): Promise<ImportResult> {
        // 1. Read workbook (handles both CSV and Excel seamlessly)
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("No sheets found in file");
        
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) throw new Error("Sheet not found");
        
        let rows = XLSX.utils.sheet_to_json<SheetRow>(sheet, { defval: '' });

        if (!rows || rows.length === 0) {
            throw new Error("File is empty or invalid format.");
        }

        // Clean out spaces in keys (e.g. ' BlockName ' -> 'BlockName')
        const normalizedRows = rows.map(row => {
            const nr: any = {};
            for (const key in row) {
                const val = typeof row[key] === 'string' ? row[key].trim() : String(row[key]);
                nr[key.trim()] = val;
            }
            return nr;
        });

        // 2. Detect format
        const firstRowHeaders = Object.keys(normalizedRows[0]);
        const formatInfo = this.detectFormat(firstRowHeaders);
        
        if (!formatInfo) {
            throw new Error(
                `Unsupported file format. Expected either:\n` +
                `- Legacy: [BlockName, FloorNumber, RoomCode, Capacity]\n` +
                `- Detailed: [Room Number with block, Row A, Row B, ...]\n` +
                `Columns found: ${firstRowHeaders.join(', ')}`
            );
        }

        const isDetailedFormat = formatInfo.type === 'detailed';
        const roomNumberCol = isDetailedFormat ? (formatInfo as any).rowNumberCol : undefined;

        const transaction = await sequelize.transaction();
        let blocksCreated = 0;
        let floorsCreated = 0;
        let roomsCreated = 0;

        try {
            const processedRooms = new Set<string>();
            const blockCache = new Map<string, number>();
            const floorCache = new Map<string, number>();
            const seatsPerBench = 2; // Fixed per exam hall standards

            for (let i = 0; i < normalizedRows.length; i++) {
                const row = normalizedRows[i];
                const lineNum = i + 2;

                // Skip completely empty rows
                if (Object.keys(row).every(k => !row[k])) continue;

                let blockName = "MAIN";
                let roomCode = "";
                let floorNum = 0;
                let isExamUsable = true;
                let rowLayout: number[] = [];

                // ========== PARSE BASED ON FORMAT ==========
                if (isDetailedFormat) {
                    // Detailed format: extract from "Room Number with block" column
                    const roomNumberValue = row[roomNumberCol!];
                    if (!roomNumberValue) continue;

                    const parsed = this.parseRoomNumberWithBlock(String(roomNumberValue));
                    blockName = parsed.blockName;
                    roomCode = parsed.roomCode;

                    // Assume floor number can be derived from room code if it's numeric
                    const roomNum = parseInt(roomCode);
                    if (!isNaN(roomNum)) {
                        floorNum = Math.floor(roomNum / 100) || 0;
                    } else {
                        floorNum = 0; // Ground floor by default
                    }

                    // Extract row layout from numeric columns
                    rowLayout = this.extractRowLayout(row, firstRowHeaders);

                    // Override with explicit Capacity if provided
                    if (row.Capacity) {
                        const explicitCapacity = parseInt(row.Capacity);
                        if (!isNaN(explicitCapacity) && explicitCapacity > 0) {
                            // Use capacity to derive layout if not present
                            if (rowLayout.length === 0) {
                                const benches = Math.ceil(explicitCapacity / seatsPerBench);
                                const cols = Math.min(benches, 3);
                                if (cols > 0) {
                                    const rowSize = Math.floor(benches / cols);
                                    for (let c = 0; c < cols; c++) rowLayout.push(rowSize);
                                    const rem = benches % cols;
                                    if (rem > 0 && rowLayout.length > 0) {
                                        rowLayout[0] = (rowLayout[0] || 0) + rem;
                                    }
                                }
                            }
                        }
                    }
                } else {
                    // Legacy format
                    blockName = row.BlockName || "MAIN";
                    floorNum = parseInt(row.FloorNumber) || 0;
                    roomCode = String(row.RoomCode || "");
                    
                    if (row.IsExamUsable !== undefined) {
                        isExamUsable = String(row.IsExamUsable).toLowerCase() === 'true';
                    }

                    // Build row layout from single letter columns (A, B, C, etc.)
                    const layoutColumns = firstRowHeaders
                        .filter(col => /^[A-Z]$/i.test(col))
                        .sort();

                    for (const col of layoutColumns) {
                        const benchCount = Number(row[col]) || 0;
                        rowLayout.push(benchCount);
                        if (rowLayout.length >= 10) break;
                    }

                    // Remove trailing zeros
                    while (rowLayout.length > 0 && rowLayout[rowLayout.length - 1] === 0) {
                        rowLayout.pop();
                    }

                    // Fallback: use explicit Capacity if no layout
                    const capacityStr = row.Capacity || "0";
                    const explicitCapacity = parseInt(capacityStr);
                    
                    if (rowLayout.length === 0 && explicitCapacity > 0) {
                        const benches = Math.ceil(explicitCapacity / seatsPerBench);
                        const cols = Math.min(benches, 3);
                        if (cols > 0) {
                            const rowSize = Math.floor(benches / cols);
                            for (let c = 0; c < cols; c++) rowLayout.push(rowSize);
                            const rem = benches % cols;
                            if (rem > 0 && rowLayout.length > 0) {
                                rowLayout[0] = (rowLayout[0] || 0) + rem;
                            }
                        }
                    }
                }

                // ========== VALIDATE ==========
                if (!roomCode) {
                    throw new Error(`Row ${lineNum}: Cannot derive RoomCode`);
                }

                if (processedRooms.has(roomCode.toLowerCase())) {
                    throw new Error(`Row ${lineNum}: Duplicate Room '${roomCode}' in file.`);
                }
                processedRooms.add(roomCode.toLowerCase());

                // Calculate total capacity
                let totalCapacity = 0;
                if (rowLayout.length > 0) {
                    totalCapacity = rowLayout.reduce(
                        (sum, benches) => sum + (benches * seatsPerBench), 
                        0
                    );
                } else {
                    // Fallback: assume some default or skip
                    continue; // Skip rows with no valid layout
                }

                if (!totalCapacity || totalCapacity <= 0) {
                    throw new Error(`Row ${lineNum}: Room '${roomCode}' has invalid layout / capacity (0).`);
                }

                // ========== DATABASE WRITES ==========
                // Create or fetch Block
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

                // Create or fetch Floor
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

                // Create or Update Room
                let existingRoom = await Room.findOne(
                    { where: { RoomCode: roomCode, FloorID: floorId }, transaction }
                );

                if (existingRoom) {
                    const roomData = (existingRoom as any).toJSON ? (existingRoom as any).toJSON() : existingRoom;
                    
                    // Skip if layout is locked
                    if (roomData.IsLayoutLocked) continue;

                    await Room.update(
                        {
                            Capacity: totalCapacity,
                            RowLayout: rowLayout,
                        },
                        { where: { RoomID: roomData.RoomID }, transaction }
                    );

                    // Refresh and regenerate seats
                    existingRoom = await Room.findOne(
                        { where: { RoomID: roomData.RoomID }, transaction }
                    );
                    await generateSeats(existingRoom as any);
                } else {
                    // Create new room
                    const newRoom = await Room.create(
                        {
                            RoomCode: roomCode,
                            BlockID: blockId,
                            FloorID: floorId,
                            Capacity: totalCapacity,
                            ExamUsable: isExamUsable,
                            Status: 'Active',
                            RoomType: 'ROOM',
                            LayoutType: 'CUSTOM',
                            RowLayout: rowLayout,
                            SeatsPerBench: seatsPerBench,
                            IsLayoutLocked: false
                        },
                        { transaction }
                    );
                    roomsCreated++;

                    await generateSeats(newRoom as any);
                }
            }

            await transaction.commit();

            return {
                blocksCreated,
                floorsCreated,
                roomsCreated
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}
