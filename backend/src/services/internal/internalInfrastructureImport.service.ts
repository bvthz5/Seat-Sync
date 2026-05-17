/**
 * internalInfrastructureImport.service.ts
 *
 * Isolated high-fidelity import orchestrator.
 * Connects normalization, pattern resolution, and layout generation.
 */

import { sequelize } from "../../config/database.js";
import { InternalBlock } from "../../models/InternalBlock.js";
import { InternalFloor } from "../../models/InternalFloor.js";
import { InternalRoom } from "../../models/InternalRoom.js";
import { normalizeInfrastructureData } from "../../utils/internal/infrastructureNormalizer.js";
import { InternalInfrastructureParserService } from "./internalInfrastructureParser.service.js";
import { InternalLayoutGeneratorService } from "./internalLayoutGenerator.service.js";

const getValueByPatterns = (row: any, patterns: string[]): any => {
    if (!row) return undefined;
    const keys = Object.keys(row);
    for (const pattern of patterns) {
        const matchingKey = keys.find(k => k.toLowerCase().replace(/[\s_\-]+/g, '') === pattern.toLowerCase().replace(/[\s_\-]+/g, ''));
        if (matchingKey && row[matchingKey] !== undefined && row[matchingKey] !== null) {
            return row[matchingKey];
        }
    }
    return undefined;
};

export class InternalInfrastructureImportService {

