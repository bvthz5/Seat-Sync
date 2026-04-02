import { Request, Response } from 'express';
import { Student } from '../models/Student.js';
import { User } from '../models/User.js';
import { Department } from '../models/Department.js';
import { Program } from '../models/Program.js';
import { Semester } from '../models/Semester.js';
import { sequelize } from '../config/database.js';
import { Op } from 'sequelize';
import bcrypt from 'bcrypt';
import * as XLSX from 'xlsx';

export const getAllStudents = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;

        const search = req.query.search as string;
        const dept = req.query.dept as string; // DepartmentID
        const program = req.query.program as string; // ProgramID
        const semester = req.query.semester as string; // SemesterID

        const studentWhere: any = { [Op.and]: [] };
        const userWhere: any = {};

        // Filter by Department, Program, Semester
        if (dept) studentWhere[Op.and].push({ DepartmentID: dept });
        if (program) studentWhere[Op.and].push({ ProgramID: program });
        if (semester) studentWhere[Op.and].push({ SemesterID: semester });

        // Search Logic
        if (search) {
            // we want to search in Student.RegisterNumber OR User.FullName OR User.Email
            // Since we are doing an include, we can't easily do a top-level OR across tables without complex queries.
            // A common strategy:
            // 1. Where on Student fields OR
            // 2. Where on User fields

            // However, typical Sequelize "include" with "where" performs an inner join.
            // If we put a where on User, it filters students who have that user.

            // Simpler approach for single search bar across related tables:
            // Use logical OR in the main where clause if possible, but that's hard with associations.
            // Alternatively, utilize the fact that we can search User fields in the User include, and Student fields in the Student where.
            // But we want (Student matches OR User matches).

            // Let's try:
            // Find User IDs that match Name/Email
            // OR find Student that matches RegNo

            // Constructing a smart where clause:
            // This is slightly complex in pure Sequelize object syntax without literal.
            // Let's stick to a solid implementation:

            // Allow searching by Register Number regardless of User
            if (!isNaN(Number(search))) {
                // heuristic: if sure it's a number, maybe it's RegNo (if numeric) or Batch
            }

            // Simplest robust way for "Search All" in this stack:
            // User 'Where' clause handles Name/Email. 
            // Student 'Where' clause handles RegisterNumber.
            // BUT they are ANDed by default (Student must match AND User must match).
            // We want Union.

            // WORKAROUND:
            // We can search for the Search Term in RegisterNumber. 
            // OR we can search in User.
            // Since we usually want to filter the LIST of students.

            // Let's simplify: 
            // If the search term matches RegisterNumber, we find those students.
            // If it matches Name/Email, we find those students.

            // We can use Sequelize's "$" syntax for nested columns if supported, or just keep it simple:
            // We will filter users who match Name/Email.
            // AND/OR we filter students who match RegNo.

            // Let's prioritize: 
            // if search is provided, we try to match RegisterNumber OR User fields.
            // Since standard includes are AND, checking "RegisterNumber LIKE %q% OR User.Name LIKE %q%" requires top level where with '$User.FullName$'.

            studentWhere[Op.and].push({
                [Op.or]: [
                    { RegisterNumber: { [Op.like]: `%${search}%` } },
                    { '$User.FullName$': { [Op.like]: `%${search}%` } },
                    { '$User.Email$': { [Op.like]: `%${search}%` } }
                ]
            });
        }

        const { count, rows } = await Student.findAndCountAll({
            where: studentWhere,
            include: [
                {
                    model: User,
                    attributes: ['Email', 'Role', 'FullName'],
                    // where: userWhere, // We are doing the search in the top level where using $User.field$ syntax
                    required: true // Inner join required for the $User.field$ syntax to work reliably for filtering
                },
                { model: Department, attributes: ['DepartmentName', 'DepartmentCode'] },
                { model: Program, attributes: ['ProgramName'] },
                { model: Semester, attributes: ['SemesterNumber'] }
            ],
            limit,
            offset,
            order: [['StudentID', 'ASC']],
            subQuery: false
        });

        // Calculate Stats (Parallel for performance)
        const commonInclude = search ? [{ model: User, attributes: [], required: true }] : [];

        const [deptResults, batchResults, incompleteProfiles, totalDatabaseCount] = await Promise.all([
            Student.findAll({
                where: studentWhere,
                include: commonInclude,
                attributes: [[sequelize.fn('DISTINCT', sequelize.col('Student.DepartmentID')), 'DepartmentID']],
                raw: true,
                subQuery: false
            }),
            Student.findAll({
                where: studentWhere,
                include: commonInclude,
                attributes: [[sequelize.fn('DISTINCT', sequelize.col('Student.BatchYear')), 'BatchYear']],
                raw: true,
                subQuery: false
            }),
            Student.count({
                where: {
                    [Op.and]: [
                        studentWhere,
                        {
                            [Op.or]: [
                                { DepartmentID: null },
                                { ProgramID: null },
                                { SemesterID: null }
                            ]
                        }
                    ]
                },
                include: commonInclude,
                distinct: true,
                col: 'StudentID'
            }),
            Student.count()
        ]);

        const stats = {
            activeDepartments: deptResults.length,
            activeBatches: batchResults.length,
            incompleteProfiles,
            totalDatabaseCount
        };
        res.json({
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            students: rows,
            stats
        });
    } catch (error: any) {
        console.error("Error fetching students:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
            sql: error.sql // Helpful for debugging MSSQL issues
        });
    }
};

