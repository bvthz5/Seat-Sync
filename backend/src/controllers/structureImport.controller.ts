import { Request, Response } from "express";
import { StructureImportService } from "../services/structureImport.service.js";

const importService = new StructureImportService();

export const importStructureMetrics = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No CSV file uploaded" });
        }

        const result = await importService.importFromCSV(req.file.buffer);
        res.status(200).json(result);

    } catch (error: any) {
        // If it's a validation error, we send 400
        // If it's an internal error, 500
        // For simplicity, we assume validation errors are thrown with messages
        res.status(400).json({ message: error.message });
    }
};
