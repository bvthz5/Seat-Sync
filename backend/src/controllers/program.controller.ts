import { Request, Response } from "express";
import Program from "../models/Program.js";
import Department from "../models/Department.js";
import { sequelize } from "../config/database.js";
import * as XLSX from 'xlsx';

export const getPrograms = async (req: Request, res: Response) => {
    try {
        const programs = await Program.findAll({
            include: [{ model: Department, attributes: ['DepartmentCode', 'DepartmentName'] }]
        });
        res.json(programs);
    } catch (error: any) {
        console.error("Error fetching programs:", error);
        res.status(500).json({ message: error.message });
    }
};

export const createProgram = async (req: Request, res: Response) => {
    try {
        const { ProgramCode, ProgramName, DepartmentID, DurationYears } = req.body;
        const newProgram = await Program.create({
            ProgramCode,
            ProgramName,
            DepartmentID,
            DurationYears
        });
        res.status(201).json(newProgram);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateProgram = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { ProgramCode, ProgramName, DepartmentID, DurationYears } = req.body;

        const program = await Program.findByPk(Number(id));
        if (!program) {
            return res.status(404).json({ message: "Program not found" });
        }

        await program.update({ ProgramCode, ProgramName, DepartmentID, DurationYears });
        res.json(program);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteProgram = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const program = await Program.findByPk(Number(id));
        if (!program) {
            return res.status(404).json({ message: "Program not found" });
        }

        await program.destroy();
        res.json({ message: "Program deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const importPrograms = async (req: Request, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    const t = await sequelize.transaction();

    try {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid Excel file: No sheets found" });
        }
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid Excel file: Sheet data missing" });
        }
        const data: any[] = XLSX.utils.sheet_to_json(sheet);

        let successCount = 0;
        let errors: string[] = [];

        for (const row of data) {
            try {
                const programCode = row['ProgramCode'] || row['Program Code'] || row['Code'];
                const programName = row['ProgramName'] || row['Program Name'] || row['Name'];
                const deptCode = row['DepartmentCode'] || row['Department Code'] || row['Department'];
                const duration = row['DurationYears'] || row['Duration'] || 4;

                if (!programCode || !programName || !deptCode) {
                    throw new Error(`Missing required fields (ProgramCode, ProgramName, DepartmentCode)`);
                }

                // Find department by code
                const department = await Department.findOne({ where: { DepartmentCode: deptCode }, transaction: t });
                if (!department) {
                    throw new Error(`Department '${deptCode}' not found. Please import departments first.`);
                }

                // Check if program already exists
                const existing = await Program.findOne({ where: { ProgramCode: programCode }, transaction: t });

                if (existing) {
                    // Update existing
                    await existing.update({
                        ProgramName: programName,
                        DepartmentID: department.DepartmentID,
                        DurationYears: duration
                    }, { transaction: t });
                } else {
                    // Create new
                    await Program.create({
                        ProgramCode: programCode,
                        ProgramName: programName,
                        DepartmentID: department.DepartmentID,
                        DurationYears: duration
                    }, { transaction: t });
                }

                successCount++;
            } catch (err: any) {
                errors.push(`Row error (${row['ProgramCode'] || 'unknown'}): ${err.message}`);
            }
        }

        await t.commit();
        res.json({
            message: "Program import completed",
            successCount,
            errorCount: errors.length,
            errors: errors.slice(0, 10) // Return first 10 errors
        });

    } catch (error: any) {
        await t.rollback();
        console.error("Import error:", error);
        res.status(500).json({ message: "Import failed", error: error.message });
    }
};

export const exportProgramTemplate = async (req: Request, res: Response) => {
    try {
        const sampleData = [
            { ProgramCode: 'BTECH-CS', ProgramName: 'Bachelor of Technology in Computer Science', DepartmentCode: 'CS', DurationYears: 4 },
            { ProgramCode: 'MCA', ProgramName: 'Master of Computer Applications', DepartmentCode: 'CA', DurationYears: 2 },
            { ProgramCode: 'MCAI', ProgramName: 'Integrated Master of Computer Applications', DepartmentCode: 'CA', DurationYears: 5 },
        ];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(sampleData);

        // Set column widths
        ws['!cols'] = [
            { wch: 15 }, // ProgramCode
            { wch: 60 }, // ProgramName
            { wch: 15 }, // DepartmentCode
            { wch: 12 }  // DurationYears
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Programs');

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', 'attachment; filename=program_template.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error: any) {
        console.error("Template export error:", error);
        res.status(500).json({ message: "Failed to generate template", error: error.message });
    }
};
