/**
 * roomPatternResolver.ts
 *
 * Intelligent engine for splitting Block/Room and detecting Floor numbers.
 * Preserves full room labels while extracting structural hierarchy.
 */

export interface ResolvedInfrastructure {
    blockName: string;
    roomName: string; // Preserved exactly (original display)
    roomCode: string; // Canonical identifier
    normalizedRoomKey: string; // Deterministic matching key (e.g., "SPB110")
    floorNumber: number;
}

export const normalizeRoomKey = (rawInput: string): string => {
    return String(rawInput || '').trim().toUpperCase().replace(/\s+/g, '');
};

export const resolveRoomPattern = (rawInput: string): ResolvedInfrastructure => {
    const raw = String(rawInput || '').trim();
    const normalizedRoomKey = normalizeRoomKey(raw);
    
    // Default values
    let blockName = "MISC";
    let roomName = raw;
    let roomCode = raw;
    let floorNumber = 0;

    // 1. Intelligent Block Extraction
    // Match the leading alphabetic prefix (handling space before numbers if any)
    const blockMatch = raw.match(/^([A-Za-z\s]+?)(?=\s*\d|$)/);
    if (blockMatch && blockMatch[1]) {
        const candidate = blockMatch[1].trim();
        if (candidate) blockName = candidate;
    }
    
    // Fallback/normalization for generic names
    if (!blockName || blockName.toUpperCase() === "CLASSROOM") {
        blockName = "MISC";
    }

    // 2. Floor Detection from Room Number
    // Extract first sequence of digits to infer floor
    const numMatch = raw.match(/(\d+)/);
    if (numMatch && numMatch[1]) {
        const num = parseInt(numMatch[1], 10);
        if (num >= 100) {
            // E.g. 100 series -> FL1, 200 series -> FL2, 400 series -> FL4, etc.
            floorNumber = Math.floor(num / 100);
        } else {
            // Numbers < 100 (e.g. NB 15, NB 24 -> ground floor / FL0)
            floorNumber = 0;
        }
    } else {
        floorNumber = 0;
    }

    return {
        blockName: blockName || "MISC",
        roomName: raw,
        roomCode: raw,
        normalizedRoomKey,
        floorNumber
    };
};
