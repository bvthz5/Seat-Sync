/**
 * infrastructureNormalizer.ts
 *
 * Cleans raw Excel/CSV data for the Internal Infrastructure Engine.
 * Removes headers, empty rows, and garbage like signatures or disregard notes.
 */

const getValueByPatterns = (row: any, patterns: string[]): any => {
    if (!row) return undefined;
    const keys = Object.keys(row);
    for (const pattern of patterns) {
        const matchingKey = keys.find(k => k.toLowerCase().replace(/[\s_\-]+/g, '') === pattern.toLowerCase().replace(/[\s_\-]+/g, ''));
        if (matchingKey && row[matchingKey] !== undefined && row[matchingKey] !== null) {
            return row[matchingKey];
        }
    }
    return undefined;
};

export const normalizeInfrastructureData = (rawData: any[]): any[] => {
    if (!rawData || !Array.isArray(rawData)) return [];

    return rawData.filter(row => {
        if (!row) return false;
        
        // Convert row to string to check for common garbage patterns
        const rowStr = JSON.stringify(row).toLowerCase();
        
        // Garbage patterns to reject
        const garbage = [
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

        if (garbage.some(p => rowStr.includes(p))) return false;

        // Extract potential room code using flexible pattern matching
        const roomCode = String(getValueByPatterns(row, ['RoomCode', 'RoomName', 'Room', 'Code']) || '').trim();
        
        // Must have a room code and it shouldn't be a generic header
        if (!roomCode || roomCode.toLowerCase() === 'room code' || roomCode.toLowerCase() === 'code' || roomCode.toLowerCase() === 'room') return false;

        return true;
    });
};
