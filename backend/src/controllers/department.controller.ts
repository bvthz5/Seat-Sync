import { Request, Response } from "express";
import Department from "../models/Department.js";
import ProgramDepartment from "../models/ProgramDepartment.js";
import Student from "../models/Student.js";
import Program from "../models/Program.js";
import Semester from "../models/Semester.js";
import { sequelize } from "../config/database.js";
import { Op } from "sequelize";
import * as XLSX from 'xlsx';

export const getDepartments = async (req: Request, res: Response) => {
    try {
        const departments = await Department.findAll({ order: [["DepartmentName", "ASC"]] });
        // Attach program count via bridge table
        const progCounts = await ProgramDepartment.findAll({
            attributes: ["DepartmentID", [sequelize.fn("COUNT", sequelize.col("ProgramID")), "programCount"]],
            group: ["DepartmentID"],
            raw: true
        }) as any[];
        const countMap = new Map(progCounts.map((r: any) => [r.DepartmentID, parseInt(r.programCount || "0")]));
        const result = departments.map((d: any) => ({ ...d.toJSON(), programCount: countMap.get(d.DepartmentID) || 0 }));
        res.json(result);
    } catch (error: any) {
        console.error("Error fetching departments:", error);
        res.status(500).json({ message: error.message });
    }
};

