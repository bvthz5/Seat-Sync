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
                const rawRoomCode = String(row.RoomCode || row.roomCode || row['Room Code'] || '');
                const resolved = InternalInfrastructureParserService.parse(rawRoomCode);
                
                // 1. Resolve Block
                let blockId = blockCache.get(resolved.blockName);
                if (!blockId) {
                    let [block, created] = await InternalBlock.findOrCreate({
                        where: { BlockName: resolved.blockName },
                        defaults: { 
                            BlockName: resolved.blockName,
                            Status: 'Active' 
                        },
                        transaction: t
                    });
                    if (created) blocksCreated++;
                    blockId = block.BlockID;
                    blockCache.set(resolved.blockName, blockId);
                }

                // 2. Resolve Floor
                const floorNum = row.FloorNumber !== undefined ? parseInt(String(row.FloorNumber)) : resolved.floorNumber;
                const floorKey = `${blockId}-${floorNum}`;
                let floorId = floorCache.get(floorKey);
                if (!floorId) {
                    let [floor, created] = await InternalFloor.findOrCreate({
                        where: { BlockID: blockId, FloorNumber: resolved.floorNumber },
                        defaults: { 
                            BlockID: blockId, 
                            FloorNumber: resolved.floorNumber,
                            Status: 'Active' 
                        },
                        transaction: t
                    });
                    if (created) floorsCreated++;
                    floorId = floor.FloorID;
                    floorCache.set(floorKey, floorId);
                }

                // 3. Resolve Room
                const capacity = parseInt(String(row.Capacity || row.capacity || row['Total'] || row['Total Capacity'] || 0)) || 0;
                
                // Extract row layout from Excel columns
                // The columns might be named A, B, C or __EMPTY, __EMPTY_1, __EMPTY_2, etc.
                let rowLayout: number[] = [];
                
                console.log(`[ImportService] ========== Parsing room: ${resolved.roomName} ==========`);
                console.log(`[ImportService] Row keys:`, Object.keys(row));
                console.log(`[ImportService] Full row data:`, row);
                
                // Try standard column labels first (A, B, C, D, E, F)
                const columnLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
                for (const colLabel of columnLabels) {
                    const val = row[colLabel] || row[`Column${colLabel}`] || row[`column${colLabel}`];
                    if (val !== undefined && val !== null && val !== '') {
                        const benches = parseInt(String(val).trim());
                        if (!isNaN(benches) && benches > 0) {
                            rowLayout.push(benches);
                        } else if (!isNaN(benches) && benches === 0) {
                            break;
                        }
                    }
                }
                
                // If still no layout, try __EMPTY columns (XLSX parsing of merged cells)
                if (rowLayout.length === 0) {
                    console.log(`[ImportService] Trying __EMPTY columns for ${resolved.roomName}`);
                    let emptyIdx = 0;
                    while (true) {
                        const emptyKey = emptyIdx === 0 ? '__EMPTY' : `__EMPTY_${emptyIdx}`;
                        const val = row[emptyKey];
                        
                        if (val !== undefined && val !== null && val !== '') {
                            const benches = parseInt(String(val).trim());
                            console.log(`[ImportService] ${emptyKey}: value="${val}" → parsed=${benches}`);
                            
                            if (!isNaN(benches) && benches > 0) {
                                rowLayout.push(benches);
                                console.log(`[ImportService] Added to layout: ${emptyKey}=${benches}, layout now: [${rowLayout.join(', ')}]`);
                            } else if (!isNaN(benches) && benches === 0) {
                                console.log(`[ImportService] Found zero at ${emptyKey}, stopping`);
                                break;
                            }
                        } else {
                            console.log(`[ImportService] ${emptyKey}: empty/null, stopping`);
                            break;
                        }
                        emptyIdx++;
                        if (emptyIdx > 20) break;
                    }
                }
                
                console.log(`[ImportService] ✓ Final rowLayout for ${resolved.roomName}: [${rowLayout.join(', ')}]`);
                
                // If no row layout found, auto-generate from capacity
                if (rowLayout.length === 0) {
                    console.log(`[ImportService] No layout found, auto-generating from capacity ${capacity}`);
                    rowLayout = InternalLayoutGeneratorService.generateRowLayout(capacity);
                }
                
                const [room, roomCreated] = await InternalRoom.findOrCreate({
                    where: { RoomCode: resolved.roomName, FloorID: floorId },
                    defaults: {
                        BlockID: blockId,
                        FloorID: floorId,
                        RoomCode: resolved.roomName,
                        TotalCapacity: capacity,
                        RowLayout: rowLayout,
                        SeatsPerBench: 2,
                        RoomType: 'Classroom',
                        SeatMode: 'Dual',
                        ExamUsable: true,
                        Status: 'Active'
                    },
                    transaction: t
                });

                if (roomCreated) {
                    roomsCreated++;
                    // Generate Seating
                    await InternalLayoutGeneratorService.generateSeats(room, t);
                } else {
                    // Update capacity and regenerate layout/seats
                    room.TotalCapacity = capacity;
                    room.RowLayout = rowLayout;
                    await room.save({ transaction: t });
                    await InternalLayoutGeneratorService.generateSeats(room, t);
                }
            }
        });

        return { blocksCreated, floorsCreated, roomsCreated };
    }
}
