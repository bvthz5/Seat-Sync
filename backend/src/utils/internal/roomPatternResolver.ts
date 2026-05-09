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

    // 1. Intelligent Block Extraction
    // Logic: Look for leading letters before numbers or spaces
    // e.g., "MTB 206", "NB 19 (DRAWING HALL)", "EH1"
    const pattern = /^([a-zA-Z\s,()]+)(?:\s+)?(\d+.*)?$/;
    const match = raw.match(pattern);

    if (match) {
        let extractedBlock = (match[1] || '').trim();
        let extractedRest = (match[2] || '').trim();

        // If the block is very long (e.g., "CLASSROOM EH"), we might need to trim it
        // But the rule says preserve block name if it contains meaningful identifiers.
        
        // If it's a standard pattern like "MTB 206", block is "MTB"
        // If it's "NB 19 (DRAWING HALL)", block is "NB"
        
        // Refined Split: If first word is letters and followed by numbers/bracket
        const firstWordMatch = extractedBlock.match(/^([a-zA-Z]+)(.*)/);
        if (firstWordMatch) {
            blockName = (firstWordMatch[1] || '').trim().toUpperCase();
            
            // Safety: If block name is EH1, EH is block
            // Handle EH1 case
            if (!extractedRest && firstWordMatch[2]) {
                extractedRest = (firstWordMatch[2] as string).trim();
            }
        }

        // 2. Floor Detection
        // Look for 3-digit number to infer floor
        const numMatch = extractedRest.match(/(\d{3,})/);
        if (numMatch && numMatch[1]) {
            const num = parseInt(numMatch[1]);
            floorNumber = Math.floor(num / 100);
        } else {
            // Look for any number at the start of the rest
            const startNumMatch = extractedRest.match(/^(\d+)/);
            if (startNumMatch && startNumMatch[1]) {
                const num = parseInt(startNumMatch[1]);
                if (num < 10) {
                    floorNumber = 0; // Likely ground floor if small number
                }
            }
        }
    }

    return {
        blockName: blockName || "MISC",
        roomName: raw, // PRESERVE EXACT VALUE
        roomCode: raw,
        floorNumber
    };
};
