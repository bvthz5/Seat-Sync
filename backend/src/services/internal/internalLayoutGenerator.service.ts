/**
 * internalLayoutGenerator.service.ts
 *
 * Production-grade auto-layout engine for Internal Exam Rooms.
 * Supports TWO distinct seat structure types:
 *   - SINGLE: One seat per bench (a1, a2, a3...) — completely separate from dual
 *   - DUAL:   Two seats per bench (1L, 1R, 2L, 2R...) — paired bench structure
 *
 * The single-seat generator NEVER reuses dual logic. They are separate code paths.
 */

import { InternalRoom, InternalSeat, InternalSeatLayout, InternalSeatColumn } from "../../models/index.js";
import { Transaction, Op } from "sequelize";

export class InternalLayoutGeneratorService {
    
    /**
     * Generates a balanced row layout for a given capacity assuming DUAL seating (2 per bench).
     */
    static generateRowLayout(capacity: number): number[] {
        const spb = 2; // Dual Seating
        const totalBenches = Math.ceil(capacity / spb);
        
        // Strategy: Max 6 benches per row for standard rooms, 10 for halls
        const benchesPerRow = capacity > 100 ? 10 : 6;
        const rowCount = Math.ceil(totalBenches / benchesPerRow);
        
        const layout: number[] = [];
        let remaining = totalBenches;
        
        for (let i = 0; i < rowCount; i++) {
            const take = Math.min(remaining, benchesPerRow);
            if (take > 0) {
                layout.push(take);
                remaining -= take;
            }
        }
        
        return layout;
    }

    /**
     * Generates a balanced row layout for SINGLE seating (1 per bench).
     * capacity = rows * columns directly.
     */
    static generateSingleSeatRowLayout(capacity: number): number[] {
        const benchesPerRow = capacity > 100 ? 10 : 6;
        const rowCount = Math.ceil(capacity / benchesPerRow);
        
        const layout: number[] = [];
        let remaining = capacity;
        
        for (let i = 0; i < rowCount; i++) {
            const take = Math.min(remaining, benchesPerRow);
            if (take > 0) {
                layout.push(take);
                remaining -= take;
            }
        }
        
        return layout;
    }

    /**
     * Generates row layout based on specified benches per row (respects Excel column structure).
     * E.g., if capacity=60 and benchesPerRow=6, creates columns with 6 benches each.
     */
    static generateRowLayoutFromBenchesPerRow(capacity: number, benchesPerRow: number, seatMode: string = 'Dual'): number[] {
        const spb = seatMode === 'Single' ? 1 : 2;
        const totalBenches = Math.ceil(capacity / spb);
        const columnCount = Math.ceil(totalBenches / benchesPerRow);
        
        const layout: number[] = [];
        let remaining = totalBenches;
        
        for (let i = 0; i < columnCount; i++) {
            const take = Math.min(remaining, benchesPerRow);
            if (take > 0) {
                layout.push(take);
                remaining -= take;
            }
        }
        
        return layout;
    }

