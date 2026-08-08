/**
 * roomPatternResolver.ts
 *
 * Intelligent engine for splitting Block/Room and detecting Floor numbers.
 * Preserves full room labels while extracting structural hierarchy.
 */

export interface ResolvedInfrastructure {
    blockName: string;
    roomName: string; // Preserved exactly
    roomCode: string; // Internal identifier (often same as roomName)
    floorNumber: number;
}

export const resolveRoomPattern = (rawInput: string): ResolvedInfrastructure => {
    const raw = String(rawInput || '').trim();
    
    // Default values
    let blockName = "MISC";
    let roomName = raw;
    let roomCode = raw;
    let floorNumber = 0;

    // 1. Intelligent Block Extraction (Rule 2)
    // Use regex ^[A-Za-z\s]+ to match the alphabetic prefix
    const blockMatch = raw.match(/^([A-Za-z\s]+)/);
    if (blockMatch && blockMatch[1]) {
        blockName = blockMatch[1].trim();
    }
    
    // Fallback/normalization for common edge cases
    if (!blockName || blockName.toUpperCase() === "CLASSROOM") {
        blockName = "MISC";
    }

    // 2. Floor Detection from Room Number (Rule 3)
    // Extract the first sequence of digits to infer floor
    const numMatch = raw.match(/(\d+)/);
    if (numMatch && numMatch[1]) {
        const num = parseInt(numMatch[1], 10);
        if (num >= 100) {
            // E.g. 100 series -> FL1, 200 series -> FL2, etc.
            floorNumber = Math.floor(num / 100);
        } else {
            // Numbers < 100 (e.g. EH1 or ground floor rooms) -> FL0
            floorNumber = 0;
        }
    } else {
        floorNumber = 0; // No numeric floor
    }

    return {
        blockName: blockName || "MISC",
        roomName: raw, // PRESERVE EXACT VALUE (spaces, brackets, casing, hyphens, commas, etc.)
        roomCode: raw,
        floorNumber
    };
};
