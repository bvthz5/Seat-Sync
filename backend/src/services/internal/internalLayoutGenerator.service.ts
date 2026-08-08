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
import { Transaction } from "sequelize";

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
            layout.push(take);
            remaining -= take;
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
            layout.push(take);
            remaining -= take;
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
            layout.push(take);
            remaining -= take;
        }
        
        return layout;
    }

    /**
     * Generates all seat records for a room based on its layout.
     * Dispatches to the correct generator based on SeatMode.
     */
    static async generateSeats(room: InternalRoom, transaction?: Transaction) {
        // Delete existing seats first (safety)
        await InternalSeat.destroy({ 
            where: { RoomID: room.RoomID }, 
            transaction: transaction || null 
        });

        if (room.SeatMode === 'Single') {
            await this.generateSingleSeatLayout(room, transaction);
        } else {
            await this.generateDualSeatLayout(room, transaction);
        }

        // Count active capacity of generated seats
        const activeCapacity = await InternalSeat.count({
            where: { RoomID: room.RoomID, IsActive: true },
            transaction: transaction || null
        });

        // Upsert InternalSeatLayout
        const [layout, created] = await InternalSeatLayout.findOrCreate({
            where: { RoomID: room.RoomID },
            defaults: {
                RoomID: room.RoomID,
                LayoutVersion: 1,
                TotalCapacity: room.TotalCapacity,
                ActiveCapacity: activeCapacity,
                SeatingMode: room.SeatMode as any,
                Pattern: 'standard',
                UpdatedAt: new Date()
            },
            transaction: transaction || null
        });

        if (!created) {
            layout.TotalCapacity = room.TotalCapacity;
            layout.ActiveCapacity = activeCapacity;
            layout.SeatingMode = room.SeatMode as any;
            layout.UpdatedAt = new Date();
            await layout.save({ transaction: transaction || null });
        }

        // Sync InternalSeatColumn records
        await InternalSeatColumn.destroy({
            where: { LayoutID: layout.LayoutID },
            transaction: transaction || null
        });

        const layoutArray = (room.RowLayout as number[]) || [];
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
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
