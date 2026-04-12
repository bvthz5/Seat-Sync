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
import { BulkStudentImportService } from '../services/bulkStudentImport.service.js';
import { emailService } from '../services/email.service.js';

export const getAllStudents = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;

        const search = req.query.search as string;
        const dept = req.query.dept as string; // DepartmentID
        const program = req.query.program as string; // ProgramID
        const semester = req.query.semester as string; // SemesterID
        const batch = req.query.batch as string; // BatchYear
        const status = req.query.status as string; // Status (computed field)
        const source = req.query.source as string; // Source (computed field)

        // Build WHERE clause - start with simple conditions
        const conditions: any[] = [];

        // Parse and validate numeric filters
        const deptId = dept && !isNaN(parseInt(dept)) ? parseInt(dept) : null;
        const programId = program && !isNaN(parseInt(program)) ? parseInt(program) : null;
        const semesterId = semester && !isNaN(parseInt(semester)) ? parseInt(semester) : null;
        const batchYear = batch && !isNaN(parseInt(batch)) ? parseInt(batch) : null;

        // Add direct filter conditions to array
        if (deptId) conditions.push({ DepartmentID: deptId });
        if (programId) conditions.push({ ProgramID: programId });
        if (semesterId) conditions.push({ SemesterID: semesterId });
        if (batchYear) conditions.push({ BatchYear: batchYear });

        // Search Logic - add OR condition for search
        if (search && search.trim()) {
            conditions.push({
                [Op.or]: [
                    { RegisterNumber: { [Op.like]: `%${search}%` } },
                    { '$User.FullName$': { [Op.like]: `%${search}%` } },
                    { '$User.Email$': { [Op.like]: `%${search}%` } }
                ]
            });
        }

        // Combine all conditions with AND
        const studentWhere = conditions.length > 0 ? { [Op.and]: conditions } : {};

        const { count, rows } = await Student.findAndCountAll({
            where: studentWhere,
            include: [
                {
                    model: User,
                    attributes: ['Email', 'Role', 'FullName', 'isActive'],
                    required: true
                },
                {
                    model: Department,
                    attributes: ['DepartmentName', 'DepartmentCode', 'DepartmentID']
                },
                {
                    model: Program,
                    attributes: ['ProgramName', 'ProgramID', 'DurationYears', 'TotalSemesters']
                },
                {
                    model: Semester,
                    attributes: ['SemesterID', 'SemesterNumber'],
                    as: 'Semester' // Explicitly set alias
                }
            ],
            limit,
            offset,
            order: [['StudentID', 'ASC']],
            subQuery: false,
            raw: false
        });

        // Debug log for semester filtering
        if (semesterId) {
            console.log(`[Backend] Semester Filter Applied: ${semesterId}`);
            console.log(`[Backend] WHERE clause:`, JSON.stringify(studentWhere, null, 2));
            console.log(`[Backend] Results: ${count} students found`);
        }

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
                    ...studentWhere,
                    [Op.or]: [
                        { DepartmentID: null },
                        { ProgramID: null },
                        { SemesterID: null }
                    ]
                } as any,
                include: commonInclude as any,
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
        const { FullName, RegisterNumber, DepartmentID, ProgramID, SemesterID, Email, BatchYear } = req.body;

        // Only Name and Register Number are required
        if (!FullName || !RegisterNumber) {
            await t.rollback();
            return res.status(400).json({ message: "Full Name and Register Number are required" });
        }

        const regNo = String(RegisterNumber).trim();
        const collegeEmail = Email ? String(Email).trim().toLowerCase() : null;

        // Check for existing student
        const existingStudent = await Student.findOne({ where: { RegisterNumber: regNo }, transaction: t });
        if (existingStudent) {
            await t.rollback();
            return res.status(409).json({ message: "Student with this Register Number already exists" });
        }

        // Check if email is already in use (if provided)
        if (collegeEmail) {
            const existingUser = await User.findOne({ where: { Email: collegeEmail }, transaction: t });
            if (existingUser) {
                await t.rollback();
                return res.status(409).json({ message: "An account with this email already exists" });
            }
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
        const plainTextPassword = FullName.replace(/\s/g, '').substring(0, 4) + '@123';
        const hashedPassword = await bcrypt.hash(plainTextPassword, 10);

        // Use provided email or fall back to RegisterNumber
        const userEmail = collegeEmail || regNo;

        let user = await User.findOne({ where: { Email: userEmail }, transaction: t });
        if (!user) {
            user = await User.create({
                Email: userEmail,
                FullName,
                PasswordHash: hashedPassword,
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
            BatchYear: BatchYear ? parseInt(BatchYear) : (derivedBatchYear || new Date().getFullYear())
        }, { transaction: t });

        await t.commit();

        // Send credentials email asynchronously (don't wait for it)
        if (collegeEmail) {
            emailService.sendStudentCredentialsEmail(collegeEmail, FullName, userEmail, plainTextPassword, regNo)
                .catch(err => console.error('Failed to send credentials email:', err.message));
        }

        res.status(201).json({ 
            message: "Student created successfully", 
            student: newStudent,
            credentialsEmailSent: !!collegeEmail
        });

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

/**
 * Get dynamic filter options for student list filtering
 * Includes: batch years (from actual student data), semesters, and status options
 * This ensures the filters scale with the growing system
 */
export const getFilterOptions = async (req: Request, res: Response) => {
    try {
        // Fetch unique batch years from student records (SCALABLE - fetches from actual data)
        const batchYearsResult = await Student.findAll({
            attributes: [
                [sequelize.fn('DISTINCT', sequelize.col('BatchYear')), 'BatchYear']
            ],
            raw: true,
            order: [['BatchYear', 'DESC']],
            limit: 50  // Limit to prevent huge queries
        });

        const batchYears = batchYearsResult
            .map(r => r.BatchYear as number)
            .filter(y => y && !isNaN(y))
            .sort((a, b) => b - a);

        // Fetch semesters - Deduplicate by SemesterNumber to avoid duplicates
        const allSemesters = await Semester.findAll({
            attributes: ['SemesterID', 'SemesterNumber'],
            raw: true,
            order: [['SemesterNumber', 'ASC']]
        });

        // Deduplicate: Keep only first occurrence of each SemesterNumber
        const semesterMap = new Map<number, any>();
        allSemesters.forEach(s => {
            if (s.SemesterNumber && !semesterMap.has(s.SemesterNumber)) {
                semesterMap.set(s.SemesterNumber, s);
            }
        });
        const semesters = Array.from(semesterMap.values());

        // Status options (hardcoded as business logic, but can be fetched from config)
        const statusOptions = [
            { value: 'Active', label: 'Active' },
            { value: 'Incomplete', label: 'Incomplete' },
            { value: 'Pending', label: 'Pending' },
            { value: 'Disabled', label: 'Disabled' }
        ];

        // Source options (can be expanded based on system design)
        const sourceOptions = [
            { value: 'Self Registered', label: 'Self Registered' },
            { value: 'Admin Added', label: 'Admin Added' },
            { value: 'Imported', label: 'Imported' }
        ];

        res.json({
            batchYears: batchYears.length > 0 ? batchYears : [new Date().getFullYear()],
            semesters,
            statusOptions,
            sourceOptions
        });
    } catch (error) {
        console.error("Error fetching filter options:", error);
        // Return sensible defaults on error
        res.status(200).json({
            batchYears: [new Date().getFullYear()],
            semesters: [],
            statusOptions: [
                { value: 'Active', label: 'Active' },
                { value: 'Incomplete', label: 'Incomplete' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Disabled', label: 'Disabled' }
            ],
            sourceOptions: [
                { value: 'Self Registered', label: 'Self Registered' },
                { value: 'Admin Added', label: 'Admin Added' },
                { value: 'Imported', label: 'Imported' }
            ]
        });
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
        await sequelize.transaction(async (t) => {
            // Clear dependent tables that have FK references to Students
            // Use try/catch per table in case some don't exist yet
            const dependentTables = ['SeatAllocations', 'StudentSubjects', 'ExamRegistrations', 'Attendance'];
            for (const table of dependentTables) {
                try {
                    await sequelize.query(`DELETE FROM [${table}]`, { transaction: t });
                } catch (tableErr: any) {
                    console.log(`[DeleteAll] Skipping ${table}: ${tableErr.message}`);
                }
            }
            // Now safe to delete all students
            await Student.destroy({ where: {}, truncate: false, transaction: t });
        });

        res.status(200).json({ message: "Successfully deleted all student records. User accounts are preserved." });

    } catch (error: any) {
        console.error("Delete All Students Error:", error);
        res.status(500).json({ message: "Failed to delete all students", error: error.message });
    }
};

// Bulk Import from CSV
export const bulkImportStudents = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No CSV file uploaded" });
        }

        const importService = new BulkStudentImportService();
        const result = await importService.importFromCSV(req.file.buffer);

        res.status(201).json({
            message: "Bulk import completed",
            data: result
        });

    } catch (error: any) {
        console.error("Bulk Import Error:", error);
        res.status(400).json({ message: error.message || "Failed to import students" });
    }
};

