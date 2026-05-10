import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import * as XLSX from 'xlsx';
import {
    InternalStudent,
    InternalExamRegistration,
    InternalExam,
    InternalExamDepartment,
    Department,
    Program,
    Semester,
    User,
} from '../models/index.js';
import { generateDefaultPassword, generateStudentEmail } from '../utils/student.utils.js';
import { normalizeProgram, parseBatchString, resolveOrCreateProgram, resolveOrCreateDepartment } from '../services/academicNormalizer.service.js';

/* ════════════════════════════════════════════════════════════════
 *  GET /api/internal/students
 *  List all internal students with pagination, search & filters
 * ════════════════════════════════════════════════════════════════ */
export const getAllInternalStudents = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 25;
        const offset = (page - 1) * limit;
        const search = (req.query.search as string || '').trim();
        const deptId = req.query.dept ? parseInt(req.query.dept as string) : null;
        const batchYear = req.query.batch ? parseInt(req.query.batch as string) : null;
        const examId = req.query.examId ? parseInt(req.query.examId as string) : null;

        const where: any = {};
        if (deptId) where.DepartmentID = deptId;
        if (batchYear) where.BatchYear = batchYear;
        if (search) {
            where[Op.or] = [
                { RegisterNumber: { [Op.like]: `%${search}%` } },
                { FullName: { [Op.like]: `%${search}%` } },
            ];
        }

        // If examId filter is provided, only return students mapped to that exam
        let studentIds: number[] | null = null;
        if (examId) {
            const regs = await InternalExamRegistration.findAll({
                where: { InternalExamID: examId },
                attributes: ['InternalStudentID'],
                raw: true,
            });
            studentIds = regs.map((r: any) => r.InternalStudentID);
            if (studentIds.length === 0) {
                return res.json({ totalItems: 0, totalPages: 0, currentPage: page, students: [] });
            }
            where.InternalStudentID = { [Op.in]: studentIds };
        }

        const { count, rows } = await InternalStudent.findAndCountAll({
            where,
            include: [
                { model: Department, attributes: ['DepartmentID', 'DepartmentCode', 'DepartmentName'] },
                { model: Program, attributes: ['ProgramID', 'ProgramName', 'ProgramCode'] },
                { model: Semester, attributes: ['SemesterID', 'SemesterNumber'] },
                { model: User, attributes: ['UserID', 'Email'] }
            ],
            limit,
            offset,
            order: [['RegisterNumber', 'ASC']],
        });

        // Fetch Stats
        const [totalActive, graduated, dropped, inactive, adminAdded] = await Promise.all([
            InternalStudent.count({ where: { Status: 'ACTIVE' } }),
            InternalStudent.count({ where: { Status: 'GRADUATED' } }),
            InternalStudent.count({ where: { Status: 'DROPPED' } }),
            InternalStudent.count({ where: { Status: 'INACTIVE' } }),
            InternalStudent.count({ where: { Source: 'Admin Added' } })
        ]);

        res.json({
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            students: rows,
            stats: {
                totalStudents: count,
                activeStudents: totalActive,
                graduated: graduated,
                dropped: dropped,
                inactive: inactive,
                adminAdded: adminAdded
            }
        });
    } catch (error: any) {
        console.error('GET Internal Students Error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getInternalStudentStats = async (req: Request, res: Response) => {
    try {
        const [total, active, incomplete, selfReg, adminAdded] = await Promise.all([
            InternalStudent.count(),
            InternalStudent.count({ where: { Status: 'ACTIVE' } }),
            InternalStudent.count({ where: { UserID: null } }),
            InternalStudent.count({ where: { Source: 'Self Registered' } }),
            InternalStudent.count({ where: { Source: 'Admin Added' } })
        ]);

        res.json({
            totalStudents: total,
            activeStudents: active,
            incompleteProfiles: incomplete,
            selfRegistered: selfReg,
            adminAdded: adminAdded
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/* ════════════════════════════════════════════════════════════════
 *  GET /api/internal/students/filter-options
 *  Returns batch years, departments, semesters for filter dropdowns
 * ════════════════════════════════════════════════════════════════ */
export const getInternalFilterOptions = async (_req: Request, res: Response) => {
    try {
        const [batchRows, departments] = await Promise.all([
            InternalStudent.findAll({
                attributes: [[sequelize.fn('DISTINCT', sequelize.col('BatchYear')), 'BatchYear']],
                raw: true,
                order: [['BatchYear', 'DESC']],
            }),
            Department.findAll({ attributes: ['DepartmentID', 'DepartmentCode', 'DepartmentName'], order: [['DepartmentName', 'ASC']] }),
        ]);
        const batchYears = (batchRows as any[]).map(r => r.BatchYear).filter(Boolean).sort((a: number, b: number) => b - a);
        res.json({ batchYears, departments });
    } catch (error: any) {
        console.error('Internal Filter Options Error:', error);
        res.status(500).json({ message: error.message });
    }
};

/* ════════════════════════════════════════════════════════════════
 *  POST /api/internal/students/import
 *  Bulk import students into InternalStudents AND map them to
 *  a specific InternalExam.
 *
 *  Body: multipart form with:
 *    - file (Excel/CSV)
 *    - internalExamId (optional — the exam to map students to)
 * ════════════════════════════════════════════════════════════════ */
export const importInternalStudents = async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const internalExamId = req.body.internalExamId ? parseInt(req.body.internalExamId) : null;
    
    // Verify exam if provided
    let exam = null;
    if (internalExamId) {
        exam = await InternalExam.findByPk(internalExamId);
        if (!exam) return res.status(404).json({ message: `Internal exam #${internalExamId} not found.` });
    }

    const t = await sequelize.transaction();
    try {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) { await t.rollback(); return res.status(400).json({ message: 'No sheets in file' }); }
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) { await t.rollback(); return res.status(400).json({ message: 'Empty sheet' }); }

        // ── Adaptive multi-section parser (Enhanced to match end-sem) ──
        const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const data: any[] = [];
        let currentHeaders: string[] = [];
        let isCollecting = false;
        let globalBatch = '';

        for (let rowIdx = 0; rowIdx < rawRows.length; rowIdx++) {
            const row = rawRows[rowIdx];
            if (!row || row.length === 0) { isCollecting = false; continue; }

            const firstCell = String(row[0] || '').trim();
            if (firstCell.toLowerCase().includes('batch :') || firstCell.toLowerCase().includes('batch:')) {
                globalBatch = firstCell.replace(/batch\s*:/i, '').trim();
                continue;
            }

            // Enhanced header detection logic from end-sem
            const rowStr = row.map((c: any) => String(c || '').toLowerCase()).join('|');
            if (rowStr.includes('name') && (rowStr.includes('batch') || rowStr.includes('reg') || rowStr.includes('sl no') || rowStr.includes('register') || rowStr.includes('roll'))) {
                currentHeaders = row.map((h: any) => String(h || '').trim());
                isCollecting = true;
                continue;
            }

            if (isCollecting && currentHeaders.length > 0) {
                const record: any = {};
                let hasData = false;
                for (let colIdx = 0; colIdx < currentHeaders.length; colIdx++) {
                    const header = currentHeaders[colIdx];
                    if (!header) continue;
                    const val = row[colIdx];
                    if (val !== undefined && val !== null && String(val).trim() !== '') hasData = true;

                    const h = header.toLowerCase().trim();
                    if (h === 'sl no' || h === 'slno' || h === 'sno' || h === 'no') continue;
                    
                    // Match register number, regno, roll no etc.
                    if (h === 'university regno' || h.includes('regno') || h.includes('reg no') || h.includes('register') || h.includes('roll')) {
                         record['RegisterNumber'] = val;
                    } else if (h === 'name' || h === 'student name' || h === 'full name') {
                         record['Name'] = val;
                    } else if (h === 'batch' || h === 'class' || h.includes('batch')) {
                         record['Batch'] = val;
                    } else if (h === 'dept' || h === 'branch' || h === 'department') {
                         record['Department'] = val;
                    } else if (h === 'sem' || h === 'semester') {
                         record['Semester'] = val;
                    } else if (h === 'prog' || h === 'program' || h === 'course') {
                         record['Program'] = val;
                    } else if (h.includes('email') || h.includes('mail')) {
                         record['Email'] = val;
                    } else {
                         record[header] = val;
                    }
                }
                
                if (!record['Batch'] && globalBatch) record['Batch'] = globalBatch;

                // Skip duplicated header rows inside data
                const nameVal = String(record['Name'] || '').toLowerCase();
                const regVal = String(record['RegisterNumber'] || '').toLowerCase();
                if (nameVal.includes('name') && (regVal.includes('reg') || regVal === '')) continue;

                if (hasData && record['Name']) {
                    if (!record['RegisterNumber']) {
                        record['RegisterNumber'] = 'AUTO_' + Date.now() + '_' + Math.floor(Math.random() * 1e6) + '_' + rowIdx;
                    }
                    record._row = rowIdx + 1;
                    data.push(record);
                }
            }
        }


        // ── Preload caches ──
        const deptsAll = await Department.findAll({ transaction: t });
        const programsAll = await Program.findAll({ transaction: t });
        const semestersAll = await Semester.findAll({ transaction: t });
        const deptCache = new Map<string, any>();
        deptsAll.forEach((d: any) => {
            deptCache.set(d.DepartmentCode?.toUpperCase(), d);
            deptCache.set(d.DepartmentName?.toUpperCase(), d);
        });
        const progCache = new Map<string, any>();
        programsAll.forEach((p: any) => {
            if (p.ProgramCode) progCache.set(p.ProgramCode.toUpperCase(), p);
            progCache.set(p.ProgramName?.toUpperCase(), p);
        });
        const semCache = new Map<string, any>();
        semestersAll.forEach((s: any) => semCache.set(`${s.ProgramID}_${s.SemesterNumber}`, s));

        let successCount = 0;
        let mappedCount = 0;
        const errors: any[] = [];
        const processedRegNos = new Set<string>();

        for (const row of data) {
            const regNo = String(row['RegisterNumber'] || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
            const name = String(row['Name'] || '').trim();
            if (!regNo || !name) { errors.push({ row: row._row, reason: 'Missing name or register number' }); continue; }
            if (processedRegNos.has(regNo)) continue;
            processedRegNos.add(regNo);

            try {
                // Resolve academic context
                const rawAcademic = row['Batch'] || row['Program'] || row['Department'] || '';
                const parsed = parseBatchString(rawAcademic);
                const programCode = normalizeProgram(parsed.programCode !== 'UNKNOWN' ? parsed.programCode : (row['Program'] || row['Department'] || ''));

                let targetProgram = progCache.get(programCode);
                if (!targetProgram) {
                    targetProgram = await resolveOrCreateProgram(programCode, t);
                    progCache.set(programCode, targetProgram);
                }

                let targetDept = targetProgram?.DepartmentID ? deptCache.get(String(targetProgram.DepartmentID)) : null;
                if (!targetDept && targetProgram?.DepartmentID) {
                    targetDept = await Department.findByPk(targetProgram.DepartmentID, { transaction: t });
                    if (targetDept) deptCache.set(String(targetDept.DepartmentID), targetDept);
                }

                // Explicit department override from Excel
                if (!targetDept && row['Department']) {
                    const deptKey = String(row['Department']).trim().toUpperCase();
                    targetDept = deptCache.get(deptKey);
                    if (!targetDept) {
                        targetDept = await resolveOrCreateDepartment(deptKey, deptKey, t);
                        deptCache.set(deptKey, targetDept);
                    }
                }

                // Resolve semester
                const semNum = parsed.semester || (row['Semester'] ? parseInt(String(row['Semester']).replace(/[^0-9]/g, '')) : null) || 1;
                const batchYear = parsed.batchYear || (row['Batch'] ? parseInt(String(row['Batch']).replace(/[^0-9]/g, '').slice(0, 4)) : null) || new Date().getFullYear();
                
                let targetSemester: any = null;
                if (targetProgram) {
                    targetSemester = semCache.get(`${targetProgram.ProgramID}_${semNum}`);
                    if (!targetSemester) {
                        targetSemester = await Semester.create({
                            ProgramID: targetProgram.ProgramID,
                            SemesterNumber: semNum,
                            SemesterName: `S${semNum}`,
                            IsActive: true,
                        }, { transaction: t });
                        semCache.set(`${targetProgram.ProgramID}_${semNum}`, targetSemester);
                    }
                }

                // ── Upsert InternalStudent ──
                let student = await InternalStudent.findOne({
                    where: { RegisterNumber: regNo },
                    transaction: t,
                });

                if (student) {
                    await student.update({
                        FullName: name,
                        DepartmentID: targetDept?.DepartmentID ?? student.DepartmentID,
                        ProgramID: targetProgram?.ProgramID ?? student.ProgramID,
                        SemesterID: targetSemester?.SemesterID ?? student.SemesterID,
                        BatchYear: batchYear || student.BatchYear,
                    }, { transaction: t });
                } else {
                    student = await InternalStudent.create({
                        RegisterNumber: regNo,
                        FullName: name,
                        DepartmentID: targetDept?.DepartmentID ?? null,
                        ProgramID: targetProgram?.ProgramID ?? null,
                        SemesterID: targetSemester?.SemesterID ?? null,
                        BatchYear: batchYear,
                        Status: 'ACTIVE',
                        Source: 'Imported',
                    }, { transaction: t });
                }
                successCount++;

                // ── Map student to the Internal Exam (if examId provided) ──
                if (internalExamId) {
                    const [_reg, created] = await InternalExamRegistration.findOrCreate({
                        where: {
                            InternalExamID: internalExamId,
                            InternalStudentID: student.InternalStudentID,
                        },
                        defaults: {
                            InternalExamID: internalExamId,
                            InternalStudentID: student.InternalStudentID,
                        } as any,
                        transaction: t,
                    });
                    if (created) mappedCount++;
                }

            } catch (err: any) {
                errors.push({ row: row._row, reason: `${regNo}: ${err.message}` });
            }
        }

        await t.commit();

        res.json({
            message: 'Internal student import complete',
            importType: 'INTERNAL',
            examId: internalExamId,
            examName: exam ? `${exam.SubjectCode} - ${exam.SubjectName}` : 'Global Import',
            studentsImported: successCount,
            studentsMapped: mappedCount,
            errorCount: errors.length,
            errors: errors.slice(0, 50),
        });
    } catch (error: any) {
        try { await t.rollback(); } catch (_) {}
        console.error('Internal Student Import Error:', error);
        res.status(500).json({ message: error.message });
    }
};

/* ════════════════════════════════════════════════════════════════
 *  GET /api/internal/exams/:examId/students
 *  Get all students mapped to a specific internal exam
 * ════════════════════════════════════════════════════════════════ */
export const getStudentsForInternalExam = async (req: Request, res: Response) => {
    try {
        const examId = parseInt(req.params.examId as string);
        if (!examId || isNaN(examId)) return res.status(400).json({ message: 'examId is required' });

        const exam = await InternalExam.findByPk(examId, {
            include: [
                { model: InternalExamDepartment, include: [{ model: Department }] },
            ],
        });
        if (!exam) return res.status(404).json({ message: 'Internal exam not found' });

        const registrations = await InternalExamRegistration.findAll({
            where: { InternalExamID: examId },
            include: [{
                model: InternalStudent,
                as: 'Student',
                include: [
                    { model: Department, attributes: ['DepartmentID', 'DepartmentCode', 'DepartmentName'] },
                    { model: Program, attributes: ['ProgramID', 'ProgramName'] },
                    { model: Semester, attributes: ['SemesterID', 'SemesterNumber'] },
                ],
            }],
            order: [[{ model: InternalStudent, as: 'Student' }, 'RegisterNumber', 'ASC']],
        });

        const students = registrations.map((reg: any) => ({
            registrationId: reg.InternalExamRegistrationID,
            internalStudentId: reg.Student?.InternalStudentID,
            registerNumber: reg.Student?.RegisterNumber,
            fullName: reg.Student?.FullName,
            department: reg.Student?.Department?.DepartmentName,
            departmentCode: reg.Student?.Department?.DepartmentCode,
            program: reg.Student?.Program?.ProgramName,
            semester: reg.Student?.Semester?.SemesterNumber,
            batchYear: reg.Student?.BatchYear,
        }));

        res.json({
            exam: {
                InternalExamID: exam.InternalExamID,
                SubjectCode: exam.SubjectCode,
                SubjectName: exam.SubjectName,
                ExamDate: exam.ExamDate,
                Session: exam.Session,
                Semester: exam.Semester,
                Duration: exam.Duration,
                departments: (exam as any).InternalExamDepartments?.map((d: any) => ({
                    DepartmentID: d.Department?.DepartmentID,
                    DepartmentCode: d.Department?.DepartmentCode,
                    DepartmentName: d.Department?.DepartmentName,
                })) || [],
            },
            totalStudents: students.length,
            students,
        });
    } catch (error: any) {
        console.error('Get Students for Internal Exam Error:', error);
        res.status(500).json({ message: error.message });
    }
};

/* ════════════════════════════════════════════════════════════════
 *  DELETE /api/internal/exams/:examId/students/:studentId
 *  Remove a single student mapping from an internal exam
 * ════════════════════════════════════════════════════════════════ */
export const removeStudentFromInternalExam = async (req: Request, res: Response) => {
    try {
        const examId = parseInt(req.params.examId as string);
        const studentId = parseInt(req.params.studentId as string);
        const deleted = await InternalExamRegistration.destroy({
            where: { InternalExamID: examId, InternalStudentID: studentId },
        });
        if (deleted === 0) return res.status(404).json({ message: 'Mapping not found' });
        res.json({ message: 'Student removed from exam' });
    } catch (error: any) {
        console.error('Remove Student from Internal Exam Error:', error);
        res.status(500).json({ message: error.message });
    }
};

/* ════════════════════════════════════════════════════════════════
 *  DELETE /api/internal/exams/:examId/students
 *  Clear ALL student mappings for an internal exam
 * ════════════════════════════════════════════════════════════════ */
export const clearStudentsFromInternalExam = async (req: Request, res: Response) => {
    try {
        const examId = parseInt(req.params.examId as string);
        const deleted = await InternalExamRegistration.destroy({
            where: { InternalExamID: examId },
        });
        res.json({ message: `Cleared ${deleted} student mapping(s) from exam` });
    } catch (error: any) {
        console.error('Clear Students from Internal Exam Error:', error);
        res.status(500).json({ message: error.message });
    }
};

/* ════════════════════════════════════════════════════════════════
 *  GET /api/internal/exams/:examId/detail
 *  Full detail view of an internal exam including mapped students count
 * ════════════════════════════════════════════════════════════════ */
export const getInternalExamDetail = async (req: Request, res: Response) => {
    try {
        const examId = parseInt(req.params.examId as string);
        if (!examId || isNaN(examId)) return res.status(400).json({ message: 'examId required' });

        const exam = await InternalExam.findByPk(examId, {
            include: [
                { model: InternalExamDepartment, include: [{ model: Department }] },
            ],
        });
        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        const studentCount = await InternalExamRegistration.count({
            where: { InternalExamID: examId },
        });

        // Department-wise breakdown
        const deptBreakdown = await sequelize.query<{ DepartmentCode: string; DepartmentName: string; count: number }>(`
            SELECT d.DepartmentCode, d.DepartmentName, COUNT(*) as count
            FROM InternalExamRegistrations ier
            INNER JOIN InternalStudents ist ON ist.InternalStudentID = ier.InternalStudentID
            INNER JOIN Departments d ON d.DepartmentID = ist.DepartmentID
            WHERE ier.InternalExamID = :examId
            GROUP BY d.DepartmentCode, d.DepartmentName
            ORDER BY d.DepartmentCode ASC
        `, {
            replacements: { examId },
            type: 'SELECT' as any,
        });

        res.json({
            exam: {
                InternalExamID: exam.InternalExamID,
                SubjectCode: exam.SubjectCode,
                SubjectName: exam.SubjectName,
                ExamDate: exam.ExamDate,
                Session: exam.Session,
                Semester: exam.Semester,
                Slot: (exam as any).Slot,
                Duration: exam.Duration,
                StartTime: exam.StartTime,
                EndTime: exam.EndTime,
                departments: (exam as any).InternalExamDepartments?.map((d: any) => ({
                    DepartmentID: d.Department?.DepartmentID,
                    DepartmentCode: d.Department?.DepartmentCode,
                    DepartmentName: d.Department?.DepartmentName,
                })) || [],
            },
            studentCount,
            departmentBreakdown: deptBreakdown,
        });
    } catch (error: any) {
        console.error('Get Internal Exam Detail Error:', error);
        res.status(500).json({ message: error.message });
    }
};

/* ════════════════════════════════════════════════════════════════
 *  DELETE /api/internal/students/:id
 *  Delete an internal student (and all their exam mappings)
 * ════════════════════════════════════════════════════════════════ */
export const deleteInternalStudent = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id as string);
        await InternalExamRegistration.destroy({ where: { InternalStudentID: id } });
        const deleted = await InternalStudent.destroy({ where: { InternalStudentID: id } });
        if (deleted === 0) return res.status(404).json({ message: 'Student not found' });
        res.json({ message: 'Internal student deleted' });
    } catch (error: any) {
        console.error('Delete Internal Student Error:', error);
        res.status(500).json({ message: error.message });
    }
};