export const exportStudents = async (req: Request, res: Response) => {
    try {
        const search = req.query.search as string;
        const dept = req.query.dept as string;
        const program = req.query.program as string;
        const semester = req.query.semester as string;

        const studentWhere: any = {};
        if (dept) studentWhere.DepartmentID = dept;
        if (program) studentWhere.ProgramID = program;
        if (semester) studentWhere.SemesterID = semester;

        // Search Logic (same as getAllStudents)
        if (search) {
            studentWhere[Op.or] = [
                { RegisterNumber: { [Op.like]: `%${search}%` } },
                { '$User.FullName$': { [Op.like]: `%${search}%` } },
                { '$User.Email$': { [Op.like]: `%${search}%` } }
            ];
        }

        const students = await Student.findAll({
            where: studentWhere,
            include: [
                {
                    model: User,
                    attributes: ['Email', 'FullName'],
                    required: true
                },
                { model: Department, attributes: ['DepartmentName'] },
                { model: Program, attributes: ['ProgramName'] },
                { model: Semester, attributes: ['SemesterNumber'] }
            ],
            order: [['RegisterNumber', 'ASC']]
        });

        // Transform for Excel
        const data = students.map((s: any) => ({
            'Register Number': s.RegisterNumber,
            'Name': s.User?.FullName,
            'Email': s.User?.Email,
            'Department': s.Department?.DepartmentName,
            'Program': s.Program?.ProgramName,
            'Semester': s.Semester?.SemesterNumber,
            'Batch Year': s.BatchYear
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

        const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=students.xlsx');
        res.send(buffer);

    } catch (error) {
        console.error("Error exporting students:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const importStudents = async (req: Request, res: Response) => {
    // Expected Excel Columns: Register Number, Name, Email (Optional), Program (Optional if inferred), Semester (Optional if inferred)
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

        // Cache for Lookups to speed up loop
        const programCache = new Map<string, any>(); // Code -> Program
        const deptCache = new Map<string, any>();    // Code -> Department
        const programsAll = await Program.findAll();
        const deptsAll = await Department.findAll();

        programsAll.forEach((p: any) => {
            if (p.ProgramCode) programCache.set(p.ProgramCode.toUpperCase(), p);
            programCache.set(p.ProgramName.toUpperCase(), p); // Also support Name match
        });

        deptsAll.forEach((d: any) => {
            deptCache.set(d.DepartmentCode.toUpperCase(), d);
            deptCache.set(d.DepartmentName.toUpperCase(), d);
        });


        // Normalize keys helper
        const normalizeKey = (row: any, keys: string[]) => {
            const rowKeys = Object.keys(row);
            for (const key of keys) {
                // Exact match
                if (row[key] !== undefined) return row[key];
                // Case insensitive match
                const foundKey = rowKeys.find(k => k.toLowerCase().trim() === key.toLowerCase().trim());
                if (foundKey) return row[foundKey];
            }
            return undefined;
        };

        // DEBUG: Log headers
        if (data.length > 0) {
            try {
                const fs = await import('fs');
                const path = await import('path');
                fs.writeFileSync(path.resolve('debug_import_headers.log'), `Headers found: ${JSON.stringify(Object.keys(data[0]))}`);
            } catch (e) { }
        }

        for (const row of data) {
            // Flexible Key Matching
            const regNo = normalizeKey(row, ['Register Number', 'RegisterNumber', 'Reg No', 'RegNo', 'Register No']);
            const name = normalizeKey(row, ['Name', 'Student Name', 'Full Name', 'StudentName']);
            const email = normalizeKey(row, ['Email', 'E-mail', 'Mail']);
            const programInput = normalizeKey(row, ['Program', 'Course', 'Branch', 'Stream']);
            const semesterInput = normalizeKey(row, ['Semester', 'Sem', 'Term']);

            try {
                // 1. Validation basics
                if (!regNo || !name) {
                    throw new Error(`Missing required fields (Register Number, Name) for row`);
                }

                // 2. Smart Parsing Logic
                // Regex: (L?SJC)(\d{2})([A-Z]+)(\d+)
                // Group 1: Prefix (SJC/LSJC)
                // Group 2: Year (24 -> 2024)
                // Group 3: Code (MCA, CS, etc)
                // Group 4: Number
                const idRegex = /^(L?SJC)(\d{2})([A-Z]+)(\d+)$/i;
                const match = String(regNo).trim().match(idRegex);

                let targetProgram: any = null;
                let targetDept: any = null;
                let derivedBatchYear: number | null = null;

                if (match) {
                    const full = match[0];
                    const prefix = match[1];
                    const yearShort = match[2];
                    const code = match[3];
                    const num = match[4];

                    if (yearShort && code) {
                        derivedBatchYear = 2000 + parseInt(yearShort, 10);
                        const codeUpper = code.toUpperCase();

                        // Strategy A: Try to find Program by Code (e.g. MCAI)
                        if (programCache.has(codeUpper)) {
                            targetProgram = programCache.get(codeUpper);
                            targetDept = deptsAll.find((d: any) => d.DepartmentID === targetProgram.DepartmentID);
                        }
                        // Strategy B: If no Program, try Department (e.g. CS)
                        else if (deptCache.has(codeUpper)) {
                            targetDept = deptCache.get(codeUpper);
                            // Program is still unknown, check Excel input
                        }
                    }
                }

                // override/fallback with Excel inputs
                if (programInput) {
                    const pInputUpper = String(programInput).trim().toUpperCase();
                    if (programCache.has(pInputUpper)) {
                        targetProgram = programCache.get(pInputUpper);
                        // Update dept if not already set or mismatch? Trust Program's dept.
                        if (targetProgram.DepartmentID) {
                            targetDept = deptsAll.find((d: any) => d.DepartmentID === targetProgram.DepartmentID);
                        }
                    } else {
                        // If program not found in cache, maybe we can try to find it by name or code dynamically?
                    }
                }

                // FIX: If Program found but Dept not linked, try to find Dept by Program Name keywords
                if (targetProgram && !targetDept) {
                    if (targetProgram.ProgramName.includes('Computer') || targetProgram.ProgramName.includes('MCA')) {
                        targetDept = deptsAll.find((d: any) => d.DepartmentCode === 'MCA' || d.DepartmentCode === 'CSE');
                    }
                }

                // Final Validations
                if (!targetProgram) {
                    // Try to match "Generic" program for the department if only Dept is known? 
                    // No, "CS" Dept has "B.Tech CS" and "M.Tech CS". We cannot guess.
                    throw new Error(`Could not identify Program/Course '${programInput}'. Please check spelling or add it to Academic Setup.`);
                }
                if (!targetDept) {
                    // Inferred failed. 
                    throw new Error(`Could not identify Department. Ensure Program '${targetProgram.ProgramName}' is linked to a Department or Department Code is known.`);
                }

                // Semester Logic
                let targetSemester: any = null;
                if (semesterInput) {
                    // Try to find matching semester number
                    const semNum = parseInt(String(semesterInput).replace(/S/i, ''), 10); // "S3" -> 3
                    if (!isNaN(semNum)) {
                        targetSemester = await Semester.findOne({
                            where: { ProgramID: targetProgram.ProgramID, SemesterNumber: semNum },
                            transaction: t
                        });
                    }
                }

                // Fallback: If no semester input or not found, default to S1
                if (!targetSemester) {
                    targetSemester = await Semester.findOne({
                        where: { ProgramID: targetProgram.ProgramID, SemesterNumber: 1 },
                        transaction: t
                    });
                }

                if (!targetSemester) {
                    // Auto-create S1 if missing?
                    targetSemester = await Semester.create({
                        ProgramID: targetProgram.ProgramID,
                        SemesterNumber: 1,
                        SemesterName: 'S1',
                        IsActive: true
                    }, { transaction: t });
                }

                if (!targetSemester) {
                    throw new Error(`Invalid Semester '${semesterInput}' for Program '${targetProgram.ProgramName}'`);
                }


                // 3. Find/Create User (Login)
                // Use RegisterNumber as unique identifier instead of email
                // Default Password: First 4 chars of Name + @123
                const passwordStr = (name.replace(/\s/g, '').substring(0, 4) + '@123'); // Simple logic
                const defaultPassword = await bcrypt.hash(passwordStr, 10);

                // Use register number as email (for now, until login system is updated)
                const userEmail = `${regNo.toLowerCase()}@student.internal`;

                let user = await User.findOne({ where: { Email: userEmail }, transaction: t });
                if (!user) {
                    user = await User.create({
                        Email: userEmail,
                        FullName: name,
                        PasswordHash: defaultPassword,
                        Role: 'student',
                        IsRootAdmin: false
                    }, { transaction: t });
                } else {
                    // Always update FullName from Excel import (fresh data takes precedence)
                    if (name) {
                        await user.update({ FullName: name }, { transaction: t });
                    }
                }

                // 4. Create/Update Student
                const existingStudent = await Student.findOne({ where: { RegisterNumber: regNo }, transaction: t });

                if (existingStudent) {
                    await existingStudent.update({
                        UserID: user.UserID,
                        DepartmentID: targetDept.DepartmentID,
                        ProgramID: targetProgram.ProgramID,
                        SemesterID: targetSemester.SemesterID,
                        BatchYear: derivedBatchYear || existingStudent.BatchYear // derived takes precedence if valid?
                    }, { transaction: t });
                } else {
                    await Student.create({
                        UserID: user.UserID,
                        RegisterNumber: regNo,
                        DepartmentID: targetDept.DepartmentID,
                        ProgramID: targetProgram.ProgramID,
                        SemesterID: targetSemester.SemesterID,
                        BatchYear: derivedBatchYear || new Date().getFullYear() // Fallback
                    }, { transaction: t });
                }

                successCount++;
            } catch (err: any) {
                const errorDetail = err.message || JSON.stringify(err, null, 2);
                const errorMsg = `Row error (${regNo || name}): ${errorDetail}`;
                errors.push(errorMsg);

                // DEBUG: Log first 5 errors to file
                if (errors.length <= 5) {
                    try {
                        const fs = await import('fs');
                        const path = await import('path');
                        fs.appendFileSync(path.resolve('debug_error.log'), `Validation Error: ${errorMsg}\nStack: ${err.stack}\n`);
                    } catch (e) { }
                }
            }
        }

        await t.commit();

        res.status(200).json({
            message: "Import processing complete",
            successCount,
            errorCount: errors.length,
            errors
        });

    } catch (error: any) {
        await t.rollback();
        console.error("Bulk Import Error:", error);

        // DEBUG: Write error to file for AI Agent to read
        try {
            const fs = await import('fs');
            const path = await import('path');
            const logPath = path.resolve('debug_error.log');
            fs.writeFileSync(logPath, `Time: ${new Date().toISOString()}\nError: ${error.message}\nStack: ${error.stack}\n`);
        } catch (logErr) {
            console.error("Failed to write debug log", logErr);
        }

        // Send the actual error message to the frontend for debugging
        res.status(500).json({
            message: `Import Failed: ${error.message}`,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

export const createStudent = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
        const { FullName, RegisterNumber, DepartmentID, ProgramID, SemesterID } = req.body;

        // Only Name and Register Number are required
        if (!FullName || !RegisterNumber) {
            return res.status(400).json({ message: "Full Name and Register Number are required" });
        }

        const regNo = String(RegisterNumber).trim();

        // Check for existing student
        const existingStudent = await Student.findOne({ where: { RegisterNumber: regNo }, transaction: t });
        if (existingStudent) {
            await t.rollback();
            return res.status(409).json({ message: "Student with this Register Number already exists" });
        }

        // Smart Parsing — same logic as Excel import
        let targetProgram: any = null;
        let targetDept: any = null;
        let targetSemester: any = null;
        let derivedBatchYear: number | null = null;

        const programsAll = await Program.findAll({ transaction: t });
        const deptsAll = await Department.findAll({ transaction: t });

        if (ProgramID) {
            targetProgram = programsAll.find((p: any) => p.ProgramID === parseInt(ProgramID));
        }
        if (DepartmentID) {
            targetDept = deptsAll.find((d: any) => d.DepartmentID === parseInt(DepartmentID));
        }

        if (!targetProgram || !targetDept) {
            // Smart Parsing — same logic as Excel import
            const programCache = new Map<string, any>();
            const deptCache = new Map<string, any>();

            programsAll.forEach((p: any) => {
                if (p.ProgramCode) programCache.set(p.ProgramCode.toUpperCase(), p);
                programCache.set(p.ProgramName.toUpperCase(), p);
            });
            deptsAll.forEach((d: any) => {
                deptCache.set(d.DepartmentCode.toUpperCase(), d);
                deptCache.set(d.DepartmentName.toUpperCase(), d);
            });

            const idRegex = /^(L?SJC)(\d{2})([A-Z]+)(\d+)$/i;
            const match = regNo.match(idRegex);

            if (match) {
                const yearShort = match[2];
                const code = match[3];

                if (yearShort && code) {
                    derivedBatchYear = 2000 + parseInt(yearShort, 10);
                    const codeUpper = code.toUpperCase();

                    if (!targetProgram && programCache.has(codeUpper)) {
                        targetProgram = programCache.get(codeUpper);
                    }
                    if (!targetDept && deptCache.has(codeUpper)) {
                        targetDept = deptCache.get(codeUpper);
                    }
                }
            }

            if (targetProgram && !targetDept) {
                // Infer department from program if possible
                targetDept = deptsAll.find((d: any) => d.DepartmentID === targetProgram.DepartmentID);
                if (!targetDept && (targetProgram.ProgramName.includes('Computer') || targetProgram.ProgramName.includes('MCA'))) {
                    targetDept = deptsAll.find((d: any) => d.DepartmentCode === 'MCA' || d.DepartmentCode === 'CSE');
                }
            }
        }

        if (!targetProgram) {
            await t.rollback();
            return res.status(400).json({ message: `Could not identify Program from Register Number '${regNo}'. Please check the format or select explicitly.` });
        }
        if (!targetDept) {
            await t.rollback();
            return res.status(400).json({ message: `Could not identify Department from Register Number '${regNo}'. Please select explicitly.` });
        }

        // Determine Semester
        if (SemesterID) {
            targetSemester = await Semester.findOne({ where: { SemesterID: parseInt(SemesterID) }, transaction: t });
        }
        if (!targetSemester) {
            targetSemester = await Semester.findOne({
                where: { ProgramID: targetProgram.ProgramID, SemesterNumber: 1 },
                transaction: t
            });
            if (!targetSemester) {
                targetSemester = await Semester.create({
                    ProgramID: targetProgram.ProgramID,
                    SemesterNumber: 1,
                    SemesterName: 'S1',
                    IsActive: true
                }, { transaction: t });
            }
        }

        // Create minimal User to hold FullName (required by DB schema constraint on UserID)
        const passwordStr = (FullName.replace(/\s/g, '').substring(0, 4) + '@123');
        const defaultPassword = await bcrypt.hash(passwordStr, 10);

        let user = await User.findOne({ where: { Email: regNo }, transaction: t });
        if (!user) {
            user = await User.create({
                Email: regNo,
                FullName,
                PasswordHash: defaultPassword,
                Role: 'student',
                IsRootAdmin: false
            }, { transaction: t });
        } else {
            if (FullName) {
                await user.update({ FullName }, { transaction: t });
            }
        }

        // Create Student record linked to User
        const newStudent = await Student.create({
            UserID: user.UserID,
            RegisterNumber: regNo,
            DepartmentID: targetDept.DepartmentID,
            ProgramID: targetProgram.ProgramID,
            SemesterID: targetSemester.SemesterID,
            BatchYear: derivedBatchYear || new Date().getFullYear()
        }, { transaction: t });

        await t.commit();
        res.status(201).json({ message: "Student created successfully", student: newStudent });

    } catch (error: any) {
        await t.rollback();
        console.error("Create Student Error:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};


export const getCreateOptions = async (req: Request, res: Response) => {
    try {
        const departments = await Department.findAll({ attributes: ['DepartmentID', 'DepartmentCode', 'DepartmentName'] });
        const programs = await Program.findAll({ attributes: ['ProgramID', 'ProgramName'] });
        const semesters = await Semester.findAll({ attributes: ['SemesterID', 'SemesterNumber', 'ProgramID'] });

        res.json({
            departments,
            programs,
            semesters
        });
    } catch (error) {
        console.error("Error fetching create options:", error);
        res.status(500).json({ message: "Failed to fetch master data" });
    }
};

export const updateStudent = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { FullName, Email, RegisterNumber, DepartmentID, ProgramID, SemesterID, BatchYear } = req.body;

        const student = await Student.findByPk(id as unknown as number, { transaction: t });
        if (!student) {
            await t.rollback();
            return res.status(404).json({ message: "Student not found" });
        }

        if (!student.UserID) {
            await t.rollback();
            return res.status(400).json({ message: "Student has no associated user" });
        }

        const user = await User.findByPk(student.UserID, { transaction: t });
        if (!user) {
            await t.rollback();
            return res.status(404).json({ message: "Associated user not found" });
        }

        // Update User
        if (Email || FullName) {
            await user.update({
                Email: Email || user.Email,
                FullName: FullName || user.FullName
            }, { transaction: t });
        }

        // Update Student
        await student.update({
            RegisterNumber: RegisterNumber || student.RegisterNumber,
            DepartmentID: DepartmentID || student.DepartmentID,
            ProgramID: ProgramID || student.ProgramID,
            SemesterID: SemesterID || student.SemesterID,
            BatchYear: BatchYear || student.BatchYear
        }, { transaction: t });

        await t.commit();
        res.json({ message: "Student updated successfully" });

    } catch (error: any) {
        await t.rollback();
        console.error("Update Student Error:", error);
        res.status(500).json({ message: "Failed to update student", error: error.message });
    }
};

export const deleteStudent = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const studentId = parseInt(id as string, 10);

        if (isNaN(studentId)) {
            res.status(400).json({ message: "Invalid Student ID" });
            return;
        }

        await sequelize.transaction(async (t) => {
            const student = await Student.findByPk(studentId, { transaction: t });

            if (!student) {
                throw new Error("Student not found"); // Will be caught by catch block
            }

            const userId = student.UserID; // Assuming UserID is a number

            // Delete Student first (foreign key constraint likely on UserID)
            await student.destroy({ transaction: t });

            // Delete User
            if (userId) {
                await User.destroy({ where: { UserID: userId }, transaction: t });
            }
        });

        res.json({ message: "Student deleted successfully" });

    } catch (error: any) {
        console.error("Delete Student Error:", error);
        const status = error.message === "Student not found" ? 404 : 500;
        res.status(status).json({ message: error.message || "Failed to delete student" });
    }
};

export const deleteAllStudents = async (req: Request, res: Response) => {
    try {
        // Use Managed Transaction to prevent "rollback without begin" errors
        await sequelize.transaction(async (t) => {
            // Only Delete Students. Users remain.
            await Student.destroy({ where: {}, truncate: false, transaction: t });
        });

        res.status(200).json({ message: "Successfully deleted all student records. User accounts are preserved." });

    } catch (error: any) {
        console.error("Delete All Students Error:", error);
        res.status(500).json({ message: "Failed to delete all students", error: error.message });
    }
};