// Bulk Import with optional seat allocation
export const bulkImportStudentsWithSeats = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No CSV file uploaded" });
        }

        const { blockId, floorId, roomId, batchNumber } = req.body;

        // Optional validation if seat allocation is requested
        if (blockId && floorId && roomId) {
            if (!blockId || !floorId || !roomId) {
                return res.status(400).json({ 
                    message: "All of blockId, floorId, roomId must be provided for seat allocation" 
                });
            }
        }

        const importService = new BulkStudentImportService();
        const result = blockId && floorId && roomId
            ? await importService.importWithSeatAllocation(
                req.file.buffer,
                parseInt(blockId),
                parseInt(floorId),
                parseInt(roomId),
                batchNumber ? parseInt(batchNumber) : 1
            )
            : await importService.importFromCSV(req.file.buffer);

        res.status(201).json({
            message: "Bulk import completed",
            data: result
        });

    } catch (error: any) {
        console.error("Bulk Import with Seats Error:", error);
        res.status(400).json({ message: error.message || "Failed to import students" });
    }
};

// Get sample CSV template for bulk import
export const getStudentImportTemplate = async (req: Request, res: Response) => {
    try {
        const sampleData = [
            {
                FullName: "John Doe",
                RegisterNumber: "REG001",
                DepartmentCode: "CSE",
                ProgramName: "B.Tech",
                SemesterNumber: "1",
                Email: "john.doe@example.com"
            },
            {
                FullName: "Jane Smith",
                RegisterNumber: "REG002",
                DepartmentCode: "ECE",
                ProgramName: "B.Tech",
                SemesterNumber: "1",
                Email: "jane.smith@example.com"
            }
        ];

        // Create workbook and worksheet
        const worksheet = XLSX.utils.json_to_sheet(sampleData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

        // Set column widths
        worksheet['!cols'] = [
            { wch: 20 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 },
            { wch: 25 }
        ];

        // Send as attachment
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="student_import_template.xlsx"');
        
        const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
        res.send(buffer);

    } catch (error: any) {
        console.error("Template Generation Error:", error);
        res.status(500).json({ message: "Failed to generate template", error: error.message });
    }
};

export const importSeatingBatch = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
        const { rows } = req.body;

        if (!Array.isArray(rows) || rows.length === 0) {
            await t.rollback();
            return res.status(400).json({ message: "No rows provided" });
        }

        // Cache for lookups
        const deptCache = new Map<string, any>();
        const programCache = new Map<string, any>();
        const deptsAll = await Department.findAll({ transaction: t });
        const programsAll = await Program.findAll({ transaction: t });

        deptsAll.forEach((d: any) => {
            deptCache.set(d.DepartmentCode.toUpperCase(), d);
            deptCache.set(d.DepartmentName.toUpperCase(), d);
        });

        programsAll.forEach((p: any) => {
            if (p.ProgramCode) {
                programCache.set(p.ProgramCode.toUpperCase(), p);
            }
            programCache.set(p.ProgramName.toUpperCase(), p);
        });

        let totalImported = 0;
        let autoCreatedCount = 0;
        let notFoundCount = 0;
        const notFound: string[] = [];
        const errors: any[] = [];

        for (const row of rows) {
            try {
                const registerNumber = String(row.registerNumber).trim();
                const name = String(row.name || '').trim();
                const dept = String(row.department || '').trim();
                const program = String(row.program || '').trim();
                const side = String(row.side || 'L').toUpperCase();

                if (!registerNumber) {
                    errors.push({ row, error: 'Missing register number' });
                    notFoundCount++;
                    continue;
                }

                // Check if student already exists
                let student = await Student.findOne({
                    where: { RegisterNumber: registerNumber },
                    transaction: t
                });

                if (student) {
                    // Student already exists, just increment count
                    totalImported++;
                    continue;
                }

                // Parse batch year from register number (SJC/24/CSE/001 -> 2024)
                const parts = registerNumber.split('/');
                let batchYear = new Date().getFullYear();
                if (parts.length >= 2 && parts[1]) {
                    const yearPart = parseInt(parts[1], 10);
                    if (!isNaN(yearPart)) {
                        const century = yearPart < 30 ? 2000 : 1900;
                        batchYear = century + yearPart;
                    }
                }

                // Parse department from register number (SJC/24/CSE/001 -> CSE)
                let targetDept: any = null;
                if (parts.length >= 3 && parts[2]) {
                    const deptCode = parts[2].toUpperCase();
                    targetDept = deptCache.get(deptCode);
                }

                // Fallback: lookup by provided department field
                if (!targetDept && dept) {
                    targetDept = deptCache.get(dept.toUpperCase());
                }

                if (!targetDept) {
                    errors.push({ registerNumber, error: 'Department not found' });
                    notFoundCount++;
                    notFound.push(registerNumber);
                    continue;
                }

                // Lookup program
                let targetProgram: any = program ? programCache.get(program.toUpperCase()) : null;
                if (!targetProgram && programsAll.length > 0) {
                    // Fallback to first program (B.Tech)
                    targetProgram = programsAll[0];
                }

                if (!targetProgram) {
                    errors.push({ registerNumber, error: 'Program not found' });
                    notFoundCount++;
                    notFound.push(registerNumber);
                    continue;
                }

                // Default semester to first semester
                const semester = await Semester.findOne({
                    order: [['SemesterNumber', 'ASC']],
                    transaction: t
                });

                if (!semester) {
                    errors.push({ registerNumber, error: 'No semester found' });
                    notFoundCount++;
                    notFound.push(registerNumber);
                    continue;
                }

                // Create email for auto-created user
                const email = `${registerNumber.toLowerCase().replace(/\//g, '.')}@student.sjc.ac.in`;

                // Create user account
                const hashedPassword = await bcrypt.hash(registerNumber, 10);
                const user = await User.create({
                    Email: email,
                    FullName: name || registerNumber,
                    PasswordHash: hashedPassword,
                    Role: 'student',
                    IsActive: true
                }, { transaction: t }) as any;

                // Create student record
                await Student.create({
                    UserID: user.UserID,
                    RegisterNumber: registerNumber,
                    DepartmentID: targetDept.DepartmentID,
                    ProgramID: targetProgram.ProgramID,
                    SemesterID: semester.SemesterID,
                    BatchYear: batchYear,
                    Status: 'ACTIVE'
                }, { transaction: t });

                totalImported++;
                autoCreatedCount++;

            } catch (error: any) {
                console.error("Error processing row:", error);
                errors.push({ row, error: error.message });
                notFoundCount++;
            }
        }

        await t.commit();

        res.status(200).json({
            message: 'Seating batch import completed',
            totalImported,
            autoCreatedCount,
            notFoundCount,
            notFound,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error: any) {
        await t.rollback();
        console.error("Error importing seating batch:", error);
        res.status(500).json({
            message: "Failed to import seating data",
            error: error.message
        });
    }
};

/**
 * Toggle Student Account Status (Enable/Disable)
 * PATCH /api/students/:id/toggle-status
 */
export const toggleStudentAccountStatus = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const studentId = parseInt(id as string, 10);

        if (isNaN(studentId)) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid Student ID" });
        }

        const student = await Student.findByPk(studentId, { transaction: t });
        if (!student) {
            await t.rollback();
            return res.status(404).json({ message: "Student not found" });
        }

        if (!student.UserID) {
            await t.rollback();
            return res.status(400).json({ message: "Student has no associated user account" });
        }

        const user = await User.findByPk(student.UserID, { transaction: t });
        if (!user) {
            await t.rollback();
            return res.status(404).json({ message: "Associated user not found" });
        }

        // Toggle the account status
        const newStatus = !user.IsActive;
        await user.update({ IsActive: newStatus }, { transaction: t });

        await t.commit();

        const action = newStatus ? "enabled" : "disabled";
        res.json({
            message: `Student account ${action} successfully`,
            isActive: newStatus,
            studentId: studentId
        });

    } catch (error: any) {
        await t.rollback();
        console.error("Toggle Account Status Error:", error);
        res.status(500).json({ message: "Failed to toggle account status", error: error.message });
    }
};