    /**
     * Generates all seat records for a room based on its dynamic row layout.
     * Synchronizes safely with existing allocations.
     */
    static async generateSeats(room: InternalRoom, transaction?: Transaction) {
        const rawLayout = Array.isArray(room.RowLayout) ? room.RowLayout : [];
        const layoutArray = rawLayout.filter(b => typeof b === 'number' && !isNaN(b) && b > 0);
        const isSingle = room.SeatMode === 'Single';
        const seatsPerBench = isSingle ? 1 : 2;
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

        // 1. Build desired target seat descriptors
        const targetSeats: Array<{ RowLabel: string; BenchNumber: number; SeatNumber: number }> = [];
        for (let rIndex = 0; rIndex < layoutArray.length; rIndex++) {
            const rowLabel = alphabet[rIndex] || `R${rIndex + 1}`;
            const benchCount = layoutArray[rIndex] || 0;

            for (let bNum = 1; bNum <= benchCount; bNum++) {
                if (isSingle) {
                    targetSeats.push({ RowLabel: rowLabel, BenchNumber: bNum, SeatNumber: 1 });
                } else {
                    targetSeats.push({ RowLabel: rowLabel, BenchNumber: bNum, SeatNumber: 1 });
                    targetSeats.push({ RowLabel: rowLabel, BenchNumber: bNum, SeatNumber: 2 });
                }
            }
        }

        // 2. Fetch existing seats for the room
        const existingSeats = await InternalSeat.findAll({
            where: { RoomID: room.RoomID },
            transaction: transaction || null
        });

        // 3. Check for active allocations referencing seats in this room
        let allocatedSeatIds = new Set<number>();
        if (existingSeats.length > 0) {
            try {
                const { InternalSeatAllocation } = await import("../../models/index.js");
                const existingSeatIds = existingSeats.map(s => s.SeatID);
                const allocations = await InternalSeatAllocation.findAll({
                    where: { InternalSeatID: { [Op.in]: existingSeatIds } },
                    attributes: ['InternalSeatID'],
                    transaction: transaction || null
                });
                allocations.forEach(a => allocatedSeatIds.add(a.InternalSeatID));
            } catch (err: any) {
                // Ignore if allocation model not loaded in isolation
            }
        }

        // 4. If no allocations exist, we can cleanly replace seats
        if (allocatedSeatIds.size === 0) {
            await InternalSeat.destroy({
                where: { RoomID: room.RoomID },
                transaction: transaction || null
            });

            if (targetSeats.length > 0) {
                const seatsToInsert = targetSeats.map(ts => ({
                    RoomID: room.RoomID,
                    RowLabel: ts.RowLabel,
                    BenchNumber: ts.BenchNumber,
                    SeatNumber: ts.SeatNumber,
                    IsActive: true
                }));
                await InternalSeat.bulkCreate(seatsToInsert, {
                    transaction: transaction || null
                });
            }
        } else {
            // 5. Safe synchronization when allocations exist
            const existingMap = new Map<string, InternalSeat>();
            existingSeats.forEach(s => existingMap.set(`${s.RowLabel}-${s.BenchNumber}-${s.SeatNumber}`, s));

            const targetKeys = new Set<string>();
            const seatsToCreate: any[] = [];

            for (const ts of targetSeats) {
                const key = `${ts.RowLabel}-${ts.BenchNumber}-${ts.SeatNumber}`;
                targetKeys.add(key);
                const existing = existingMap.get(key);
                if (existing) {
                    if (!existing.IsActive) {
                        existing.IsActive = true;
                        await existing.save({ transaction: transaction || null });
                    }
                } else {
                    seatsToCreate.push({
                        RoomID: room.RoomID,
                        RowLabel: ts.RowLabel,
                        BenchNumber: ts.BenchNumber,
                        SeatNumber: ts.SeatNumber,
                        IsActive: true
                    });
                }
            }

            if (seatsToCreate.length > 0) {
                await InternalSeat.bulkCreate(seatsToCreate, {
                    transaction: transaction || null
                });
            }

            // Remove or disable seats no longer in target layout
            for (const [key, existing] of existingMap.entries()) {
                if (!targetKeys.has(key)) {
                    if (allocatedSeatIds.has(existing.SeatID)) {
                        // Keep allocated seat but mark inactive to preserve allocation history
                        existing.IsActive = false;
                        await existing.save({ transaction: transaction || null });
                    } else {
                        await existing.destroy({ transaction: transaction || null });
                    }
                }
            }
        }

        // 6. Count active capacity of generated seats
        const activeCapacity = await InternalSeat.count({
            where: { RoomID: room.RoomID, IsActive: true },
            transaction: transaction || null
        });

        // 7. Verify generated capacity matches target calculated capacity
        const totalBenches = layoutArray.reduce((sum, count) => sum + count, 0);
        const expectedCapacity = totalBenches * seatsPerBench;
        if (activeCapacity !== expectedCapacity) {
            console.warn(`[InternalLayoutGenerator] Note: Active seat count (${activeCapacity}) vs expected (${expectedCapacity}) for room ${room.RoomCode}`);
        }

        // 8. Upsert InternalSeatLayout
        const [layout, created] = await InternalSeatLayout.findOrCreate({
            where: { RoomID: room.RoomID },
            defaults: {
                RoomID: room.RoomID,
                LayoutVersion: 1,
                TotalCapacity: room.TotalCapacity || expectedCapacity,
                ActiveCapacity: activeCapacity,
                SeatingMode: room.SeatMode as any,
                Pattern: 'standard',
                UpdatedAt: new Date()
            },
            transaction: transaction || null
        });

        if (!created) {
            layout.TotalCapacity = room.TotalCapacity || expectedCapacity;
            layout.ActiveCapacity = activeCapacity;
            layout.SeatingMode = room.SeatMode as any;
            layout.UpdatedAt = new Date();
            await layout.save({ transaction: transaction || null });
        }

        // 9. Sync InternalSeatColumn records
        await InternalSeatColumn.destroy({
            where: { LayoutID: layout.LayoutID },
            transaction: transaction || null
        });

        const columnsToCreate: any[] = [];
        for (let colIdx = 0; colIdx < layoutArray.length; colIdx++) {
            const colLabel = alphabet[colIdx] || `R${colIdx + 1}`;
            columnsToCreate.push({
                LayoutID: layout.LayoutID,
                ColumnLabel: colLabel,
                BenchesCount: layoutArray[colIdx] || 0
            });
        }

        if (columnsToCreate.length > 0) {
            await InternalSeatColumn.bulkCreate(columnsToCreate, {
                transaction: transaction || null
            });
        }
    }

