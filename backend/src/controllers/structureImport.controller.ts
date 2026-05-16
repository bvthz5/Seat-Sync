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
        
        const result = await importService.importFromCSV(req.file.buffer);
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

/**
 * Import structure from pre-processed JSON data (sent by frontend after client-side parsing)
 */
export const importStructureFromJSON = async (req: Request, res: Response) => {
    try {
        const { data } = req.body;

        if (!data || !Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ message: "No data provided for import" });
        }

        console.log('[DEBUG] JSON import received:', { records: data.length });

        const result = await importService.importFromJSON(data);
        res.status(200).json(result);

    } catch (error: any) {
        console.error("[JSON IMPORT ERROR]:", error.message);
        console.error("[JSON IMPORT STACK]:", error.stack);
        res.status(400).json({
            message: error.message,
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