export const createDepartment = async (req: Request, res: Response) => {
    try {
        const { DepartmentCode, DepartmentName } = req.body;
        if (!DepartmentCode || !DepartmentName) {
            return res.status(400).json({ message: "DepartmentCode and DepartmentName are required" });
        }
        // Enforce csa001-style code: lowercase letters + digits, 3-10 chars
        const codeNorm = DepartmentCode.toLowerCase().trim();
        if (!/^[a-z]{2,6}\d{3,6}$/.test(codeNorm)) {
            return res.status(400).json({ message: "Department code must be lowercase letters + digits, e.g. csa001" });
        }
        const existing = await Department.findOne({ where: { DepartmentCode: codeNorm } });
        if (existing) {
            return res.status(409).json({ message: `Department code '${codeNorm}' already exists` });
        }
        const newDepartment = await Department.create({ DepartmentCode: codeNorm, DepartmentName: DepartmentName.trim() });
        res.status(201).json({ ...newDepartment.toJSON(), programCount: 0 });
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
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const deptId = Number(id);
        const department = await Department.findByPk(deptId, { transaction: t });
        if (!department) {
            await t.rollback();
            return res.status(404).json({ message: "Department not found" });
        }

        // Get programs linked to this department via bridge table
        const progRows = await sequelize.query(
            `SELECT ProgramID FROM ProgramDepartments WHERE DepartmentID = ${deptId}`,
            { type: 'SELECT', transaction: t }
        ) as any[];
        const progIds = progRows.map((r: any) => r.ProgramID).filter(Boolean);

        if (progIds.length > 0) {
            const progList = progIds.join(',');
            // Get semesters under these programs
            const semRows = await sequelize.query(
                `SELECT SemesterID FROM Semesters WHERE ProgramID IN (${progList})`,
                { type: 'SELECT', transaction: t }
            ) as any[];
            const semIds = semRows.map((r: any) => r.SemesterID).filter(Boolean);

            if (semIds.length > 0) {
                const semList = semIds.join(',');
                // Get subjects under these semesters
                const subRows = await sequelize.query(
                    `SELECT SubjectID FROM Subjects WHERE SemesterID IN (${semList})`,
                    { type: 'SELECT', transaction: t }
                ) as any[];
                const subIds = subRows.map((r: any) => r.SubjectID).filter(Boolean);

                if (subIds.length > 0) {
                    const subList = subIds.join(',');
                    await sequelize.query(`DELETE FROM ExamRegistrations WHERE ExamID IN (SELECT ExamID FROM Exams WHERE SubjectID IN (${subList}))`, { transaction: t });
                    await sequelize.query(`DELETE FROM SeatAllocations WHERE ExamID IN (SELECT ExamID FROM Exams WHERE SubjectID IN (${subList}))`, { transaction: t });
                    await sequelize.query(`DELETE FROM Exams WHERE SubjectID IN (${subList})`, { transaction: t });
                    await sequelize.query(`DELETE FROM StudentSubjects WHERE SubjectID IN (${subList})`, { transaction: t });
                    await sequelize.query(`DELETE FROM InvigilatorSubjects WHERE SubjectID IN (${subList})`, { transaction: t });
                    await sequelize.query(`DELETE FROM Subjects WHERE SubjectID IN (${subList})`, { transaction: t });
                }
                await sequelize.query(`DELETE FROM ExamSeries WHERE SemesterID IN (${semList})`, { transaction: t });
                await sequelize.query(`UPDATE Students SET SemesterID = NULL WHERE SemesterID IN (${semList})`, { transaction: t });
                await sequelize.query(`DELETE FROM Semesters WHERE SemesterID IN (${semList})`, { transaction: t });
            }
            await sequelize.query(`DELETE FROM ProgramDepartments WHERE ProgramID IN (${progList})`, { transaction: t });
            // Only delete programs exclusively owned by this department (not shared)
            await sequelize.query(`DELETE FROM Programs WHERE ProgramID IN (${progList}) AND ProgramID NOT IN (SELECT ProgramID FROM ProgramDepartments)`, { transaction: t });
        }

        // Delete department-level linked data
        await sequelize.query(`DELETE FROM ProgramDepartments WHERE DepartmentID = ${deptId}`, { transaction: t });
        await sequelize.query(`UPDATE Students SET DepartmentID = NULL WHERE DepartmentID = ${deptId}`, { transaction: t });
        await department.destroy({ transaction: t });
        await t.commit();
        res.json({ message: "Department deleted successfully" });
    } catch (error: any) {
        await t.rollback();
        console.error("Delete department error:", error);
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
        if (!sheet) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid Excel file: Sheet not found" });
        }
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

export const importUnifiedDepartmentsPrograms = async (req: Request, res: Response) => {
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
            return res.status(400).json({ message: "Invalid Excel file: Sheet not found" });
        }
        const data: any[] = XLSX.utils.sheet_to_json(sheet);

        let successCount = 0;
        let errors: string[] = [];

        // Helper for short code
        const getShortCode = (name: string) => {
            const words = name.replace(/and|of|in|for|&|\./gi, ' ').split(/[\s-]+/).filter(Boolean);
            if (words.length === 1) return words[0]!.substring(0, 3).toLowerCase();
            return words.map(w => w[0]).join('').toLowerCase();
        };

        for (const row of data) {
            try {
                // columns: Programs, Program Code, Department Name, Department Code, Duration, Semesters
                const progName = row['Programs'] || row['Program Name'] || row['Program'];
                const explicitProgCode = row['Program Code'] || row['ProgramCode'];
                const deptName = row['Department Name'] || row['DepartmentName'] || row['Department'];
                const explicitDeptCode = row['Department Code'] || row['DepartmentCode'];
                const durationRaw = row['Duration'] || row['Duration Years'];
                const duration = parseInt(durationRaw, 10) || 4;
                const semestersRaw = row['Semesters'] || row['Total Semesters'];
                const semesters = parseInt(semestersRaw, 10) || (duration * 2);

                if (!progName || !deptName) {
                    throw new Error(`Missing Programs or Department Name`);
                }

                // 1. Department
                let deptCode = explicitDeptCode ? String(explicitDeptCode).trim().toLowerCase() : getShortCode(deptName) + '001';
                let department = await Department.findOne({ where: { DepartmentName: deptName }, transaction: t });
                if (!department) {
                    // Avoid code collision if not explicit
                    let uniqueCode = deptCode;
                    let counter = 1;
                    while (await Department.findOne({ where: { DepartmentCode: uniqueCode }, transaction: t })) {
                        if (explicitDeptCode) {
                            uniqueCode = deptCode + counter; // Append counter even to explicit if collision happens
                        } else {
                            uniqueCode = getShortCode(deptName) + String(counter).padStart(3, '0');
                        }
                        counter++;
                    }
                    department = await Department.create({
                        DepartmentCode: uniqueCode,
                        DepartmentName: deptName
                    }, { transaction: t });
                }

                // 2. Program
                let progCodeRaw = explicitProgCode ? String(explicitProgCode).trim().toLowerCase() : getShortCode(progName);
                let progCode = progCodeRaw;
                let program = await Program.findOne({ where: { ProgramName: progName }, transaction: t });
                
                if (!program) {
                    let uniqueProgCode = progCode;
                    let counter = 1;
                    while (await Program.findOne({ where: { ProgramCode: uniqueProgCode }, transaction: t })) {
                        counter++;
                        uniqueProgCode = progCodeRaw + counter;
                    }
                    program = await Program.create({
                        ProgramCode: uniqueProgCode,
                        ProgramName: progName,
                        DurationYears: duration,
                        TotalSemesters: semesters,
                        DepartmentID: department.DepartmentID, // legacy
                        IsActive: true
                    }, { transaction: t });

                    // Auto-generate semesters
                    const semesterList = Array.from({ length: semesters }, (_, i) => ({
                        SemesterNumber: i + 1,
                        SemesterName: `Semester ${i + 1}`,
                        ProgramID: program!.ProgramID,
                        IsActive: true
                    }));
                    if (semesterList.length > 0) {
                        await Semester.bulkCreate(semesterList, { transaction: t });
                    }
                }

                // 3. Link Program & Department (many-to-many bridge)
                await ProgramDepartment.findOrCreate({
                    where: { ProgramID: program!.ProgramID, DepartmentID: department.DepartmentID },
                    defaults: { ProgramID: program!.ProgramID, DepartmentID: department.DepartmentID },
                    transaction: t
                });

                successCount++;
            } catch (err: any) {
                errors.push(`Row error (${row['Programs'] || 'unknown'}): ${err.message}`);
            }
        }

        await t.commit();
        res.json({ message: "Import successful", successCount, errorCount: errors.length, errors });

    } catch (error: any) {
        await t.rollback();
        console.error("Import error:", error);
        res.status(500).json({ message: "Failed to import", error: error.message });
    }
};

