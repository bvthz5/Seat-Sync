/**
 * infrastructureNormalizer.ts
 *
 * High-fidelity data normalizer and parser for Internal Infrastructure Import.
 * Handles:
 *   - Sheet1 multi-tier headers and merged headers
 *   - Sheet2 headerless 2D arrays
 *   - CSV & structured JSON objects
 *   - Dynamic row layouts (A-Z)
 *   - Preserves source capacity and calculated physical seating
 *   - Identifies invalid / empty-room rows without discarding data or creating dummy rooms
 */

import { normalizeRoomKey, resolveRoomPattern } from "./roomPatternResolver.js";

export interface NormalizedInfrastructureRecord {
    rawIndex?: number | undefined;
    rawRoomCode: string;
    blockName?: string | undefined;
    floorNumber?: number | undefined;
    roomType?: string | undefined;
    seatMode?: string | undefined;
    seatsPerBench?: number | undefined;
    sourceCapacity: number | null;
    rowLayout: number[];
    rowDetails: { label: string; benches: number }[];
    isHeaderOrGarbage?: boolean | undefined;
}

const GARBAGE_PATTERNS = [
    "disregard",
    "principal",
    "signature",
    "date:",
    "office use",
    "room availability",
    "distribution",
    "total rooms",
    "sl no",
    "serial no"
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Finds a property value by flexible pattern matching across object keys.
 */
export const getValueByPatterns = (row: any, patterns: string[]): any => {
    if (!row || typeof row !== 'object') return undefined;
    const keys = Object.keys(row);
    for (const pattern of patterns) {
        const cleanPattern = pattern.toLowerCase().replace(/[\s_\-]+/g, '');
        const matchingKey = keys.find(k => k.toLowerCase().replace(/[\s_\-]+/g, '') === cleanPattern);
        if (matchingKey !== undefined && row[matchingKey] !== undefined && row[matchingKey] !== null) {
            return row[matchingKey];
        }
    }
    return undefined;
};

/**
 * Checks if a string contains any garbage patterns (checking values, not key names).
 */
const containsGarbage = (values: string[]): boolean => {
    const combined = values.join(' ').toLowerCase();
    return GARBAGE_PATTERNS.some(p => combined.includes(p));
};

/**
 * Parses a single row (Array or Object) into a NormalizedInfrastructureRecord.
 */
export const parseInfrastructureRow = (row: any, index: number = 0): NormalizedInfrastructureRecord | null => {
    if (!row) return null;

    // ─────────────────────────────────────────────────────────────
    // CASE 1: Array representation (e.g. headerless Sheet2 or 2D array)
    // ─────────────────────────────────────────────────────────────
    if (Array.isArray(row)) {
        if (row.length === 0 || row.every(cell => cell === '' || cell === null || cell === undefined)) {
            return null; // pure empty row
        }

        const stringValues = row.map(c => String(c || '').trim());
        if (containsGarbage(stringValues)) {
            return null;
        }

        const firstCell = stringValues[0] || '';

        // Header checks
        if (firstCell.toLowerCase() === 'room number with block' || firstCell.toLowerCase() === 'room code' || firstCell.toLowerCase() === 'room') {
            return null;
        }
        if (stringValues.some(cell => cell.toLowerCase().includes('row a') || cell.toLowerCase().includes('row b') || cell.toLowerCase().includes('number of desks'))) {
            return null;
        }

        const rawRoomCode = firstCell;
        const rowLayout: number[] = [];
        const rowDetails: { label: string; benches: number }[] = [];
        let sourceCapacity: number | null = null;

        // If the array has 8 or more columns (e.g. Room, A, B, C, D, E, F, Capacity, ...)
        if (row.length >= 8) {
            // Cols 1..6 are Rows A, B, C, D, E, F
            for (let c = 1; c <= 6; c++) {
                const val = row[c];
                const count = (val !== '' && val !== null && val !== undefined) ? parseInt(String(val).trim(), 10) : 0;
                const benchCount = !isNaN(count) ? count : 0;
                const rowLabel = ALPHABET[c - 1] || 'A';
                rowDetails.push({ label: rowLabel, benches: benchCount });
                if (benchCount > 0) {
                    rowLayout.push(benchCount);
                }
            }

            // Col 7 is Total Capacity
            const capVal = row[7];
            if (capVal !== '' && capVal !== null && capVal !== undefined && String(capVal).trim() !== '') {
                const parsedCap = parseInt(String(capVal).trim(), 10);
                if (!isNaN(parsedCap)) {
                    sourceCapacity = parsedCap;
                }
            }
        } else {
            // Shorter array: determine if last column is capacity
            let lastIdx = row.length - 1;
            while (lastIdx > 0 && (row[lastIdx] === '' || row[lastIdx] === null || row[lastIdx] === undefined)) {
                lastIdx--;
            }

            if (lastIdx > 1) {
                const possibleCapVal = row[lastIdx];
                if (possibleCapVal !== '' && possibleCapVal !== null && possibleCapVal !== undefined && String(possibleCapVal).trim() !== '') {
                    const parsedCap = parseInt(String(possibleCapVal).trim(), 10);
                    if (!isNaN(parsedCap)) {
                        sourceCapacity = parsedCap;
                    }
                }
            }

            const endRowIdx = sourceCapacity !== null ? lastIdx : (lastIdx + 1);
            for (let c = 1; c < endRowIdx; c++) {
                const val = row[c];
                if (val !== '' && val !== null && val !== undefined && String(val).trim() !== '') {
                    const count = parseInt(String(val).trim(), 10);
                    if (!isNaN(count)) {
                        const rowLabel = ALPHABET[c - 1] || `R${c}`;
                        rowDetails.push({ label: rowLabel, benches: count });
                        if (count > 0) {
                            rowLayout.push(count);
                        }
                    }
                }
            }
        }

        if (!rawRoomCode && rowLayout.length === 0 && sourceCapacity === null) {
            return null;
        }

        return {
            rawIndex: index + 1,
            rawRoomCode,
            sourceCapacity,
            rowLayout,
            rowDetails
        };
    }

    // ─────────────────────────────────────────────────────────────
    // CASE 2: Object representation (JSON / sheet_to_json / CSV)
    // ─────────────────────────────────────────────────────────────
    if (typeof row === 'object') {
        const valuesOnly = Object.values(row).map(v => String(v || '').trim());
        if (containsGarbage(valuesOnly)) {
            return null;
        }

        const rawRoomCodeVal = getValueByPatterns(row, [
            'RoomCode', 'RoomName', 'Room Number with block', 'Room Number', 'Room', 'Code', 'Classroom'
        ]);

        const rawRoomCode = rawRoomCodeVal !== undefined && rawRoomCodeVal !== null ? String(rawRoomCodeVal).trim() : '';

        // Header check
        if (rawRoomCode.toLowerCase() === 'room code' || rawRoomCode.toLowerCase() === 'room number with block' || rawRoomCode.toLowerCase() === 'code') {
            return null;
        }
        if (valuesOnly.some(v => v.toLowerCase().includes('row a') || v.toLowerCase().includes('row b'))) {
            return null;
        }

        const blockVal = getValueByPatterns(row, ['BlockName', 'Block', 'Building']);
        const floorVal = getValueByPatterns(row, ['FloorNumber', 'Floor', 'Level']);
        const capacityVal = getValueByPatterns(row, ['Capacity', 'TotalCapacity', 'Total Capacity', 'Cap', 'Seats', 'Total Seats', 'Total']);
        const colsVal = getValueByPatterns(row, ['Columns', 'Cols', 'ColumnCount', 'ColCount', 'Column']);
        const rowsVal = getValueByPatterns(row, ['Rows', 'Benches', 'BenchesPerRow', 'RowCount', 'Row']);
        const typeVal = getValueByPatterns(row, ['RoomType', 'Type', 'Room Type', 'ClassroomType']);
        const seatModeVal = getValueByPatterns(row, ['SeatMode', 'SeatsPerBench', 'SeatingSchema', 'Schema']);

        let sourceCapacity: number | null = null;
        if (capacityVal !== undefined && capacityVal !== null && String(capacityVal).trim() !== '') {
            const parsed = parseInt(String(capacityVal).trim(), 10);
            if (!isNaN(parsed)) {
                sourceCapacity = parsed;
            }
        }

        let floorNumber: number | undefined = undefined;
        if (floorVal !== undefined && floorVal !== null && String(floorVal).trim() !== '') {
            const parsed = parseInt(String(floorVal).trim(), 10);
            if (!isNaN(parsed)) {
                floorNumber = parsed;
            }
        }

        const rowLayout: number[] = [];
        const rowDetails: { label: string; benches: number }[] = [];

        // Strategy A: Explicit columns and rows count
        if (colsVal !== undefined && colsVal !== null && rowsVal !== undefined && rowsVal !== null) {
            const cCount = parseInt(String(colsVal).trim(), 10);
            const rCount = parseInt(String(rowsVal).trim(), 10);
            if (!isNaN(cCount) && cCount > 0 && !isNaN(rCount) && rCount > 0) {
                for (let i = 0; i < cCount; i++) {
                    const label = ALPHABET[i] || `R${i + 1}`;
                    rowLayout.push(rCount);
                    rowDetails.push({ label, benches: rCount });
                }
            }
        }

        // Strategy B: Alphabetic Row Columns (A, B, C, D, E, F, G...)
        if (rowLayout.length === 0) {
            for (let i = 0; i < ALPHABET.length; i++) {
                const label = ALPHABET[i] || 'A';
                const patterns = [
                    `Row ${label}`,
                    `Row${label}`,
                    `Row_${label}`,
                    label,
                    `Column ${label}`,
                    `Column${label}`,
                    `Col ${label}`,
                    `Col${label}`
                ];
                const val = getValueByPatterns(row, patterns);
                if (val !== undefined && val !== null && String(val).trim() !== '') {
                    const benches = parseInt(String(val).trim(), 10);
                    if (!isNaN(benches)) {
                        rowDetails.push({ label, benches });
                        if (benches > 0) {
                            rowLayout.push(benches);
                        }
                    }
                }
            }
        }

        // Strategy C: Sequential numeric or empty columns (like Sheet1 parsed with merged title header)
        // E.g.:
        // Key 1: "Number of Desks available..." (Row A!)
        // Key 2: "__EMPTY" (Row B!)
        // Key 3: "__EMPTY_1" (Row C!)
        // Key 4: "__EMPTY_2" (Row D!)
        // Key 5: "__EMPTY_3" (Row E!)
        // Key 6: "__EMPTY_4" (Row F!)
        if (rowLayout.length === 0) {
            const keys = Object.keys(row);
            const reservedPatterns = [
                'room', 'code', 'capacity', 'cap', 'total', 'block', 'floor', 'level', 'type', 'mode', 'schema'
            ];

            let rowIdx = 0;
            for (const k of keys) {
                const kLower = k.toLowerCase().replace(/[\s_\-]+/g, '');
                // Allow "Number of Desks..." key as Row A
                if (reservedPatterns.some(p => kLower.includes(p)) && !kLower.includes('numberofdesks')) {
                    continue;
                }

                const val = row[k];
                if (val !== undefined && val !== null && String(val).trim() !== '') {
                    const benches = parseInt(String(val).trim(), 10);
                    if (!isNaN(benches)) {
                        const label = ALPHABET[rowIdx] || `R${rowIdx + 1}`;
                        rowDetails.push({ label, benches });
                        if (benches > 0) {
                            rowLayout.push(benches);
                        }
                        rowIdx++;
                    }
                }
            }
        }

        // If the row has neither room code nor row data nor capacity, it's completely empty
        if (!rawRoomCode && rowLayout.length === 0 && sourceCapacity === null) {
            return null;
        }

        return {
            rawIndex: index + 1,
            rawRoomCode,
            blockName: blockVal ? String(blockVal).trim() : undefined,
            floorNumber,
            roomType: typeVal ? String(typeVal).trim() : undefined,
            seatMode: seatModeVal ? String(seatModeVal).trim() : undefined,
            sourceCapacity,
            rowLayout,
            rowDetails
        };
    }

    return null;
};

/**
 * Normalizes an entire raw data array (2D array or Object array) into clean records.
 */
export const normalizeInfrastructureData = (rawData: any[]): NormalizedInfrastructureRecord[] => {
    if (!rawData || !Array.isArray(rawData)) return [];

    const results: NormalizedInfrastructureRecord[] = [];
    for (let i = 0; i < rawData.length; i++) {
        const parsed = parseInfrastructureRow(rawData[i], i);
        if (parsed) {
            results.push(parsed);
        }
    }
    return results;
};