    static async importBatch(rawData: any[]) {
        const cleanData = normalizeInfrastructureData(rawData);

        let blocksCreated = 0;
        let floorsCreated = 0;
        let roomsCreated = 0;

        const blockCache = new Map<string, number>();
        const floorCache = new Map<string, number>();

        await sequelize.transaction(async (t) => {
            for (const row of cleanData) {
                const rawRoomCode = String(getValueByPatterns(row, ['RoomCode', 'RoomName', 'Room', 'Code']) || '');
                if (!rawRoomCode.trim()) continue;

                const resolved = InternalInfrastructureParserService.parse(rawRoomCode);

                // Extract flexible properties case-insensitively from Excel row
                const blockVal = getValueByPatterns(row, ['BlockName', 'Block', 'Building']);
                const floorVal = getValueByPatterns(row, ['FloorNumber', 'Floor', 'Level']);
                const capacityVal = getValueByPatterns(row, ['Capacity', 'TotalCapacity', 'Cap', 'Seats', 'Total']);
                const colsVal = getValueByPatterns(row, ['Columns', 'Cols', 'ColumnCount', 'ColCount', 'Column']);
                const rowsVal = getValueByPatterns(row, ['Rows', 'Benches', 'BenchesPerRow', 'RowCount', 'Row']);
                const typeVal = getValueByPatterns(row, ['RoomType', 'Type', 'Room Type', 'ClassroomType']);
                const seatModeVal = getValueByPatterns(row, ['SeatMode', 'SeatsPerBench', 'SeatingSchema', 'Schema']);

                // 1. Resolve Block (Preserving spaces and casing exactly)
                const blockName = blockVal ? String(blockVal).trim() : resolved.blockName;
                let blockId = blockCache.get(blockName.toLowerCase());
                if (!blockId) {
                    let [block, created] = await InternalBlock.findOrCreate({
                        where: { BlockName: blockName },
                        defaults: {
                            BlockName: blockName,
                            Status: 'Active'
                        },
                        transaction: t
                    });
                    if (created) blocksCreated++;
                    blockId = block.BlockID;
                    blockCache.set(blockName.toLowerCase(), blockId);
                }

                // 2. Resolve Floor
                let floorNum = resolved.floorNumber;
                if (floorVal !== undefined && floorVal !== null && String(floorVal).trim() !== '') {
                    const parsed = parseInt(String(floorVal).trim(), 10);
                    if (!isNaN(parsed)) {
                        floorNum = parsed;
                    }
                }
                const floorKey = `${blockId}-${floorNum}`;
                let floorId = floorCache.get(floorKey);
                if (!floorId) {
                    let [floor, created] = await InternalFloor.findOrCreate({
                        where: { BlockID: blockId, FloorNumber: floorNum },
                        defaults: {
                            BlockID: blockId,
                            FloorNumber: floorNum,
                            Status: 'Active'
                        },
                        transaction: t
                    });
                    if (created) floorsCreated++;
                    floorId = floor.FloorID;
                    floorCache.set(floorKey, floorId);
                }

                // 3. Auto-Build Layout Structure (Classroom Architect Column/Bench Grid)
                let rowLayout: number[] = [];

                // Case A: If Columns and Rows are explicitly specified
                if (colsVal !== undefined && colsVal !== null && rowsVal !== undefined && rowsVal !== null) {
                    const colsCount = parseInt(String(colsVal).trim(), 10);
                    const rowsCount = parseInt(String(rowsVal).trim(), 10);
                    if (!isNaN(colsCount) && colsCount > 0 && !isNaN(rowsCount) && rowsCount > 0) {
                        rowLayout = Array(colsCount).fill(rowsCount);
                    }
                }

                // Case B: If specific alphabetic columns (A, B, C...) are filled
                if (rowLayout.length === 0) {
                    const columnLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'];
                    for (const colLabel of columnLabels) {
                        const val = row[colLabel] || row[`Column${colLabel}`] || row[`column${colLabel}`];
                        if (val !== undefined && val !== null && val !== '') {
                            const benches = parseInt(String(val).trim(), 10);
                            if (!isNaN(benches) && benches > 0) {
                                rowLayout.push(benches);
                            } else if (!isNaN(benches) && benches === 0) {
                                break;
                            }
                        }
                    }
                }

                // Case C: Merged headers/empty column mappings from CSV
                if (rowLayout.length === 0) {
                    let emptyIdx = 0;
                    while (true) {
                        const emptyKey = emptyIdx === 0 ? '__EMPTY' : `__EMPTY_${emptyIdx}`;
                        const val = row[emptyKey];
                        if (val !== undefined && val !== null && val !== '') {
                            const benches = parseInt(String(val).trim(), 10);
                            if (!isNaN(benches) && benches > 0) {
                                rowLayout.push(benches);
                            } else if (!isNaN(benches) && benches === 0) {
                                break;
                            }
                        } else {
                            if (emptyIdx > 1) {
                                const nextEmptyKey = `__EMPTY_${emptyIdx + 1}`;
                                const nextVal = row[nextEmptyKey];
                                if (nextVal === undefined || nextVal === null || nextVal === '') {
                                    break;
                                }
                            }
                        }
                        emptyIdx++;
                        if (emptyIdx > 30) break;
                    }
                }

                // 4. Capacity Verification & Auto Single/Dual Detection
                let parsedCapacity = 0;
                if (capacityVal !== undefined && capacityVal !== null && String(capacityVal).trim() !== '') {
                    const parsed = parseInt(String(capacityVal).trim(), 10);
                    if (!isNaN(parsed)) {
                        parsedCapacity = parsed;
                    }
                }

                // If layout is completely absent, auto-generate it from capacity
                if (rowLayout.length === 0) {
                    if (parsedCapacity > 0) {
                        rowLayout = InternalLayoutGeneratorService.generateRowLayout(parsedCapacity);
                    } else {
                        rowLayout = [5, 5, 5, 5, 5, 5]; // Default: 6 columns of 5 benches
                    }
                }

                const totalBenches = rowLayout.reduce((sum, count) => sum + count, 0);

                let seatsPerBench = 2;
                let seatMode: "Single" | "Dual" | "Mixed" = "Dual";

                if (parsedCapacity === 0) {
                    // If capacity is unspecified, default to standard Dual seating (2 seats per bench)
                    seatsPerBench = 2;
                    parsedCapacity = totalBenches * 2;
                    seatMode = "Dual";
                } else {
                    // Verbatim user rule: if the bench and row (totalBenches) are equal to capacity then single seating else dual seating.
                    if (totalBenches === parsedCapacity) {
                        seatMode = "Single";
                        seatsPerBench = 1;
                    } else {
                        seatMode = "Dual";
                        seatsPerBench = 2;
                    }
                }

                // 5. Drawing Hall Support (Rule 10)
                let roomType: "Classroom" | "Drawing Hall" | "Lab" | "Minor Room" | "Seminar Hall" = "Classroom";
                if (typeVal) {
                    const typeStr = String(typeVal).toLowerCase().trim();
                    if (typeStr.includes('drawing') || typeStr.includes('hall')) {
                        roomType = "Drawing Hall";
                    } else if (typeStr.includes('lab') || typeStr.includes('workshop')) {
                        roomType = "Lab";
                    } else if (typeStr.includes('seminar')) {
                        roomType = "Seminar Hall";
                    } else if (typeStr.includes('minor')) {
                        roomType = "Minor Room";
                    }
                } else if (resolved.roomName.toUpperCase().includes("DRAWING HALL")) {
                    roomType = "Drawing Hall";
                } else if (resolved.roomName.toUpperCase().includes("LAB")) {
                    roomType = "Lab";
                }

                if (roomType === "Drawing Hall") {
                    seatMode = "Single"; // Auto-disable dual mode for drawing hall
                }

                // 6. UPSERT Logic (Rule 12: No Duplicate Rooms)
                const [room, roomCreated] = await InternalRoom.findOrCreate({
                    where: { RoomCode: resolved.roomName, FloorID: floorId },
                    defaults: {
                        BlockID: blockId,
                        FloorID: floorId,
                        RoomCode: resolved.roomName,
                        TotalCapacity: parsedCapacity,
                        RowLayout: rowLayout,
                        SeatsPerBench: seatsPerBench,
                        RoomType: roomType,
                        SeatMode: seatMode,
                        ExamUsable: true,
                        Status: 'Active'
                    },
                    transaction: t
                });

                if (roomCreated) {
                    roomsCreated++;
                } else {
                    // Update existing instead of duplicating
                    room.BlockID = blockId;
                    room.TotalCapacity = parsedCapacity;
                    room.RowLayout = rowLayout;
                    room.SeatsPerBench = seatsPerBench;
                    room.RoomType = roomType;
                    room.SeatMode = seatMode;
                    await room.save({ transaction: t });
                }

                // 7. Auto Seating Generation / Classroom Architect Sync
                await InternalLayoutGeneratorService.generateSeats(room, t);
            }
        });

        return { blocksCreated, floorsCreated, roomsCreated };
    }
}

