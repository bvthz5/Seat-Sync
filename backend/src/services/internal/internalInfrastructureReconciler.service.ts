/**
 * internalInfrastructureReconciler.service.ts
 *
 * Dedicated reconciliation and validation service for Internal Infrastructure Import.
 * Computes:
 *   - sourceCapacity (from Excel / declared)
 *   - calculatedCapacity (sum(active row benches) * seatsPerBench)
 *   - generatedCapacity (physical active seats created in DB)
 * Classifies room status:
 *   - VALID: sourceCapacity matches calculatedCapacity exactly
 *   - CAPACITY_MISMATCH: declared capacity differs from calculated row layout
 *   - MISSING_SOURCE_CAPACITY: declared capacity is blank/null but row layout is present
 *   - INVALID_SOURCE_ROW: row contains desk/bench counts but missing a valid room name
 */

import { resolveRoomPattern, normalizeRoomKey } from "../../utils/internal/roomPatternResolver.js";

export type ReconciliationStatus = 'VALID' | 'CAPACITY_MISMATCH' | 'MISSING_SOURCE_CAPACITY' | 'INVALID_SOURCE_ROW';

export interface RowBenchDetail {
    label: string;
    benches: number;
}

export interface RoomReconciliationItem {
    rawIndex?: number | undefined;
    rawRoomCode: string;
    roomCode: string;
    normalizedRoomKey: string;
    blockName: string;
    floorNumber: number;
    roomType: "Classroom" | "Drawing Hall" | "Lab" | "Minor Room" | "Seminar Hall";
    seatMode: "Single" | "Dual" | "Mixed";
    seatsPerBench: number;
    sourceCapacity: number | null;
    calculatedCapacity: number;
    generatedCapacity?: number | undefined;
    rowLayout: number[];
    rowDetails: RowBenchDetail[];
    totalBenches: number;
    status: ReconciliationStatus;
    message: string;
    isUsable: boolean;
}

export interface ImportReconciliationSummary {
    totalRows: number;
    validCount: number;
    mismatchCount: number;
    missingCapacityCount: number;
    invalidRowCount: number;
    items: RoomReconciliationItem[];
}

export class InternalInfrastructureReconcilerService {

    static reconcile(parsed: any): RoomReconciliationItem {
        return this.reconcileRoom(parsed);
    }

    static reconcileRecord(parsed: any): RoomReconciliationItem {
        return this.reconcileRoom(parsed);
    }