/**
 * Reset Student Password
 * POST /api/students/:id/reset-password
 */
export const resetStudentPassword = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const studentId = parseInt(id as string, 10);

        if (isNaN(studentId)) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid Student ID" });
        }

        const student = await Student.findByPk(studentId, { transaction: t });

        if (!student) {
            await t.rollback();
            return res.status(404).json({ message: "Student not found" });
        }

        if (!student.UserID) {
            await t.rollback();
            return res.status(400).json({ message: "Student has no associated user account" });
        }

        const user = await User.findByPk(student.UserID, { transaction: t });
        if (!user) {
            await t.rollback();
            return res.status(404).json({ message: "Associated user not found" });
        }

        // Generate temporary password: First 4 chars of name + @123
        let firstName = (user.FullName || 'User').split(' ')[0] || 'User';
        const tempPassword = firstName.substring(0, 4) + '@123';

        // Hash and update password
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        await user.update({
            PasswordHash: hashedPassword,
            IsPasswordChanged: false // Reset the flag to force change on next login
        }, { transaction: t });

        await t.commit();

        // Log the password reset action
        console.log(`[PasswordReset] Student ${student.RegisterNumber} (${user.Email}) password reset by admin`);

        res.json({
            message: "Password reset successfully",
            studentId: studentId,
            registerNumber: student.RegisterNumber,
            email: user.Email,
            tempPassword: tempPassword, // Return to admin to share with student
            note: "Student must change this password on first login"
        });

    } catch (error: any) {
        await t.rollback();
        console.error("Reset Password Error:", error);
        res.status(500).json({ message: "Failed to reset password", error: error.message });
    }
};

/**
 * Soft Delete Student (Mark as Inactive)
 * DELETE /api/students/:id/soft-delete
 */
export const softDeleteStudent = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const studentId = parseInt(id as string, 10);

        if (isNaN(studentId)) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid Student ID" });
        }

        const student = await Student.findByPk(studentId, { transaction: t });
        if (!student) {
            await t.rollback();
            return res.status(404).json({ message: "Student not found" });
        }

        if (!student.UserID) {
            await t.rollback();
            return res.status(400).json({ message: "Student has no associated user account" });
        }

        const user = await User.findByPk(student.UserID, { transaction: t });
        if (!user) {
            await t.rollback();
            return res.status(404).json({ message: "Associated user not found" });
        }

        // Soft delete: Mark user as inactive instead of hard delete
        await user.update({ IsActive: false }, { transaction: t });

        // Update student status to DROPPED
        await student.update({ Status: 'DROPPED' }, { transaction: t });

        await t.commit();

        res.json({
            message: "Student deleted successfully (soft delete)",
            studentId: studentId,
            registerNumber: student.RegisterNumber
        });

    } catch (error: any) {
        await t.rollback();
        console.error("Soft Delete Student Error:", error);
        res.status(500).json({ message: "Failed to delete student", error: error.message });
    }
};


