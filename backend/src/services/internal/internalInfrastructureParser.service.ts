/**
 * internalInfrastructureParser.service.ts
 *
 * High-level parser service for extracting structural entities from raw input.
 */

import { resolveRoomPattern, normalizeRoomKey, ResolvedInfrastructure } from "../../utils/internal/roomPatternResolver.js";
import { normalizeInfrastructureData, parseInfrastructureRow, NormalizedInfrastructureRecord } from "../../utils/internal/infrastructureNormalizer.js";
import { InternalInfrastructureReconcilerService, ImportReconciliationSummary, RoomReconciliationItem } from "./internalInfrastructureReconciler.service.js";

export class InternalInfrastructureParserService {
    
    /**
     * Parses a raw room code/string into a structured infrastructure object.
     */
    static parse(raw: string): ResolvedInfrastructure {
        return resolveRoomPattern(raw);
    }

    /**
     * Normalizes raw room code for identity matching.
     */
    static normalizeKey(raw: string): string {
        return normalizeRoomKey(raw);
    }

    /**
     * Normalizes an entire raw dataset (CSV, 2D array, or JSON).
     */
    static normalizeDataset(rawData: any[]): NormalizedInfrastructureRecord[] {
        return normalizeInfrastructureData(rawData);
    }

    /**
     * Reconciles a dataset and produces full validation/capacity audit summary.
     */
    static reconcileDataset(rawData: any[]): ImportReconciliationSummary {
        const normalized = normalizeInfrastructureData(rawData);
        return InternalInfrastructureReconcilerService.reconcileBatch(normalized);
    }

    /**
     * Extracts capacity from various formats.
     */
    static parseCapacity(raw: any): number {
        return parseInt(String(raw || 0), 10) || 0;
    }
}
