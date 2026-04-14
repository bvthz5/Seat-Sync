import { Request, Response } from "express";
import { Program, Department, ProgramDepartment, Semester } from "../models/index.js";
import { sequelize } from "../config/database.js";
import * as XLSX from 'xlsx';

// ──────────────────────────────────────────────────────────────
// GET /api/programs
// Returns all programs with their linked departments (many-to-many)
// ──────────────────────────────────────────────────────────────
export const getPrograms = async (req: Request, res: Response) => {
    try {
        const { departmentId, page, limit } = req.query;
        const pageNum = parseInt(page as string) || 1;
        const limitNum = parseInt(limit as string) || 10;
        const isPaginated = page !== undefined && limit !== undefined;

        let includeCondition: any = {
            model: Department,
            as: "Departments",
            attributes: ["DepartmentID", "DepartmentCode", "DepartmentName"],
            through: { attributes: [] }
        };

        if (departmentId) {
            includeCondition.where = { DepartmentID: parseInt(departmentId as string) };
            includeCondition.required = true;
        }

        if (isPaginated && limitNum > 0) {
            const offset = (pageNum - 1) * limitNum;
            const { count, rows: programs } = await Program.findAndCountAll({
                include: [includeCondition],
                order: [["ProgramName", "ASC"]],
                limit: limitNum,
                offset,
                distinct: true
            });

            return res.json({
                data: programs,
                total: count,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(count / limitNum)
            });
        }

        let programs = await Program.findAll({
            include: [includeCondition],
            order: [["ProgramName", "ASC"]]
        });

        res.json(programs);
    } catch (error: any) {
        console.error("Error fetching programs:", error);
        res.status(500).json({ message: error.message });
    }
};

