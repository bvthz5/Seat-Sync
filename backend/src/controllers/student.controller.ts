import { Request, Response } from 'express';
import { Student } from '../models/Student.js';
import { User } from '../models/User.js';
import { Department } from '../models/Department.js';
import { Program } from '../models/Program.js';
import { Semester } from '../models/Semester.js';
import { sequelize } from '../config/database.js';
import { Op } from 'sequelize';
import bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';
import { BulkStudentImportService } from '../services/bulkStudentImport.service.js';
import { emailService } from '../services/email.service.js';
import { normalizeProgram, parseBatchString, mapProgramToDepartment, resolveOrCreateProgram, resolveOrCreateDepartment } from '../services/academicNormalizer.service.js';
import { generateDefaultPassword, generateStudentEmail, extractBatchYearFromRegisterNumber, extractProgramCodeFromRegisterNumber } from '../utils/student.utils.js';

const STUDENT_EMAIL_DOMAIN = 'sjcetpalai.ac.in';

// Removed buildImportedStudentEmail to stop generating fake/placeholder emails

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
                    attributes: ['Email', 'Role', 'FullName', 'IsActive', 'IsPasswordChanged'],
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



        // Calculate Stats (Parallel for performance)
        const commonInclude = search ? [{ model: User, attributes: [], required: true }] : [];

        const [deptResults, batchResults, incompleteProfiles, totalDatabaseCount, activeStudents, selfRegistered] = await Promise.all([
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
                        { '$User.FullName$': { [Op.or]: [null, ''] } },
                        { RegisterNumber: { [Op.or]: [null, ''] } },
                        { ProgramID: null }
                    ]
                } as any,
                include: [{ model: User, attributes: [], required: true }] as any,
                distinct: true,
                col: 'StudentID'
            }),
            Student.count(),
            Student.count({
                include: [{
                    model: User,
                    attributes: [],
                    required: true,
                    where: { IsActive: true }
                }],
                distinct: true,
                col: 'StudentID'
            }),
            Student.count({
                include: [{
                    model: User,
                    attributes: [],
                    required: true,
                    where: {
                        Role: 'student',
                        Email: { [Op.notLike]: '%@student.internal' }
                    }
                }],
                distinct: true,
                col: 'StudentID'
            })
        ]);

        const adminAdded = Math.max(totalDatabaseCount - selfRegistered, 0);

        const stats = {
            activeDepartments: deptResults.length,
            activeBatches: batchResults.length,
            incompleteProfiles,
            totalDatabaseCount,
            activeStudents,
            selfRegistered,
            adminAdded
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

        // Adaptive Parser: Read sheet as raw array to handle multi-section tables
        const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const data: any[] = [];
        let errors: any[] = [];
        let currentHeaders: string[] = [];
        let isCollecting = false;
        let globalBatch = '';

        for (let rowIdx = 0; rowIdx < rawRows.length; rowIdx++) {
            const row = rawRows[rowIdx];
            if (!row || row.length === 0) {
                isCollecting = false; // Stop on empty row
                continue;
            }

            // Look for section title rows
            const firstCell = String(row[0] || '').trim();
            if (firstCell.toLowerCase().includes('batch :') || firstCell.toLowerCase().includes('batch:')) {
                globalBatch = firstCell.replace(/batch\s*:/i, '').trim();
                continue;
            }

            // Detect headers (checking if it contains typical header keywords)
            const rowStr = row.map(c => String(c || '').toLowerCase()).join('|');
            if (rowStr.includes('name') && (rowStr.includes('batch') || rowStr.includes('reg') || rowStr.includes('sl no'))) {
                currentHeaders = row.map(h => String(h || '').trim());
                isCollecting = true;
                continue;
            }

            // Extract records based on detected headers
            if (isCollecting && currentHeaders.length > 0) {
                const record: any = {};
                let hasData = false;
                for (let colIdx = 0; colIdx < currentHeaders.length; colIdx++) {
                    const header = currentHeaders[colIdx];
                    if (!header) continue;
                    const val = row[colIdx];
                    if (val !== undefined && val !== null && String(val).trim() !== '') {
                        hasData = true;
                    }
                    if (header.toLowerCase() === 'sl no') continue; // Ignore Sl No
                    if (header.toLowerCase() === 'university regno' || header.toLowerCase().includes('regno') || header.toLowerCase().includes('reg no') || header.toLowerCase().includes('register')) {
                        record['Register Number'] = val;
                    } else if (header.toLowerCase() === 'name' || header.toLowerCase() === 'student name') {
                        record['Name'] = val;
                    } else if (header.toLowerCase() === 'batch') {
                        record['Batch'] = val;
                    } else {
                        record[header] = val;
                    }
                }
                
                if (!record['Batch'] && globalBatch) {
                     record['Batch'] = globalBatch;
                }

                const regNoVal = String(record['Register Number'] || '').toLowerCase();
                const nameVal = String(record['Name'] || '').toLowerCase();
                
                // Skip duplicated header rows inside the data
                if (nameVal.includes('name') && (regNoVal.includes('reg') || regNoVal === '')) {
                    console.warn("Skipping duplicated header row inside data.");
                    continue;
                }

                if (hasData && record['Name']) { // Only Name is strictly required
                    // Auto-generate missing register number
                    if (!record['Register Number']) {
                        record['Register Number'] = 'AUTO_' + Date.now() + '_' + Math.floor(Math.random() * 1000000) + '_' + rowIdx;
                    }
                    record['_sourceRowIdx'] = rowIdx + 1; // Store original 1-indexed row
                    data.push(record);
                } else if (hasData) {
                    console.warn("Skipped row (missing Name):", record);
                    errors.push({ row: rowIdx + 1, reason: "Missing Name" });
                }
            }
        }

        let successCount = 0;

        const toKey = (value: string) => value.trim().toUpperCase();
        const toNormalizedKey = (value: string) => toKey(value).replace(/[^A-Z0-9]/g, '');

        const getFlexibleValue = (cache: Map<string, any>, normalizedCache: Map<string, any>, input: unknown) => {
            if (input === undefined || input === null) return null;
            const raw = String(input).trim();
            if (!raw) return null;
            return cache.get(toKey(raw)) || normalizedCache.get(toNormalizedKey(raw)) || null;
        };

        const parseBatchInfo = (batchValue: unknown): {
            startYear?: number;
            endYear?: number;
            semesterNumber?: number;
            leadingCode?: string;
            batchPrefix?: string;
            prefixTokens?: string[];
        } => {
            if (batchValue === undefined || batchValue === null) return {};
            const text = String(batchValue).trim();
            if (!text) return {};

            const info: any = {};
            
            // New explicit match from prompt: "BHM 2023 (S1)"
            const customRegex = /([A-Z]+)\s(\d{4}).*(S(\d))/i;
            const customMatch = text.match(customRegex);
            if (customMatch) {
                 if (customMatch[1]) info.leadingCode = customMatch[1].toUpperCase();
                 if (customMatch[2]) info.startYear = parseInt(customMatch[2], 10);
                 if (customMatch[4]) info.semesterNumber = parseInt(customMatch[4], 10);
            }

            const yearMatch = text.match(/\b(20\d{2})\s*-\s*(20\d{2})\b/);
            const semesterMatch = text.match(/\(\s*S(?:EM)?\s*([0-9]+)\s*\)/i) || text.match(/\bS(?:EM)?\s*([0-9]+)\b/i);
            const leadingCodeMatch = text.match(/^\s*([A-Z]{2,10})\b/i);

            if (!info.startYear && yearMatch?.[1]) info.startYear = parseInt(yearMatch[1], 10);
            if (yearMatch?.[2]) info.endYear = parseInt(yearMatch[2], 10);
            if (!info.semesterNumber && semesterMatch?.[1]) info.semesterNumber = parseInt(semesterMatch[1], 10);

            const prefixRaw = yearMatch?.index !== undefined ? text.slice(0, yearMatch.index).trim() : text;
            const normalizedPrefix = prefixRaw.toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
            const prefixTokens = normalizedPrefix ? normalizedPrefix.split(/\s+/).filter(Boolean) : [];

            if (!info.leadingCode && leadingCodeMatch?.[1]) {
                info.leadingCode = leadingCodeMatch[1].toUpperCase();
            } else if (!info.leadingCode && prefixTokens.length > 0) {
                info.leadingCode = prefixTokens[0] as string;
            }
            
            if (normalizedPrefix) info.batchPrefix = normalizedPrefix;
            if (prefixTokens.length > 0) info.prefixTokens = prefixTokens;

            return info;
        };

        const normalizeSemesterNumber = (value: unknown): number | null => {
            if (value === undefined || value === null) return null;
            const text = String(value).trim();
            if (!text) return null;
            const match = text.match(/([0-9]+)/);
            if (!match?.[1]) return null;
            const sem = parseInt(match[1], 10);
            return Number.isNaN(sem) ? null : sem;
        };

        const resolveByCodeVariants = (
            cache: Map<string, any>,
            normalizedCache: Map<string, any>,
            rawCode: unknown
        ) => {
            if (rawCode === undefined || rawCode === null) return null;
            const code = String(rawCode).trim().toUpperCase();
            if (!code) return null;

            const exact = getFlexibleValue(cache, normalizedCache, code);
            if (exact) return exact;

            const normalized = toNormalizedKey(code);
            if (!normalized) return null;

            const variants: string[] = [];
            for (let i = normalized.length - 1; i >= 2; i--) {
                variants.push(normalized.slice(0, i));
            }
            for (let i = 1; i <= normalized.length - 2; i++) {
                variants.push(normalized.slice(i));
            }

            for (const variant of variants) {
                const found = cache.get(variant) || normalizedCache.get(variant);
                if (found) return found;
            }
            return null;
        };

        // Cache for Lookups to speed up loop
        const programCache = new Map<string, any>();
        const programNormalizedCache = new Map<string, any>();
        const deptCache = new Map<string, any>();
        const deptNormalizedCache = new Map<string, any>();
        const programsByDept = new Map<number, any[]>();
        const programsAll = await Program.findAll();
        const deptsAll = await Department.findAll();
        const semestersAll = await Semester.findAll();
        
        const existingStudentsAll = await Student.findAll();
        const existingUsersAll = await User.findAll();

        const existingStudentsMap = new Map<string, any>();
        const existingStudentsMapByUserId = new Map<number, any>();
        existingStudentsAll.forEach((s: any) => {
            existingStudentsMap.set(s.RegisterNumber, s);
            existingStudentsMapByUserId.set(s.UserID, s);
        });
        
        const existingUsersMap = new Map<number, any>();
        const existingUsersMapByEmail = new Map<string, any>();
        existingUsersAll.forEach((u: any) => {
            existingUsersMap.set(u.UserID, u);
            if (u.Email) existingUsersMapByEmail.set(u.Email, u);
        });

        // Semester lookup Map for O(1) speed
        const semestersMap = new Map<string, any>();
        semestersAll.forEach((s: any) => {
            semestersMap.set(`${s.ProgramID}_${s.SemesterNumber}`, s);
        });
        
        // Hash default password once to avoid O(N) bcrypt delay
        // bcrypt is already imported at the top

        // Normalize keys helper
        const normalizeKey = (row: any, keys: string[]) => {
            const rowKeys = Object.keys(row);
            for (const key of keys) {
                if (row[key] !== undefined) return row[key];
                const foundKey = rowKeys.find(k => k.toLowerCase().trim() === key.toLowerCase().trim());
                if (foundKey) return row[foundKey];
            }
            return undefined;
        };

        // Precompute all password hashes
        const passwordsToHash = new Set<string>();
        for (const row of data) {
            const name = normalizeKey(row, ['Name', 'Student Name', 'Full Name', 'StudentName']);
            const regNoRaw = normalizeKey(row, [
                'Register Number', 'RegisterNumber', 'Reg No', 'RegNo', 'Register', 'Register', 
                'Register No', 'University RegNo', 'University Reg No', 'UniversityRegNo'
            ]);
            const regNo = String(regNoRaw ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

            if (name && regNo) {
                const passwordStr = generateDefaultPassword(String(name), regNo);
                passwordsToHash.add(passwordStr);
            }
        }

        
        const precomputedHashes = new Map<string, string>();
        const passwordChunks = Array.from(passwordsToHash);
        
        // Batch hash in larger parallel groups (50) to fully utilize CPU
        const BATCH_SIZE = 50;
        for (let i = 0; i < passwordChunks.length; i += BATCH_SIZE) {
            const batch = passwordChunks.slice(i, i + BATCH_SIZE);
            const hashedBatch = await Promise.all(batch.map(pass => bcrypt.hash(pass, 12)));
            batch.forEach((pass, index) => {
                const hashValue = hashedBatch[index];
                if (hashValue) {
                    precomputedHashes.set(pass, hashValue);
                }
            });
        }

        programsAll.forEach((p: any) => {
            const programKeys = [p.ProgramCode, p.ProgramName].filter(Boolean) as string[];
            for (const key of programKeys) {
                programCache.set(toKey(key), p);
                programNormalizedCache.set(toNormalizedKey(key), p);
            }
            if (p.DepartmentID) {
                const existing = programsByDept.get(p.DepartmentID) || [];
                existing.push(p);
                programsByDept.set(p.DepartmentID, existing);
            }
        });

        deptsAll.forEach((d: any) => {
            const deptKeys = [d.DepartmentCode, d.DepartmentName].filter(Boolean) as string[];
            for (const key of deptKeys) {
                deptCache.set(toKey(key), d);
                deptNormalizedCache.set(toNormalizedKey(key), d);
            }
            deptCache.set(d.DepartmentID, d);
        });

        // DEBUG: Log headers
        if (data.length > 0) {
            try {
                const fs = await import('fs');
                const path = await import('path');
                fs.writeFileSync(path.resolve('debug_import_headers.log'), `Headers found: ${JSON.stringify(Object.keys(data[0]))}`);
            } catch (e) { }
        }

        // Collector arrays for bulk operations
        const usersToCreate: any[] = [];
        const studentsToCreate: any[] = [];
        const rowManifests: any[] = [];
        const fileProcessedRegNos = new Set<string>();
        const processedBatchEmails = new Set<string>();

        for (const row of data) {
            // Flexible Key Matching
            const regNoRaw = normalizeKey(row, [
                'Register Number', 'RegisterNumber', 'Reg No', 'RegNo', 'Register', 'Register', 
                'Register No', 'University RegNo', 'University Reg No', 'UniversityRegNo'
            ]);
            const name = normalizeKey(row, ['Name', 'Student Name', 'Full Name', 'StudentName']);
            const email = normalizeKey(row, ['Email', 'E-mail', 'Mail']);
            const programInput = normalizeKey(row, ['Program', 'Program Name', 'Programme', 'Course', 'Branch', 'Stream']);
            const semesterInput = normalizeKey(row, ['Semester', 'Sem', 'Term']);
            const batchInput = normalizeKey(row, ['Batch', 'Batch Name', 'Class']);
            
            const regNo = String(regNoRaw ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
            const normalizedName = String(name ?? '').trim();

            if (!regNo || !normalizedName) {
                if (regNo || normalizedName) errors.push({ row: row['_sourceRowIdx'] || 'Unknown', reason: `Missing critical data - RegNo: '${regNo}', Name: '${normalizedName}'` });
                continue;
            }

            // Prevent duplicate records within the same file from crashing the batch insert
            if (fileProcessedRegNos.has(regNo)) {
                console.warn(`Duplicate RegNo in file: ${regNo}. Skipping subsequent row.`);
                continue;
            }
            fileProcessedRegNos.add(regNo);

            try {
                // 1. Resolve Academic Context
                const rawAcademicString = row['Batch'] || programInput || batchInput;
                const parsed = parseBatchString(rawAcademicString);
                const programCode = normalizeProgram(parsed.programCode);
                
                let targetProgram = programNormalizedCache.get(programCode);
                if (!targetProgram) {
                    targetProgram = await resolveOrCreateProgram(programCode, t);
                    programNormalizedCache.set(programCode, targetProgram);
                }

                let targetDept = targetProgram.DepartmentID ? deptCache.get(targetProgram.DepartmentID) : null;
                if (!targetDept && targetProgram.DepartmentID) {
                    targetDept = await Department.findByPk(targetProgram.DepartmentID, { transaction: t });
                    if (targetDept) deptCache.set(targetProgram.DepartmentID, targetDept);
                }

                if (!targetProgram || !targetDept) throw new Error(`Could not resolve Dept/Prog for ${programCode}`);

                // 2. Resolve Semester
                const existingStudent = existingStudentsMap.get(regNo);
                // Try to get batch year from: parsed data > register number > existing student > current year
                const joiningYearFromReg = extractBatchYearFromRegisterNumber(regNo);
                const effectiveBatchYear = parsed.batchYear || joiningYearFromReg || existingStudent?.BatchYear || new Date().getFullYear();
                
                let parsedSemester = parsed.semester || normalizeSemesterNumber(semesterInput) || 1;
                if (!parsed.semester && !semesterInput) {
                    const yearsComp = new Date().getFullYear() - effectiveBatchYear;
                    parsedSemester = Math.min(Math.max((yearsComp * 2) + 1, 1), targetProgram.TotalSemesters || 6);
                }

                let targetSemester = semestersMap.get(`${targetProgram.ProgramID}_${parsedSemester}`);
                if (!targetSemester) {
                    targetSemester = await Semester.create({
                        ProgramID: targetProgram.ProgramID,
                        SemesterNumber: parsedSemester,
                        SemesterName: `S${parsedSemester}`,
                        IsActive: true
                    }, { transaction: t });
                    semestersMap.set(`${targetProgram.ProgramID}_${parsedSemester}`, targetSemester);
                }

                // 3. Resolve User (Use null if email missing, no fake generation)
                const rawPassword = generateDefaultPassword(normalizedName, regNo);
                const defaultPassword = precomputedHashes.get(rawPassword) || await bcrypt.hash(rawPassword, 12);

                const studentEmail = (email && String(email).includes('@')) ? String(email).trim().toLowerCase() : null;

                let user = existingStudent?.UserID ? existingUsersMap.get(existingStudent.UserID) : (studentEmail ? existingUsersMapByEmail.get(studentEmail) : null);
                
                rowManifests.push({
                    row,
                    regNo,
                    normalizedName,
                    targetDept,
                    targetProgram,
                    targetSemester,
                    batchYear: effectiveBatchYear,
                    user,
                    email: studentEmail,
                    password: defaultPassword,
                    existingStudent
                });

            } catch (err: any) {
                errors.push({ row: row['_sourceRowIdx'] || 'Unknown', reason: `Parsing error (${regNo}): ${err.message}` });
            }
        }

        // Pass 2: Execute Batch Operations in chunks for maximum performance securely
        // Using Promise.all within a single SQL transaction causes connection pool exhaustion in MSSQL.
        // We must execute them sequentially within the transaction, or use true bulk operations.
        const chunkSize = 100;
        for (let i = 0; i < rowManifests.length; i += chunkSize) {
            const chunk = rowManifests.slice(i, i + chunkSize);
            for (const m of chunk) {
                try {
                    let currentUser = m.user;
                    if (!currentUser) {
                        // Generate institutional email if not provided in import file
                        // Use program code from register number for consistent email format
                        const programCodeFromReg = extractProgramCodeFromRegisterNumber(m.regNo) || m.targetProgram?.ProgramCode || m.targetDept?.DepartmentCode || 'STUDENT';
                        const generatedEmail = m.email || generateStudentEmail(
                            m.normalizedName,
                            m.batchYear,
                            programCodeFromReg,
                            m.targetProgram?.DurationYears || 2
                        );
                        
                        currentUser = await User.create({
                            Email: generatedEmail,
                            FullName: m.normalizedName,
                            PasswordHash: m.password,
                            Role: 'student',
                            IsActive: true,
                            IsPasswordChanged: false, // Force change on first login
                            FailedLoginAttempts: 0,
                            AccountLockedUntil: null
                        }, { transaction: t });
                        if (m.email) existingUsersMapByEmail.set(m.email, currentUser);
                    } else {
                        // Ensure existing user is active and unlocked
                        const updateData: any = {};
                        if (currentUser.FullName !== m.normalizedName) updateData.FullName = m.normalizedName;
                        if (!currentUser.IsActive) updateData.IsActive = true;
                        if (currentUser.FailedLoginAttempts > 0) updateData.FailedLoginAttempts = 0;
                        if (currentUser.AccountLockedUntil) updateData.AccountLockedUntil = null;

                        if (Object.keys(updateData).length > 0) {
                            await currentUser.update(updateData, { transaction: t });
                        }
                    }

                    if (m.existingStudent) {
                        const hasChanged = 
                            m.existingStudent.UserID !== currentUser.UserID ||
                            m.existingStudent.DepartmentID !== m.targetDept.DepartmentID ||
                            m.existingStudent.ProgramID !== m.targetProgram.ProgramID ||
                            m.existingStudent.SemesterID !== m.targetSemester.SemesterID ||
                            m.existingStudent.BatchYear !== m.batchYear;

                        if (hasChanged) {
                            await m.existingStudent.update({
                                UserID: currentUser.UserID,
                                DepartmentID: m.targetDept.DepartmentID,
                                ProgramID: m.targetProgram.ProgramID,
                                SemesterID: m.targetSemester.SemesterID,
                                BatchYear: m.batchYear
                            }, { transaction: t });
                        }
                    } else {
                        await Student.create({
                            UserID: currentUser.UserID,
                            RegisterNumber: m.regNo,
                            DepartmentID: m.targetDept.DepartmentID,
                            ProgramID: m.targetProgram.ProgramID,
                            SemesterID: m.targetSemester.SemesterID,
                            BatchYear: m.batchYear
                        }, { transaction: t });
                        m.existingStudent = true; // prevent double insertion in rare cases within exact same chunk
                    }
                    successCount++;
                } catch (err: any) {
                    const errorDetail = err.errors ? err.errors.map((e: any) => e.message).join(', ') : err.message;
                    errors.push({ row: m.row['_sourceRowIdx'] || 'Unknown', reason: `Insertion error (${m.normalizedName} | ${m.regNo}): ${errorDetail}` });   
                }
            }
        }

        await t.commit();
        
        // Final background logging of errors
        if (errors.length > 0) {
            try {
                const { appendFileSync } = await import('fs');
                const { resolve } = await import('path');
                appendFileSync(resolve('debug_error.log'), `Import on ${new Date().toISOString()}:\n${errors.map((e:any) => typeof e === 'string' ? e : `Row ${e.row}: ${e.reason}`).join('\n')}\n`);
            } catch (e) {}
        }

        res.status(200).json({
            message: "Import processing complete",
            successCount,
            errorCount: errors.length,
            errors
        });

    } catch (error: any) {
        try { await t.rollback(); } catch (e) {}
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

export const syncSemesters = async (req: Request, res: Response) => {
    try {
        const { promoteStudents } = await import('../cron/academic.cron.js');
        await promoteStudents();
        res.json({ message: "Semester sync completed successfully" });
    } catch (err: any) {
        res.status(500).json({ message: "Failed to sync semesters", error: err.message });
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
                    targetDept = deptsAll.find((d: any) => d.DepartmentCode === 'CA' || d.DepartmentCode === 'CSE');
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
        const plainTextPassword = generateDefaultPassword(FullName, regNo);
        const hashedPassword = await bcrypt.hash(plainTextPassword, 12);

        // Use provided email or null
        const userEmail = collegeEmail || null;

        let user = null;
        if (userEmail) {
            user = await User.findOne({ where: { Email: userEmail }, transaction: t });
        }

        if (!user) {
            user = await User.create({
                Email: userEmail as string | null,
                FullName,
                PasswordHash: hashedPassword,
                Role: 'student',
                IsRootAdmin: false,
                IsPasswordChanged: false // Force change on first login
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
            emailService.sendStudentCredentialsEmail(collegeEmail, FullName, userEmail as string, plainTextPassword, regNo)
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
        const programs = await Program.findAll({ attributes: ['ProgramID', 'ProgramName', 'DepartmentID'] });
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
                    await sequelize.query(`DELETE FROM \`${table}\``, { transaction: t });
                } catch (tableErr: any) {
                    console.error(`[DeleteAll] Skipping ${table}: ${tableErr.message}`);
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

        // Generate temporary password: Standard Formula (with aggressive trimming)
        const cleanFullName = (user.FullName || 'Student').trim();
        const cleanRegNo = (student.RegisterNumber || '').trim().toUpperCase();
        const tempPassword = generateDefaultPassword(cleanFullName, cleanRegNo);

        // Hash and update password
        const hashedPassword = await bcrypt.hash(tempPassword, 12);
        await user.update({
            PasswordHash: hashedPassword,
            IsPasswordChanged: false, // Reset the flag to force change on next login
            FailedLoginAttempts: 0,   // Reset failed attempts
            AccountLockedUntil: null  // Unlock account if it was locked
        }, { transaction: t });

        await t.commit();



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

export const exportStudentCredentials = async (req: Request, res: Response) => {
    try {
        const { dept } = req.query;
        const whereClause: any = { Status: 'ACTIVE' };
        
        if (dept && !isNaN(parseInt(dept as string))) {
            whereClause.DepartmentID = parseInt(dept as string);
        }

        const students = await Student.findAll({
            include: [
                { model: User, attributes: ['Email', 'FullName', 'IsPasswordChanged'] },
                { model: Department, attributes: ['DepartmentName', 'DepartmentCode'] },
                { model: Program, attributes: ['ProgramCode', 'ProgramName'] }
            ],
            where: whereClause,
            order: [
                ['DepartmentID', 'ASC'],
                ['RegisterNumber', 'ASC']
            ]
        });

        const wb = XLSX.utils.book_new();

        // Group students by department
        const deptGroups = new Map<string, any[]>();
        
        students.forEach(s => {
            const deptName = s.Department?.DepartmentName || 'General';
            if (!deptGroups.has(deptName)) {
                deptGroups.set(deptName, []);
            }
            
            const fullName = (s.FullName || s.User?.FullName || 'Student').trim();
            const regNo = (s.RegisterNumber || '').trim().toUpperCase();
            const isChanged = s.User?.IsPasswordChanged;
            
            const email = s.User?.Email || generateStudentEmail(
                fullName, 
                s.BatchYear || new Date().getFullYear(), 
                s.Program?.ProgramCode || s.Department?.DepartmentCode || 'STUDENT',
                s.Program?.DurationYears || 2
            );
            
            deptGroups.get(deptName)?.push({
                'Register Number': regNo,
                'Email': email,
                'Full Name': fullName,
                'Default Password': generateDefaultPassword(fullName, regNo),
                'Password Status': isChanged ? 'Changed' : 'Initial Default',
                'Note': isChanged 
                    ? 'Password already changed by student. If login fails, student must use their new password.' 
                    : 'Initial default password. Use the Email and Password shown here.'
            });
        });

        if (deptGroups.size === 0) {
            const ws = XLSX.utils.json_to_sheet([{ Message: 'No active students found' }]);
            XLSX.utils.book_append_sheet(wb, ws, "Empty");
        } else {
            deptGroups.forEach((data, deptName) => {
                const safeSheetName = deptName.substring(0, 31).replace(/[\[\]\*\?\/\\\:]/g, '');
                const ws = XLSX.utils.json_to_sheet(data);
                
                const colWidths = [
                    { wch: 20 }, // Register Number
                    { wch: 30 }, // Full Name
                    { wch: 20 }, // Default Password
                    { wch: 15 }, // Password Status
                    { wch: 80 }  // Note
                ];
                ws['!cols'] = colWidths;
                
                XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
            });
        }

        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', 'attachment; filename=Student_Credentials_List.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buf);
    } catch (error: any) {
        console.error("Export Credentials Error:", error);
        res.status(500).json({ message: "Failed to export credentials", error: error.message });
    }
};