    /**
     * SINGLE SEAT GENERATOR
     * 
     * Generates exactly ONE seat per bench position.
     * Output structure: { RowLabel: 'A', BenchNumber: 1, SeatNumber: 1 }
     * 
     * Visual rendering: a1, a2, a3 (center-aligned, no L/R)
     * Capacity = total benches across all columns
     * 
     * This is NOT dual-with-disabled-right. It is a completely separate structure.
     */
    private static async generateSingleSeatLayout(room: InternalRoom, transaction?: Transaction) {
        const layout = (room.RowLayout as number[]) || [];
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const seats: any[] = [];

        for (let rIndex = 0; rIndex < layout.length; rIndex++) {
            const rowLabel = alphabet[rIndex] || `R${rIndex + 1}`;
            const benchCount = layout[rIndex] || 0;

            for (let bNum = 1; bNum <= benchCount; bNum++) {
                // Single seat: only SeatNumber=1, always active
                seats.push({
                    RoomID: room.RoomID,
                    RowLabel: rowLabel,
                    BenchNumber: bNum,
                    SeatNumber: 1,  // CENTER position — only seat on bench
                    IsActive: true
                });
            }
        }

        if (seats.length > 0) {
            await InternalSeat.bulkCreate(seats, { 
                transaction: transaction || null 
            });
        }
    }

    /**
     * DUAL SEAT GENERATOR
     * 
     * Generates TWO seats per bench position (Left + Right).
     * Output structure: { RowLabel: 'A', BenchNumber: 1, SeatNumber: 1 } (Left)
     *                   { RowLabel: 'A', BenchNumber: 1, SeatNumber: 2 } (Right)
     * 
     * Visual rendering: 1L 1R, 2L 2R (paired bench structure)
     * Capacity = total benches × 2
     */
    private static async generateDualSeatLayout(room: InternalRoom, transaction?: Transaction) {
        const layout = (room.RowLayout as number[]) || [];
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const seats: any[] = [];

        for (let rIndex = 0; rIndex < layout.length; rIndex++) {
            const rowLabel = alphabet[rIndex] || `R${rIndex + 1}`;
            const benchCount = layout[rIndex] || 0;

            for (let bNum = 1; bNum <= benchCount; bNum++) {
                // Left seat (SeatNumber=1)
                seats.push({
                    RoomID: room.RoomID,
                    RowLabel: rowLabel,
                    BenchNumber: bNum,
                    SeatNumber: 1,
                    IsActive: true
                });
                // Right seat (SeatNumber=2)
                seats.push({
                    RoomID: room.RoomID,
                    RowLabel: rowLabel,
                    BenchNumber: bNum,
                    SeatNumber: 2,
                    IsActive: true
                });
            }
        }

        if (seats.length > 0) {
            await InternalSeat.bulkCreate(seats, { 
                transaction: transaction || null 
            });
        }
    }
}