/* ════════════════════════════════════════════════════════════════
 *  DELETE /api/internal/students
 *  Delete ALL internal students (nuclear wipe)
 * ════════════════════════════════════════════════════════════════ */
/* ════════════════════════════════════════════════════════════════
 *  POST /api/internal/students
 *  Manually create a single internal student
 * ════════════════════════════════════════════════════════════════ */
export const createInternalStudent = async (req: Request, res: Response) => {
    try {
        const { RegisterNumber, FullName, DepartmentID, ProgramID, SemesterID, BatchYear } = req.body;
        
        if (!RegisterNumber || !FullName) {
            return res.status(400).json({ message: 'RegisterNumber and FullName are required' });
        }

        const [student, created] = await InternalStudent.findOrCreate({
            where: { RegisterNumber: RegisterNumber.toUpperCase() },
            defaults: {
                RegisterNumber: RegisterNumber.toUpperCase(),
                FullName,
                DepartmentID: DepartmentID || null,
                ProgramID: ProgramID || null,
                SemesterID: SemesterID || null,
                BatchYear: BatchYear || new Date().getFullYear(),
                Status: 'ACTIVE',
                Source: 'Admin Added'
            }
        });

        if (!created) {
            return res.status(400).json({ message: `Student with register number ${RegisterNumber} already exists.` });
        }

        res.status(201).json({ message: 'Internal student created successfully', student });
    } catch (error: any) {
        console.error('Create Internal Student Error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const deleteAllInternalStudents = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
        await InternalExamRegistration.destroy({ where: {}, transaction: t });
        await InternalStudent.destroy({ where: {}, truncate: false, transaction: t });
        await t.commit();
        res.json({ message: 'All internal students deleted' });
    } catch (error: any) {
        await t.rollback();
        console.error('Delete All Internal Students Error:', error);
        res.status(500).json({ message: error.message });
    }
};

/* ════════════════════════════════════════════════════════════════
 *  GET /api/internal/students/export-credentials
 *  Export student passwords (generated by formula) to Excel
 * ════════════════════════════════════════════════════════════════ */
export const exportInternalStudentCredentials = async (req: Request, res: Response) => {
    try {
        const { dept } = req.query;
        const whereClause: any = { Status: 'ACTIVE' };
        
        if (dept && !isNaN(parseInt(dept as string))) {
            whereClause.DepartmentID = parseInt(dept as string);
        }

        const students = await InternalStudent.findAll({
            include: [
                { model: Department, attributes: ['DepartmentName', 'DepartmentCode'] },
                { model: Program, attributes: ['ProgramCode', 'ProgramName'] },
                { model: User, attributes: ['Email'] }
            ],
            where: whereClause,
            order: [
                ['DepartmentID', 'ASC'],
                ['RegisterNumber', 'ASC']
            ]
        });

        if (students.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "No active internal students found matching your criteria. Cannot generate credentials for an empty list." 
            });
        }

        const wb = XLSX.utils.book_new();
        const deptGroups = new Map<string, any[]>();
        
        students.forEach(s => {
            const deptName = s.Department?.DepartmentName || 'General';
            if (!deptGroups.has(deptName)) {
                deptGroups.set(deptName, []);
            }
            
            const fullName = (s.FullName || 'Student').trim();
            const regNo = (s.RegisterNumber || '').trim().toUpperCase();
            
            // Generate email based on institutional formula: namePassout@program.sjcetpalai.ac.in
            const email = s.User?.Email || generateStudentEmail(
                fullName, 
                s.BatchYear || new Date().getFullYear(), 
                s.Program?.ProgramCode || s.Department?.DepartmentCode || 'STUDENT'
            );
            
            deptGroups.get(deptName)?.push({
                'Register Number': regNo,
                'Email': email,
                'Full Name': fullName,
                'Default Password': generateDefaultPassword(fullName, regNo),
                'Password Status': 'Initial Default',
                'Note': 'Use the Email and Default Password shown here to log in to the student portal.'
            });
        });

        deptGroups.forEach((data, deptName) => {
            const safeSheetName = deptName.substring(0, 31).replace(/[\[\]\*\?\/\\\:]/g, '');
            const ws = XLSX.utils.json_to_sheet(data);
            ws['!cols'] = [
                { wch: 20 }, // Register Number
                { wch: 35 }, // Email
                { wch: 35 }, // Full Name
                { wch: 20 }, // Default Password
                { wch: 20 }, // Password Status
                { wch: 80 }  // Note
            ];
            XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
        });

        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename=Internal_Student_Passwords.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buf);
    } catch (error: any) {
        console.error("Internal Export Credentials Error:", error);
        res.status(500).json({ message: "Failed to export passwords", error: error.message });
    }
};

/* ════════════════════════════════════════════════════════════════
 *  POST /api/internal/students/sync-semesters
 *  Synchronize/Calculate current semesters for all internal students
 * ════════════════════════════════════════════════════════════════ */
export const syncInternalSemesters = async (req: Request, res: Response) => {
    try {
        const { promoteInternalStudents } = await import('../cron/academic.cron.js');
        const count = await promoteInternalStudents();
        res.json({ message: `Internal semester sync completed. Updated ${count} records.` });
    } catch (err: any) {
        console.error("Sync Internal Semesters Error:", err);
        res.status(500).json({ message: "Failed to sync internal semesters", error: err.message });
    }
};