    /**
     * Reconciles a single parsed room record.
     */
    static reconcileRoom(parsed: {
        rawIndex?: number;
        rawRoomCode?: string;
        blockName?: string;
        floorNumber?: number;
        roomType?: string;
        seatMode?: string;
        seatsPerBench?: number;
        sourceCapacity?: number | null;
        rowLayout?: number[];
        rowDetails?: RowBenchDetail[];
    }): RoomReconciliationItem {
        const rawCode = String(parsed.rawRoomCode || '').trim();
        const rowLayout = (parsed.rowLayout || []).filter(b => typeof b === 'number' && !isNaN(b) && b > 0);
        const totalBenches = rowLayout.reduce((sum, count) => sum + count, 0);

        // 1. Check for missing/blank room code
        if (!rawCode) {
            return {
                rawIndex: parsed.rawIndex,
                rawRoomCode: '',
                roomCode: '',
                normalizedRoomKey: '',
                blockName: parsed.blockName || 'MISC',
                floorNumber: parsed.floorNumber || 0,
                roomType: 'Classroom',
                seatMode: 'Dual',
                seatsPerBench: 2,
                sourceCapacity: parsed.sourceCapacity ?? null,
                calculatedCapacity: totalBenches * 2,
                rowLayout,
                rowDetails: parsed.rowDetails || [],
                totalBenches,
                status: 'INVALID_SOURCE_ROW',
                message: `Row has row desk data [${rowLayout.join(', ')}] but missing Room Code. Cannot import as a room.`,
                isUsable: false
            };
        }

        const resolved = resolveRoomPattern(rawCode);
        const blockName = parsed.blockName ? String(parsed.blockName).trim() : resolved.blockName;
        const floorNumber = parsed.floorNumber !== undefined && !isNaN(parsed.floorNumber) ? parsed.floorNumber : resolved.floorNumber;

        // 2. Resolve room type
        let roomType: "Classroom" | "Drawing Hall" | "Lab" | "Minor Room" | "Seminar Hall" = "Classroom";
        if (parsed.roomType) {
            const t = String(parsed.roomType).toLowerCase().trim();
            if (t.includes('drawing') || t.includes('hall')) roomType = "Drawing Hall";
            else if (t.includes('lab') || t.includes('workshop')) roomType = "Lab";
            else if (t.includes('seminar')) roomType = "Seminar Hall";
            else if (t.includes('minor')) roomType = "Minor Room";
        } else if (resolved.roomName.toUpperCase().includes("DRAWING HALL")) {
            roomType = "Drawing Hall";
        } else if (resolved.roomName.toUpperCase().includes("LAB")) {
            roomType = "Lab";
        }

        // 3. Resolve seat mode & seatsPerBench (Default: Dual = 2, Drawing Hall: Single = 1)
        let seatMode: "Single" | "Dual" | "Mixed" = roomType === "Drawing Hall" ? "Single" : "Dual";
        let seatsPerBench = seatMode === "Single" ? 1 : 2;

        if (parsed.seatMode) {
            const sm = String(parsed.seatMode).trim().toLowerCase();
            if (sm === 'single' || sm === '1') {
                seatMode = 'Single';
                seatsPerBench = 1;
            } else if (sm === 'dual' || sm === '2') {
                seatMode = 'Dual';
                seatsPerBench = 2;
            }
        } else if (parsed.seatsPerBench) {
            seatsPerBench = Number(parsed.seatsPerBench) === 1 ? 1 : 2;
            seatMode = seatsPerBench === 1 ? 'Single' : 'Dual';
        }

        // 4. Calculate physical capacity
        const calculatedCapacity = totalBenches * seatsPerBench;
        const sourceCapacity = parsed.sourceCapacity !== undefined && parsed.sourceCapacity !== null && !isNaN(parsed.sourceCapacity)
            ? Number(parsed.sourceCapacity)
            : null;

        // 5. Build row details A, B, C...
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const rowDetails: RowBenchDetail[] = parsed.rowDetails && parsed.rowDetails.length > 0
            ? parsed.rowDetails
            : rowLayout.map((benches, idx) => ({
                label: alphabet[idx] || `R${idx + 1}`,
                benches
            }));

        // 6. Determine reconciliation status
        let status: ReconciliationStatus = 'VALID';
        let message = 'Room layout and capacity are consistent.';

        if (sourceCapacity === null || sourceCapacity === undefined) {
            status = 'MISSING_SOURCE_CAPACITY';
            message = `Source capacity is blank in workbook. Physical capacity of ${calculatedCapacity} seats calculated from row layout (${rowLayout.join('+')} benches × ${seatsPerBench} seats/bench).`;
        } else if (sourceCapacity !== calculatedCapacity) {
            status = 'CAPACITY_MISMATCH';
            message = `Workbook declared capacity (${sourceCapacity}) does not match physical row layout: (${rowLayout.join('+')}=${totalBenches} benches × ${seatsPerBench} = ${calculatedCapacity} seats). Physical seating of ${calculatedCapacity} seats will be generated.`;
        } else {
            status = 'VALID';
            message = `Declared capacity (${sourceCapacity}) matches calculated physical layout (${totalBenches} benches × ${seatsPerBench} = ${calculatedCapacity} seats).`;
        }

        return {
            rawIndex: parsed.rawIndex,
            rawRoomCode: rawCode,
            roomCode: resolved.roomName,
            normalizedRoomKey: resolved.normalizedRoomKey,
            blockName,
            floorNumber,
            roomType,
            seatMode,
            seatsPerBench,
            sourceCapacity,
            calculatedCapacity,
            rowLayout,
            rowDetails,
            totalBenches,
            status,
            message,
            isUsable: true
        };
    }

    /**
     * Reconciles a full batch of parsed room entries.
     */
    static reconcileBatch(parsedItems: any[]): ImportReconciliationSummary {
        const items: RoomReconciliationItem[] = [];
        let validCount = 0;
        let mismatchCount = 0;
        let missingCapacityCount = 0;
        let invalidRowCount = 0;

        for (let i = 0; i < parsedItems.length; i++) {
            const item = this.reconcileRoom({ ...parsedItems[i], rawIndex: i + 1 });
            items.push(item);

            if (item.status === 'VALID') validCount++;
            else if (item.status === 'CAPACITY_MISMATCH') mismatchCount++;
            else if (item.status === 'MISSING_SOURCE_CAPACITY') missingCapacityCount++;
            else if (item.status === 'INVALID_SOURCE_ROW') invalidRowCount++;
        }

        return {
            totalRows: items.length,
            validCount,
            mismatchCount,
            missingCapacityCount,
            invalidRowCount,
            items
        };
    }
}
