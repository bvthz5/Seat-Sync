import { Request, Response } from "express";
import { StructureImportService } from "../services/structureImport.service.js";

const importService = new StructureImportService();

export const importStructureMetrics = async (req: Request, res: Response) => {
    try {
        console.log('[DEBUG] Import request received:', { 
            hasFile: !!req.file,
            fileName: req.file?.originalname,
            fileSize: req.file?.size,
            body: req.body,
            headers: req.headers
        });
        
        if (!req.file) {
            console.error('[ERROR] No file uploaded in request');
            return res.status(400).json({ message: "No CSV file uploaded" });
        }
        
        const autoZone = req.body.autoZone === 'true' || req.body.autoZone === true;
        const zoneCount = parseInt(req.body.zoneCount, 10) || 3;

        console.log('[DEBUG] Processing import with:', { autoZone, zoneCount });
        const result = await importService.importFromCSV(req.file.buffer, { autoZone, zoneCount });
        res.status(200).json(result);

    } catch (error: any) {        
        console.error("[IMPORT ERROR]:", error.message);
        console.error("[IMPORT STACK]:", error.stack);
        res.status(400).json({ 
            message: error.message,
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
