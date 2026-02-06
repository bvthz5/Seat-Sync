import { Request, Response } from "express";
import Department from "../models/Department.js";
import Student from "../models/Student.js";
import { sequelize } from "../config/database.js";
import * as XLSX from 'xlsx';

export const getDepartments = async (req: Request, res: Response) => {
    try {
        const departments = await Department.findAll();
        // TODO: Re-implement student count efficiently. 
        // The previous literal subquery caused aliasing issues.
        res.json(departments);
    } catch (error: any) {
        console.error("Error fetching departments:", error);
        res.status(500).json({ message: error.message });
    }
};

export const createDepartment = async (req: Request, res: Response) => {
    try {
        const { DepartmentCode, DepartmentName } = req.body;
        const newDepartment = await Department.create({
            DepartmentCode,
            DepartmentName,
        });
        res.status(201).json(newDepartment);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateDepartment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { DepartmentCode, DepartmentName } = req.body;

        const department = await Department.findByPk(id as string);
        if (!department) {
            return res.status(404).json({ message: "Department not found" });
        }

        await department.update({ DepartmentCode, DepartmentName });
        res.json(department);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteDepartment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const department = await Department.findByPk(id as string);
        if (!department) {
            return res.status(404).json({ message: "Department not found" });
        }

        await department.destroy();
        res.json({ message: "Department deleted successfully" });
    } catch (error: any) {
        console.error("Delete department error:", error);
        if (error.name === 'SequelizeForeignKeyConstraintError' || error.original?.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({
                message: "Cannot delete department because it has associated data (programs, students, or faculty). Please remove related data first."
            });
        }
        res.status(500).json({ message: error.message });
    }
};

export const getDepartmentById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const department = await Department.findByPk(Number(id), {
            include: ["Faculties"],
            // attributes include removed temporarily
        });

        if (!department) {
            return res.status(404).json({ message: "Department not found" });
        }
        res.json(department);
    } catch (error: any) {
        console.error("Error fetching department by ID:", error);
        res.status(500).json({ message: error.message });
    }
};

export const importDepartments = async (req: Request, res: Response) => {
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
        const data: any[] = XLSX.utils.sheet_to_json(sheet);

        let successCount = 0;
        let errors: string[] = [];

        for (const row of data) {
            try {
                const deptCode = row['DepartmentCode'] || row['Department Code'] || row['Code'];
                const deptName = row['DepartmentName'] || row['Department Name'] || row['Name'];

                if (!deptCode || !deptName) {
                    throw new Error(`Missing required fields (DepartmentCode, DepartmentName)`);
                }

                // Check if department already exists
                const existing = await Department.findOne({ where: { DepartmentCode: deptCode }, transaction: t });

                if (existing) {
                    // Update existing
                    await existing.update({ DepartmentName: deptName }, { transaction: t });
                } else {
                    // Create new
                    await Department.create({
                        DepartmentCode: deptCode,
                        DepartmentName: deptName
                    }, { transaction: t });
                }

                successCount++;
            } catch (err: any) {
                errors.push(`Row error (${row['DepartmentCode'] || 'unknown'}): ${err.message}`);
            }
        }

        await t.commit();
        res.json({
            message: "Department import completed",
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

export const exportDepartmentTemplate = async (req: Request, res: Response) => {
    try {
        const sampleData = [
            { DepartmentCode: 'CS', DepartmentName: 'Computer Science and Engineering' },
            { DepartmentCode: 'ME', DepartmentName: 'Mechanical Engineering' },
            { DepartmentCode: 'EC', DepartmentName: 'Electronics and Communication Engineering' },
        ];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(sampleData);

        // Set column widths
        ws['!cols'] = [
            { wch: 15 }, // DepartmentCode
            { wch: 50 }  // DepartmentName
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Departments');

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', 'attachment; filename=department_template.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error: any) {
        console.error("Template export error:", error);
        res.status(500).json({ message: "Failed to generate template", error: error.message });
    }
};

export const deleteAllDepartments = async (req: Request, res: Response) => {
    try {
        const count = await Department.destroy({ where: {}, truncate: true });
        res.json({ message: `Successfully deleted all departments`, count });
    } catch (error: any) {
        console.error("Delete all departments error:", error);
        if (error.name === 'SequelizeForeignKeyConstraintError' || error.original?.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({
                message: "Cannot delete departments because some have associated data (programs, students, or faculty). Please remove related data first."
            });
        }
        res.status(500).json({ message: "Failed to delete all departments", error: error.message });
    }
};
