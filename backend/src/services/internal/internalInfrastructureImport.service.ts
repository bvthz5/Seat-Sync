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
                const capacity = parseInt(String(row.Capacity || row.capacity || 0)) || 0;
                
                const [room, roomCreated] = await InternalRoom.findOrCreate({
                    where: { RoomCode: resolved.roomName, FloorID: floorId },
                    defaults: {
                        BlockID: blockId,
                        FloorID: floorId,
                        RoomCode: resolved.roomName,
                        TotalCapacity: capacity,
                        RowLayout: InternalLayoutGeneratorService.generateRowLayout(capacity),
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
                    room.RowLayout = InternalLayoutGeneratorService.generateRowLayout(capacity);
                    await room.save({ transaction: t });
                    await InternalLayoutGeneratorService.generateSeats(room, t);
                }
            }
        });

        return { blocksCreated, floorsCreated, roomsCreated };
    }
}
