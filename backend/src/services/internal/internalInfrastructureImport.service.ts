/**
 * internalInfrastructureImport.service.ts
 *
 * Production-grade transactional import orchestrator for Internal Infrastructure.
 * Connects Normalization, Capacity Reconciliation, Pattern Resolution, Room Upsert,
 * and Physical Seat Generation with complete integrity validation.
 */

import { Op } from "sequelize";
import { sequelize } from "../../config/database.js";
import { InternalBlock } from "../../models/InternalBlock.js";
import { InternalFloor } from "../../models/InternalFloor.js";
import { InternalRoom } from "../../models/InternalRoom.js";
import { InternalSeat } from "../../models/InternalSeat.js";
import { normalizeInfrastructureData } from "../../utils/internal/infrastructureNormalizer.js";
import { InternalInfrastructureReconcilerService, ImportReconciliationSummary, RoomReconciliationItem } from "./internalInfrastructureReconciler.service.js";
import { InternalLayoutGeneratorService } from "./internalLayoutGenerator.service.js";

export interface ImportBatchResult {
    blocksCreated: number;
    floorsCreated: number;
    roomsCreated: number;
    roomsUpdated: number;
    summary: ImportReconciliationSummary;
}

export class InternalInfrastructureImportService {

    /**
     * Previews and reconciles an incoming dataset without modifying the database.
     */
    static previewBatch(rawData: any[]): ImportReconciliationSummary {
        const cleanData = normalizeInfrastructureData(rawData);
        return InternalInfrastructureReconcilerService.reconcileBatch(cleanData);
    }

    /**
     * Executes transactional import of an infrastructure batch with idempotent upserts,
     * duplicate room prevention, and authoritative physical seat generation.
     */
    static async importBatch(rawData: any[]): Promise<ImportBatchResult> {
        const cleanData = normalizeInfrastructureData(rawData);
        const reconciliationSummary = InternalInfrastructureReconcilerService.reconcileBatch(cleanData);

        let blocksCreated = 0;
        let floorsCreated = 0;
        let roomsCreated = 0;
        let roomsUpdated = 0;

        const blockCache = new Map<string, number>();
        const floorCache = new Map<string, number>();

        await sequelize.transaction(async (t) => {
            for (const item of reconciliationSummary.items) {
                // Skip invalid rows (e.g. blank room codes with floating bench data)
                if (item.status === 'INVALID_SOURCE_ROW' || !item.isUsable || !item.normalizedRoomKey) {
                    console.warn(`[IMPORT] Skipping invalid row: ${item.message}`);
                    continue;
                }

                // 1. Resolve / Upsert Block
                const blockKey = item.blockName.toLowerCase();
                let blockId = blockCache.get(blockKey);
                if (!blockId) {
                    const [block, bCreated] = await InternalBlock.findOrCreate({
                        where: { BlockName: item.blockName },
                        defaults: {
                            BlockName: item.blockName,
                            Status: 'Active'
                        },
                        transaction: t
                    });
                    if (bCreated) blocksCreated++;
                    blockId = block.BlockID;
                    blockCache.set(blockKey, blockId);
                }

                // 2. Resolve / Upsert Floor
                const floorKey = `${blockId}-${item.floorNumber}`;
                let floorId = floorCache.get(floorKey);
                if (!floorId) {
                    const [floor, fCreated] = await InternalFloor.findOrCreate({
                        where: { BlockID: blockId, FloorNumber: item.floorNumber },
                        defaults: {
                            BlockID: blockId,
                            FloorNumber: item.floorNumber,
                            Status: 'Active'
                        },
                        transaction: t
                    });
                    if (fCreated) floorsCreated++;
                    floorId = floor.FloorID;
                    floorCache.set(floorKey, floorId);
                }

                // 3. Upsert Room with Duplicate Prevention (Matching by NormalizedRoomCode and FloorID)
                let existingRoom = await InternalRoom.findOne({
                    where: {
                        FloorID: floorId,
                        [Op.or]: [
                            { NormalizedRoomCode: item.normalizedRoomKey },
                            { RoomCode: item.roomCode }
                        ]
                    },
                    transaction: t
                });

                let targetRoom: InternalRoom;

                if (!existingRoom) {
                    targetRoom = await InternalRoom.create({
                        BlockID: blockId,
                        FloorID: floorId,
                        RoomCode: item.roomCode,
                        NormalizedRoomCode: item.normalizedRoomKey,
                        SourceCapacity: item.sourceCapacity,
                        TotalCapacity: item.calculatedCapacity,
                        RowLayout: item.rowLayout,
                        SeatsPerBench: item.seatsPerBench,
                        RoomType: item.roomType,
                        SeatMode: item.seatMode,
                        ExamUsable: true,
                        Status: 'Active'
                    } as any, { transaction: t });
                    roomsCreated++;
                } else {
                    targetRoom = existingRoom;
                    targetRoom.BlockID = blockId;
                    targetRoom.RoomCode = item.roomCode;
                    targetRoom.NormalizedRoomCode = item.normalizedRoomKey;
                    targetRoom.SourceCapacity = item.sourceCapacity;
                    targetRoom.TotalCapacity = item.calculatedCapacity;
                    targetRoom.RowLayout = item.rowLayout;
                    targetRoom.SeatsPerBench = item.seatsPerBench;
                    targetRoom.RoomType = item.roomType;
                    targetRoom.SeatMode = item.seatMode;
                    targetRoom.Status = 'Active';
                    targetRoom.ExamUsable = true;
                    await targetRoom.save({ transaction: t });
                    roomsUpdated++;
                }

                // 4. Physical Seat Generation (Authoritative from RowLayout)
                await InternalLayoutGeneratorService.generateSeats(targetRoom, t);

                // 5. Invariant Verification: generatedSeatCount === calculatedCapacity
                const generatedSeatCount = await InternalSeat.count({
                    where: { RoomID: targetRoom.RoomID, IsActive: true },
                    transaction: t
                });

                item.generatedCapacity = generatedSeatCount;

                if (generatedSeatCount !== item.calculatedCapacity) {
                    const errorMsg = `Seat Generation Invariant Failure for ${targetRoom.RoomCode}: expected ${item.calculatedCapacity} seats from row layout [${item.rowLayout.join(', ')}], but generated ${generatedSeatCount} seats!`;
                    console.error(`[IMPORT ERROR] ${errorMsg}`);
                    throw new Error(errorMsg);
                }

                console.log(`[IMPORT SUCCESS] ${targetRoom.RoomCode}: Normalized=${item.normalizedRoomKey}, Block=${item.blockName}, Floor=${item.floorNumber}, Layout=[${item.rowLayout.join(',')}], Seats=${generatedSeatCount}, Status=${item.status}`);
            }
        });

        return {
            blocksCreated,
            floorsCreated,
            roomsCreated,
            roomsUpdated,
            summary: reconciliationSummary
        };
    }
}
