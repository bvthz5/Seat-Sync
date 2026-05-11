/**
 * internalLayoutGenerator.service.ts
 *
 * Production-grade auto-layout engine for Internal Exam Rooms.
 * Generates dual-bench configurations and seat records automatically.
 */

import { InternalRoom } from "../../models/InternalRoom.js";
import { InternalSeat } from "../../models/InternalSeat.js";
import { Transaction } from "sequelize";

export class InternalLayoutGeneratorService {
    
    /**
     * Generates a balanced row layout for a given capacity.
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
     * Generates row layout based on specified benches per row (respects Excel column structure).
     * E.g., if capacity=60 and benchesPerRow=6, creates columns with 6 benches each.
     */
    static generateRowLayoutFromBenchesPerRow(capacity: number, benchesPerRow: number): number[] {
        const spb = 2; // Dual Seating
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
     */
    static async generateSeats(room: InternalRoom, transaction?: Transaction) {
        const layout = (room.RowLayout as number[]) || []; // Array of bench counts per row
        const spb = room.SeatsPerBench || 2; // Usually 2 for Internal
        
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const seats: any[] = [];

        for (let rIndex = 0; rIndex < layout.length; rIndex++) {
            const rowLabel = alphabet[rIndex] || `R${rIndex + 1}`;
            const benchCount = layout[rIndex] || 0;

            for (let bNum = 1; bNum <= benchCount; bNum++) {
                for (let sNum = 1; sNum <= spb; sNum++) {
                    seats.push({
                        RoomID: room.RoomID,
                        RowLabel: rowLabel,
                        BenchNumber: bNum,
                        SeatNumber: sNum,
                        IsActive: true
                    });
                }
            }
        }

        // Delete existing seats if any (safety)
        await InternalSeat.destroy({ 
            where: { RoomID: room.RoomID }, 
            transaction: transaction || null 
        });
        
        // Bulk create new seats
        if (seats.length > 0) {
            await InternalSeat.bulkCreate(seats, { 
                transaction: transaction || null 
            });
        }
    }
}