export const exportUnifiedDepartmentProgramTemplate = async (req: Request, res: Response) => {
    const csv = 'Programs,Program Code,Department Name,Department Code,Duration,Semesters\nB.Tech Computer Science,btcs,Computer Science and Engineering,cse001,4,8\nM.Tech Data Science,mtds,Computer Science and Engineering,cse001,2,4\nBBA,bba,Business Administration,ba001,3,6\n';
    res.header('Content-Type', 'text/csv');
    res.attachment('academic_setup_template.csv');
    return res.send(csv);
};

export const deleteAllDepartments = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
        // Full cascade — same order as deleteProgram but for everything
        await sequelize.query(`DELETE FROM ExamRegistrations WHERE ExamID IN (SELECT ExamID FROM Exams WHERE SubjectID IN (SELECT SubjectID FROM Subjects))`, { transaction: t });
        await sequelize.query(`DELETE FROM SeatAllocations WHERE ExamID IN (SELECT ExamID FROM Exams WHERE SubjectID IN (SELECT SubjectID FROM Subjects))`, { transaction: t });
        await sequelize.query(`DELETE FROM Exams WHERE SubjectID IN (SELECT SubjectID FROM Subjects)`, { transaction: t });
        await sequelize.query(`DELETE FROM StudentSubjects`, { transaction: t });
        await sequelize.query(`DELETE FROM InvigilatorSubjects`, { transaction: t });
        await sequelize.query(`DELETE FROM Subjects`, { transaction: t });
        await sequelize.query(`DELETE FROM ExamSeries WHERE SemesterID IS NOT NULL`, { transaction: t });
        await sequelize.query(`UPDATE Students SET SemesterID = NULL WHERE SemesterID IS NOT NULL`, { transaction: t });
        await sequelize.query(`DELETE FROM Semesters`, { transaction: t });
        await sequelize.query(`DELETE FROM ProgramDepartments`, { transaction: t });
        await sequelize.query(`DELETE FROM Programs`, { transaction: t });
        await sequelize.query(`UPDATE Students SET DepartmentID = NULL WHERE DepartmentID IS NOT NULL`, { transaction: t });
        await sequelize.query(`DELETE FROM Departments`, { transaction: t });
        await t.commit();
        res.json({ message: "All departments deleted successfully" });
    } catch (error: any) {
        await t.rollback();
        console.error("Delete all departments error:", error);
        res.status(500).json({ message: "Failed to delete all departments", error: error.message });
    }
};
