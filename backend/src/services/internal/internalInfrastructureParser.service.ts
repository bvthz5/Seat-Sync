/**
 * internalInfrastructureParser.service.ts
 *
 * High-level parser service for extracting structural entities from raw input.
 */

import { resolveRoomPattern, ResolvedInfrastructure } from "../../utils/internal/roomPatternResolver.js";

export class InternalInfrastructureParserService {
    
    /**
     * Parses a raw room code/string into a structured infrastructure object.
     */
    static parse(raw: string): ResolvedInfrastructure {
        return resolveRoomPattern(raw);
    }

    /**
     * Extracts capacity from various formats.
     */
    static parseCapacity(raw: any): number {
        return parseInt(String(raw || 0)) || 0;
    }
}
