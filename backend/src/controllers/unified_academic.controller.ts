import { Request, Response } from "express";
import * as XLSX from 'xlsx';
import { Department, Program, Subject, Semester } from "../models/index.js";
import { normalizeProgram, parseBatchString, mapProgramToDepartment, resolveOrCreateProgram, resolveOrCreateDepartment } from "../services/academicNormalizer.service.js";
import { sequelize } from "../config/database.js";

interface UnifiedRow {
    [key: string]: any;
}

export const importUnifiedAcademic = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
            return res.status(400).json({ message: "Invalid Excel: No sheets found" });
        }
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
            return res.status(400).json({ message: "Invalid Excel: Worksheet not found" });
        }
        const data: UnifiedRow[] = XLSX.utils.sheet_to_json(worksheet);

        if (data.length === 0) {
            return res.status(400).json({ message: "Excel file is empty" });
        }

        // Validate required columns
        const requiredColumns = ['ProgramCode', 'ProgramName', 'DepartmentCode', 'DepartmentName', 'SubjectCode', 'SubjectName'];
        const firstRow = data[0];
        if (!firstRow) {
            return res.status(400).json({ message: "Excel file has no data rows" });
        }
        const missingColumns = requiredColumns.filter(col => !(col in firstRow));

        if (missingColumns.length > 0) {
            return res.status(400).json({
                message: `Missing required columns: ${missingColumns.join(', ')}`
            });
        }

        const transaction = await sequelize.transaction();

        try {
            // Step 1: Extract and create unique departments
            const departmentMap = new Map<string, { code: string, name: string }>();
            data.forEach(row => {
                const progCodeRaw = row.ProgramCode || row['Program Code'] || row['Program'] || row['PCode'];
                const parsed = parseBatchString(progCodeRaw || '');
                const progCode = normalizeProgram(parsed.programCode);
                const deptCode = progCode; // Guaranteed synced
                const deptName = row.DepartmentName || row['Department Name'] || row['Dept Name'];

                if (deptCode && deptName) {
                    departmentMap.set(String(deptCode).trim(), {
                        code: String(deptCode).trim(),
                        name: String(deptName).trim()
                    });
                }
            });

            const createdDepartments = new Map<string, number>();
            for (const [code, dept] of departmentMap) {
                const [department] = await Department.findOrCreate({
                    where: { DepartmentCode: dept.code },
                    defaults: {
                        DepartmentCode: dept.code,
                        DepartmentName: dept.name
                    },
                    transaction
                });
                createdDepartments.set(dept.code, department.DepartmentID);
            }

            // Step 2: Extract and create unique programs
            const programMap = new Map<string, { code: string, name: string, deptCode: string }>();
            data.forEach(row => {
                const progCodeRaw = row.ProgramCode || row['Program Code'] || row['Program'] || row['PCode'];
                const parsed = parseBatchString(progCodeRaw || '');
                const progCode = normalizeProgram(parsed.programCode);
                const progName = row.ProgramName || row['Program Name'] || row['Degree'];
                const deptCode = progCode; // Guaranteed synced

                if (progCode && progName && deptCode) {
                    programMap.set(String(progCode).trim(), {
                        code: String(progCode).trim(),
                        name: String(progName).trim(),
                        deptCode: String(deptCode).trim()
                    });
                }
            });

            const createdPrograms = new Map<string, number>();
            for (const [code, prog] of programMap) {
                const departmentID = createdDepartments.get(prog.deptCode);
                if (!departmentID) {
                    continue; // Skip if dept not found (shouldn't happen with code above)
                }

                const [program, created] = await Program.findOrCreate({
                    where: { ProgramCode: prog.code },
                    defaults: {
                        ProgramCode: prog.code,
                        ProgramName: prog.name,
                        DepartmentID: departmentID,
                        DurationYears: 4, // Default assumption if not provided
                        TotalSemesters: 8
                    },
                    transaction
                });

                if (created) {
                    // Auto-create semesters
                    const semestersToCreate = [];
                    for (let i = 1; i <= 8; i++) {
                        semestersToCreate.push({
                            SemesterNumber: i,
                            SemesterName: `Semester ${i}`,
                            ProgramID: program.ProgramID,
                            IsActive: true
                        });
                    }
                    if (semestersToCreate.length > 0) {
                        await Semester.bulkCreate(semestersToCreate, { transaction });
                    }
                }

                createdPrograms.set(prog.code, program.ProgramID);
            }

            // Step 3: Create subjects
            const subjectMap = new Map<string, { code: string, name: string, programCode: string, deptCode: string }>();
            let createdSubjectsCount = 0;
            data.forEach(row => {
                const subjCode = row.SubjectCode || row['Subject Code'] || row['Course Code'] || row['Code'] || row['Subject'];
                const subjName = row.SubjectName || row['Subject Name'] || row['Course Name'] || row['Name'];
                const progCodeRaw = row.ProgramCode || row['Program Code'] || row['Program'] || row['PCode'];
                const parsed = parseBatchString(progCodeRaw || '');
                const progCode = normalizeProgram(parsed.programCode);
                const deptCode = progCode; // Guaranteed synced

                if (subjCode && subjName && progCode && deptCode) {
                    const key = `${String(subjCode).trim()}_${String(progCode).trim()}`;
                    subjectMap.set(key, {
                        code: String(subjCode).trim(),
                        name: String(subjName).trim(),
                        programCode: String(progCode).trim(),
                        deptCode: String(deptCode).trim()
                    });
                }
            });
            for (const [key, subj] of subjectMap) {
                const departmentID = createdDepartments.get(subj.deptCode);

                if (!departmentID) {
                    continue;
                }

                const [subject, created] = await Subject.findOrCreate({
                    where: {
                        SubjectCode: subj.code,
                        DepartmentID: departmentID
                    },
                    defaults: {
                        SubjectCode: subj.code,
                        SubjectName: subj.name,
                        DepartmentID: departmentID,
                        SemesterID: 1
                    },
                    transaction
                });

                if (created) createdSubjectsCount++;
            }

            await transaction.commit();

            res.json({
                message: "Academic data imported successfully",
                summary: {
                    departments: departmentMap.size,
                    programs: programMap.size,
                    subjects: createdSubjectsCount
                }
            });

        } catch (error) {
            await transaction.rollback();
            throw error;
        }

    } catch (error: any) {
        console.error("Unified import error:", error);
        res.status(500).json({
            message: "Failed to import academic data",
            error: error.message
        });
    }
};

