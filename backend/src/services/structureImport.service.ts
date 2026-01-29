import csv from 'csv-parser';
import { Readable } from 'stream';
import { sequelize } from '../config/database.js';
import { Block } from '../models/Block.js';
import { Floor } from '../models/Floor.js';
import { Room } from '../models/Room.js';

interface CSVRow {
    BlockName?: string;
    FloorNumber?: string;
    RoomCode?: string;
    Capacity?: string;
    IsExamUsable?: string;
}

interface ImportResult {
    blocksCreated: number;
    floorsCreated: number;
    roomsCreated: number;
}

export class StructureImportService {
    async importFromCSV(fileBuffer: Buffer): Promise<ImportResult> {
        const rows: CSVRow[] = [];

        // 1. Parse CSV
        await new Promise<void>((resolve, reject) => {
            const stream = Readable.from(fileBuffer);
            stream
                .pipe(csv())
                .on('data', (data) => rows.push(data))
                .on('end', () => resolve())
                .on('error', (err) => reject(err));
        });

        if (rows.length === 0 || !rows[0]) {
            throw new Error("CSV file is empty");
        }

        // Validate Headers (Check first row keys)
        const requiredHeaders = ['BlockName', 'FloorNumber', 'RoomCode', 'Capacity', 'IsExamUsable'];
        const headers = Object.keys(rows[0]);
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
            throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
        }

        const transaction = await sequelize.transaction();
        let blocksCreated = 0;
        let floorsCreated = 0;
        let roomsCreated = 0;

        try {
            // 2. Validate & Process Rows
            const processedRooms = new Set<string>(); // Check duplicates within file

            const blockCache = new Map<string, number>(); // Name -> ID
            const floorCache = new Map<string, number>(); // BlockId-FloorNum -> ID

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                if (!row) continue;

                const lineNum = i + 2; // +1 for 0-index, +1 for header

                const blockName = row.BlockName?.trim();
                const floorNumStr = row.FloorNumber;
                const roomCode = row.RoomCode?.trim();
                const capacityStr = row.Capacity;

                // Row Validation
                if (!blockName) throw new Error(`Row ${lineNum}: BlockName is required`);
                if (!floorNumStr || isNaN(parseInt(floorNumStr))) throw new Error(`Row ${lineNum}: Invalid FloorNumber`);
                if (!roomCode) throw new Error(`Row ${lineNum}: RoomCode is required`);
                if (!capacityStr || isNaN(parseInt(capacityStr)) || parseInt(capacityStr) <= 0) throw new Error(`Row ${lineNum}: Invalid Capacity`);

                const floorNum = parseInt(floorNumStr);
                const capacity = parseInt(capacityStr);
                const isExamUsable = String(row.IsExamUsable).toLowerCase() === 'true';

                if (processedRooms.has(roomCode.toLowerCase())) {
                    throw new Error(`Row ${lineNum}: Duplicate RoomCode '${roomCode}' in CSV`);
                }
                processedRooms.add(roomCode.toLowerCase());

                // --- BLOCK Handling ---
                let blockId = blockCache.get(blockName.toLowerCase());
                if (!blockId) {
                    // Check DB
                    let block = await Block.findOne({ where: { BlockName: blockName }, transaction });
                    if (!block) {
                        block = await Block.create({ BlockName: blockName, Status: 'Active' }, { transaction });
                        blocksCreated++;
                    }
                    // Access ID safely
                    const toJSON = (block as any).toJSON ? (block as any).toJSON() : block;
                    blockId = toJSON.BlockID;
                    if (!blockId) throw new Error(`Failed to retrieve BlockID for ${blockName}`);

                    blockCache.set(blockName.toLowerCase(), blockId!);
                }

                // --- FLOOR Handling ---
                const floorKey = `${blockId}-${floorNum}`;
                let floorId = floorCache.get(floorKey);
                if (!floorId) {
                    let floor = await Floor.findOne({ where: { BlockID: blockId, FloorNumber: floorNum }, transaction });
                    if (!floor) {
                        floor = await Floor.create({ BlockID: blockId, FloorNumber: floorNum, Status: 'Active' }, { transaction });
                        floorsCreated++;
                    }
                    const toJSON = (floor as any).toJSON ? (floor as any).toJSON() : floor;
                    floorId = toJSON.FloorID;
                    if (!floorId) throw new Error(`Failed to retrieve FloorID for Floor ${floorNum}`);

                    floorCache.set(floorKey, floorId!);
                }

                // --- ROOM Handling ---
                const existingRoom = await Room.findOne({ where: { RoomCode: roomCode, FloorID: floorId }, transaction });
                if (existingRoom) {
                    throw new Error(`Row ${lineNum}: Room '${roomCode}' already exists on Block '${blockName}' Floor ${floorNum}`);
                }

                await Room.create({
                    RoomCode: roomCode,
                    BlockID: blockId,
                    FloorID: floorId,
                    Capacity: capacity,
                    ExamUsable: isExamUsable,
                    Status: 'Active',
                    TotalRows: 0,
                    BenchesPerRow: 0,
                    SeatsPerBench: 0
                }, { transaction });
                roomsCreated++;
            }

            await transaction.commit();

            return {
                blocksCreated,
                floorsCreated,
                roomsCreated
            };

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}