// ──────────────────────────────────────────────────────────────
// POST /api/programs
// Creates a program and links it to one or more departments.
// Auto-generates semesters for the program.
// ──────────────────────────────────────────────────────────────
export const createProgram = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
        const { ProgramCode, ProgramName, DepartmentIDs, DurationYears } = req.body;

        if (!ProgramCode || !ProgramName || !DurationYears) {
            await t.rollback();
            return res.status(400).json({ message: "ProgramCode, ProgramName, and DurationYears are required" });
        }

        const deptIds: number[] = Array.isArray(DepartmentIDs) ? DepartmentIDs : [DepartmentIDs].filter(Boolean);
        if (deptIds.length === 0) {
            await t.rollback();
            return res.status(400).json({ message: "At least one Department is required" });
        }

        const duration = parseInt(String(DurationYears), 10);
        if (isNaN(duration) || duration < 1 || duration > 5) {
            await t.rollback();
            return res.status(400).json({ message: "DurationYears must be between 1 and 5" });
        }

        // Verify all departments exist
        const departments = await Department.findAll({ where: { DepartmentID: deptIds }, transaction: t });
        if (departments.length !== deptIds.length) {
            await t.rollback();
            return res.status(400).json({ message: "One or more departments not found" });
        }

        // Check duplicate code
        const existing = await Program.findOne({ where: { ProgramCode }, transaction: t });
        if (existing) {
            await t.rollback();
            return res.status(409).json({ message: `Program code '${ProgramCode}' already exists` });
        }

        const totalSemesters = duration * 2;

        // Use first department as legacy FK (guaranteed to exist)
        const legacyDeptId: number = deptIds[0]!;
        const newProgram = await Program.create({
            ProgramCode,
            ProgramName,
            DurationYears: duration,
            TotalSemesters: totalSemesters,
            DepartmentID: legacyDeptId,
            IsActive: true
        }, { transaction: t });

        // Bridge table entries (all departments)
        await ProgramDepartment.bulkCreate(
            deptIds.map(dId => ({ ProgramID: newProgram.ProgramID, DepartmentID: dId })),
            { transaction: t }
        );

        // Auto-generate semesters
        const { Semester } = await import("../models/index.js");
        const semesters = Array.from({ length: totalSemesters }, (_, i) => ({
            SemesterNumber: i + 1,
            SemesterName: `Semester ${i + 1}`,
            ProgramID: newProgram.ProgramID,
            IsActive: true
        }));
        if (semesters.length > 0) {
            await Semester.bulkCreate(semesters, { transaction: t });
        }

        await t.commit();

        // Return with departments included
        const result = await Program.findByPk(newProgram.ProgramID, {
            include: [{ model: Department, as: "Departments", attributes: ["DepartmentID", "DepartmentCode", "DepartmentName"], through: { attributes: [] } }]
        });

        res.status(201).json(result);
    } catch (error: any) {
        await t.rollback();
        console.error("Create program error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ──────────────────────────────────────────────────────────────
// PUT /api/programs/:id
// ──────────────────────────────────────────────────────────────
export const updateProgram = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { ProgramCode, ProgramName, DepartmentIDs, DurationYears } = req.body;

        const program = await Program.findByPk(Number(id), { transaction: t });
        if (!program) {
            await t.rollback();
            return res.status(404).json({ message: "Program not found" });
        }

        const duration = DurationYears ? parseInt(String(DurationYears), 10) : program.DurationYears!;
        const totalSemesters = duration * 2;

        await program.update({
            ProgramCode: ProgramCode || program.ProgramCode,
            ProgramName: ProgramName || program.ProgramName,
            DurationYears: duration,
            TotalSemesters: totalSemesters,
            DepartmentID: DepartmentIDs?.[0] || program.DepartmentID
        }, { transaction: t });

        // Re-sync bridge table if departments changed
        if (DepartmentIDs && DepartmentIDs.length > 0) {
            await ProgramDepartment.destroy({ where: { ProgramID: program.ProgramID }, transaction: t });
            await ProgramDepartment.bulkCreate(
                DepartmentIDs.map((dId: number) => ({ ProgramID: program.ProgramID, DepartmentID: dId })),
                { transaction: t }
            );
        }

        // Ensure new semesters exist if duration increased (static import — no dynamic import inside tx)
        const existingCount = await Semester.count({ where: { ProgramID: program.ProgramID }, transaction: t });
        if (totalSemesters > existingCount) {
            const newSems = Array.from({ length: totalSemesters - existingCount }, (_, i) => ({
                SemesterNumber: existingCount + i + 1,
                SemesterName: `Semester ${existingCount + i + 1}`,
                ProgramID: program.ProgramID,
                IsActive: true
            }));
            await Semester.bulkCreate(newSems, { transaction: t });
        }

        await t.commit();
        res.json({ message: "Program updated successfully" });
    } catch (error: any) {
        await t.rollback();
        console.error("Update program error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ──────────────────────────────────────────────────────────────
// DELETE /api/programs/:id
// ──────────────────────────────────────────────────────────────
export const deleteProgram = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const programId = Number(id);
        const program = await Program.findByPk(programId, { transaction: t });
        if (!program) {
            await t.rollback();
            return res.status(404).json({ message: "Program not found" });
        }

        // Get all semester IDs under this program
        const semRows = await sequelize.query(
            `SELECT SemesterID FROM Semesters WHERE ProgramID = ${programId}`,
            { type: 'SELECT', transaction: t }
        ) as any[];
        const semIds = semRows.map((r: any) => r.SemesterID).filter(Boolean);

        if (semIds.length > 0) {
            const semList = semIds.join(',');
            // Get subject IDs under these semesters
            const subRows = await sequelize.query(
                `SELECT SubjectID FROM Subjects WHERE SemesterID IN (${semList})`,
                { type: 'SELECT', transaction: t }
            ) as any[];
            const subIds = subRows.map((r: any) => r.SubjectID).filter(Boolean);

            if (subIds.length > 0) {
                const subList = subIds.join(',');
                // Delete everything that references SubjectID
                await sequelize.query(`DELETE FROM ExamRegistrations WHERE ExamID IN (SELECT ExamID FROM Exams WHERE SubjectID IN (${subList}))`, { transaction: t });
                await sequelize.query(`DELETE FROM SeatAllocations WHERE ExamID IN (SELECT ExamID FROM Exams WHERE SubjectID IN (${subList}))`, { transaction: t });
                await sequelize.query(`DELETE FROM Exams WHERE SubjectID IN (${subList})`, { transaction: t });
                await sequelize.query(`DELETE FROM StudentSubjects WHERE SubjectID IN (${subList})`, { transaction: t });
                await sequelize.query(`DELETE FROM InvigilatorSubjects WHERE SubjectID IN (${subList})`, { transaction: t });
                await sequelize.query(`DELETE FROM Subjects WHERE SubjectID IN (${subList})`, { transaction: t });
            }

            // Delete ExamSeries linked to these semesters
            await sequelize.query(`DELETE FROM ExamSeries WHERE SemesterID IN (${semList})`, { transaction: t });
            // Nullify Students' SemesterID (keep students, just unlink)
            await sequelize.query(`UPDATE Students SET SemesterID = NULL WHERE SemesterID IN (${semList})`, { transaction: t });
        }

        // Delete Semesters, bridge table, then the Program
        await sequelize.query(`DELETE FROM Semesters WHERE ProgramID = ${programId}`, { transaction: t });
        await sequelize.query(`DELETE FROM ProgramDepartments WHERE ProgramID = ${programId}`, { transaction: t });
        await program.destroy({ transaction: t });

        await t.commit();
        res.json({ message: "Program deleted successfully" });
    } catch (error: any) {
        await t.rollback();
        console.error("Delete program error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ──────────────────────────────────────────────────────────────
// POST /api/programs/import — Bulk Excel/CSV upload
// ──────────────────────────────────────────────────────────────
export const importPrograms = async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const t = await sequelize.transaction();
    try {
        const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) { await t.rollback(); return res.status(400).json({ message: "Empty workbook" }); }
        const sheet = workbook.Sheets[sheetName]!;
        const data: any[] = XLSX.utils.sheet_to_json(sheet);

        let successCount = 0;
        const errors: string[] = [];
        const allDepts = await Department.findAll({ transaction: t });
        const deptMap = new Map(allDepts.map((d: any) => [d.DepartmentCode.toLowerCase(), d]));

        for (const row of data) {
            try {
                const code = (row["ProgramCode"] || row["Program Code"] || "").toString().trim();
                const name = (row["ProgramName"] || row["Program Name"] || "").toString().trim();
                const duration = parseInt(String(row["DurationYears"] || row["Duration"] || "4"), 10);
                const deptCodes = (row["Departments"] || row["DepartmentCode"] || row["DepartmentCodes"] || "")
                    .toString().split("|").map((s: string) => s.trim().toLowerCase()).filter(Boolean);

                if (!code || !name || deptCodes.length === 0) throw new Error("Missing ProgramCode, ProgramName, or Departments");
                if (isNaN(duration) || duration < 1 || duration > 5) throw new Error("DurationYears must be 1–5");

                const depts = deptCodes.map((c: string) => deptMap.get(c)).filter(Boolean);
                if (depts.length !== deptCodes.length) throw new Error(`Unknown dept code(s): ${deptCodes.join(", ")}`);

                const existing = await Program.findOne({ where: { ProgramCode: code }, transaction: t });
                const totalSemesters = duration * 2;

                let prog: any;
                if (existing) {
                    await existing.update({ ProgramName: name, DurationYears: duration, TotalSemesters: totalSemesters, DepartmentID: (depts[0] as any).DepartmentID }, { transaction: t });
                    await ProgramDepartment.destroy({ where: { ProgramID: existing.ProgramID }, transaction: t });
                    prog = existing;
                } else {
                    prog = await Program.create({ ProgramCode: code, ProgramName: name, DurationYears: duration, TotalSemesters: totalSemesters, DepartmentID: (depts[0] as any).DepartmentID, IsActive: true }, { transaction: t });
                }

                await ProgramDepartment.bulkCreate(
                    depts.map((d: any) => ({ ProgramID: prog.ProgramID, DepartmentID: d.DepartmentID })),
                    { transaction: t, ignoreDuplicates: true }
                );

                // Auto-create semesters if new
                if (!existing) {
                    const { Semester } = await import("../models/index.js");
                    await Semester.bulkCreate(
                        Array.from({ length: totalSemesters }, (_, i) => ({ SemesterNumber: i + 1, SemesterName: `Semester ${i + 1}`, ProgramID: prog.ProgramID, IsActive: true })),
                        { transaction: t }
                    );
                }

                successCount++;
            } catch (err: any) {
                errors.push(`Row '${row["ProgramCode"] || "?"}': ${err.message}`);
            }
        }

        await t.commit();
        res.json({ message: "Import completed", successCount, errorCount: errors.length, errors: errors.slice(0, 15) });
    } catch (error: any) {
        await t.rollback();
        res.status(500).json({ message: "Import failed", error: error.message });
    }
};

// ──────────────────────────────────────────────────────────────
// GET /api/programs/template
// ──────────────────────────────────────────────────────────────
export const exportProgramTemplate = async (_req: Request, res: Response) => {
    try {
        const sample = [
            { ProgramCode: "BTECH", ProgramName: "Bachelor of Technology", DurationYears: 4, Departments: "cse001|mec001|ece001" },
            { ProgramCode: "MCA", ProgramName: "Master of Computer Applications", DurationYears: 2, Departments: "csa001" },
            { ProgramCode: "MCAI", ProgramName: "Integrated MCA", DurationYears: 5, Departments: "csa001" },
        ];
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(sample);
        ws["!cols"] = [{ wch: 15 }, { wch: 50 }, { wch: 14 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(wb, ws, "Programs");
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        res.setHeader("Content-Disposition", "attachment; filename=program_template.xlsx");
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.send(buffer);
    } catch (error: any) {
        res.status(500).json({ message: "Template export failed", error: error.message });
    }
};

// ──────────────────────────────────────────────────────────────
// DELETE /api/programs/delete-all
// ──────────────────────────────────────────────────────────────
export const deleteAllPrograms = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
        // Full cascade in FK dependency order for all programs
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
        await t.commit();
        res.json({ message: "All programs deleted" });
    } catch (error: any) {
        await t.rollback();
        console.error("Delete all programs error:", error);
        res.status(500).json({ message: error.message });
    }
};