export const exportUnifiedTemplate = async (req: Request, res: Response) => {
    try {
        const sampleData = [
            {
                ProgramCode: 'BTECH-CS',
                ProgramName: 'Bachelor of Technology in Computer Science',
                DepartmentCode: 'CS',
                DepartmentName: 'Computer Science and Engineering',
                SubjectCode: 'CS101',
                SubjectName: 'Programming Fundamentals'
            },
            {
                ProgramCode: 'BTECH-CS',
                ProgramName: 'Bachelor of Technology in Computer Science',
                DepartmentCode: 'CS',
                DepartmentName: 'Computer Science and Engineering',
                SubjectCode: 'CS102',
                SubjectName: 'Data Structures and Algorithms'
            },
            {
                ProgramCode: 'BTECH-ME',
                ProgramName: 'Bachelor of Technology in Mechanical Engineering',
                DepartmentCode: 'ME',
                DepartmentName: 'Mechanical Engineering',
                SubjectCode: 'ME101',
                SubjectName: 'Engineering Mechanics'
            },
            {
                ProgramCode: 'MBA',
                ProgramName: 'Master of Business Administration',
                DepartmentCode: 'MBA',
                DepartmentName: 'Management Studies',
                SubjectCode: 'MBA101',
                SubjectName: 'Marketing Management'
            }
        ];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(sampleData);

        // Set column widths
        ws['!cols'] = [
            { wch: 15 }, // ProgramCode
            { wch: 50 }, // ProgramName
            { wch: 15 }, // DepartmentCode
            { wch: 40 }, // DepartmentName
            { wch: 15 }, // SubjectCode
            { wch: 40 }  // SubjectName
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Academic Data');

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', 'attachment; filename=academic_data_template.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error: any) {
        console.error("Template export error:", error);
        res.status(500).json({ message: "Failed to generate template", error: error.message });
    }
};
