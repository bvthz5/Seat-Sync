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
import { generateDefaultPassword, generateStudentEmail, extractBatchYearFromRegisterNumber } from '../utils/student.utils.js';
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
        const semParam = req.query.sem ? String(req.query.sem).trim() : (req.query.semester ? String(req.query.semester).trim() : null);
        const examId = req.query.examId ? parseInt(req.query.examId as string) : null;

        const where: any = {};
        if (deptId) where.DepartmentID = deptId;
        if (batchYear) where.BatchYear = batchYear;
        if (semParam) {
            const semNum = parseInt(semParam.replace(/[^0-9]/g, ''), 10);
            if (!isNaN(semNum)) {
                where[Op.or] = [
                    { Semester: `S${semNum}` },
                    { Semester: `${semNum}` },
                    sequelize.where(sequelize.col('SemesterModel.SemesterNumber'), semNum)
                ];
            }
        }
        if (search) {
            const searchConditions = [
                { RegisterNumber: { [Op.like]: `%${search}%` } },
                { FullName: { [Op.like]: `%${search}%` } },
            ];
            if (where[Op.or]) {
                where[Op.and] = [
                    { [Op.or]: where[Op.or] },
                    { [Op.or]: searchConditions }
                ];
                delete where[Op.or];
            } else {
                where[Op.or] = searchConditions;
            }
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
                { model: Department, as: 'Department', attributes: ['DepartmentID', 'DepartmentCode', 'DepartmentName'] },
                { model: Program, attributes: ['ProgramID', 'ProgramName', 'ProgramCode'] },
                { model: Semester, as: 'SemesterModel', attributes: ['SemesterID', 'SemesterNumber'] },
                { model: User, attributes: ['UserID', 'Email'] }
            ],
            limit,
            offset,
            order: [
                ['DepartmentID', 'ASC'],
                ['Division', 'ASC'],
                ['RollNumber', 'ASC'],
                ['RegisterNumber', 'ASC']
            ],
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
                    if (h === 'roll' || h === 'rollno' || h === 'roll no' || h === 'class roll' || h === 'class roll no' || h === 'roll number' || h === 'sl no' || h === 'slno' || h === 'sno' || h === 'sl.no' || h === 'si no') {
                        record['RollNumber'] = val;
                    } else if (h === 'university regno' || h === 'university reg no' || h.includes('regno') || h.includes('reg no') || h.includes('register') || h.includes('registration') || h === 'reg_no' || h === 'reg') {
                        record['RegisterNumber'] = val;
                    } else if (h === 'name' || h === 'student name' || h === 'full name' || h === 'name of student') {
                        record['Name'] = val;
                    } else if (h === 'batch' || h === 'class' || h.includes('batch')) {
                        record['Batch'] = val;
                    } else if (h === 'dept' || h === 'branch' || h === 'department') {
                        record['Department'] = val;
                    } else if (h === 'sem' || h === 'semester') {
                        record['Semester'] = val;
                    } else if (h === 'prog' || h === 'program' || h === 'course') {
                        record['Program'] = val;
                    } else if (h === 'div' || h === 'division' || h === 'sec' || h === 'section') {
                        record['Division'] = val;
                    } else if (h.includes('email') || h.includes('mail')) {
                        record['Email'] = val;
                    } else {
                        record[header] = val;
                    }
                }

                if (!record['Batch'] && globalBatch) record['Batch'] = globalBatch;

                // Skip duplicated header rows inside data
                const nameVal = String(record['Name'] || '').toLowerCase();
                const regVal = String(record['RegisterNumber'] || record['RollNumber'] || '').toLowerCase();
                if (nameVal.includes('name') && (regVal.includes('reg') || regVal.includes('roll') || regVal === '')) continue;

                if (hasData && record['Name']) {
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
        const processedClassRolls = new Set<string>();

        for (const row of data) {
            const rollRaw = row['RollNumber'] ?? row['Roll No'] ?? row['RollNo'] ?? row['Roll'] ?? row['SL NO'] ?? row['Sl.No'] ?? row['SI NO'];
            const rollNumber = rollRaw !== undefined && rollRaw !== null && String(rollRaw).trim() !== ''
                ? parseInt(String(rollRaw).replace(/[^0-9]/g, ''), 10)
                : null;

            let regNo = String(row['RegisterNumber'] || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
            const name = String(row['Name'] || '').trim();

            // Resolve academic context
            const rawAcademic = row['Batch'] || row['Program'] || row['Department'] || '';
            const parsed = parseBatchString(rawAcademic);
            const programCode = normalizeProgram(parsed.programCode !== 'UNKNOWN' ? parsed.programCode : (row['Program'] || row['Department'] || ''));

            let batchYear = parsed.batchYear || (row['Batch'] ? parseInt(String(row['Batch']).replace(/[^0-9]/g, '').slice(0, 4)) : null);
            const divRaw = row['Division'] ?? row['Div'] ?? row['DIV'] ?? row['SECTION'] ?? row['Section'];
            const division = (divRaw !== undefined && divRaw !== null && String(divRaw).trim() !== '')
                ? String(divRaw).toUpperCase().trim()
                : (parsed.division || null);

            if (!regNo && rollNumber !== null && !isNaN(rollNumber)) {
                regNo = `${programCode}${batchYear || ''}${division || ''}${String(rollNumber).padStart(2, '0')}`;
            }

            if (!regNo || !name) { errors.push({ row: row._row, reason: 'Missing name or register number' }); continue; }
            if (processedRegNos.has(regNo)) continue;
            processedRegNos.add(regNo);

            try {

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

                // Resolve semester without dummy fallback values
                let semNum = parsed.semester || (row['Semester'] ? parseInt(String(row['Semester']).replace(/[^0-9]/g, '')) : null);
                if (!semNum && exam?.Semester) {
                    const semMatch = String(exam.Semester).match(/\d+/);
                    if (semMatch) semNum = parseInt(semMatch[0]);
                }
                if (!semNum) {
                    errors.push({ row: row._row, reason: `${regNo}: Missing semester information` });
                    continue;
                }

                const semStr = parsed.semesterName || `S${semNum}`;

                // Derive batch year dynamically from register number or parsed batch if not already extracted
                if (!batchYear) {
                    batchYear = extractBatchYearFromRegisterNumber(regNo);
                }
                const batchEnd = parsed.batchEndYear || (batchYear ? batchYear + 4 : null);
                const batchName = parsed.batchName || (row['Batch'] ? String(row['Batch']).trim() : `${programCode} ${batchYear ? batchYear : ''}`);

                // Validate class-level Roll Number uniqueness
                if (rollNumber !== null && !isNaN(rollNumber)) {
                    const classRollKey = `${targetDept?.DepartmentID || programCode}_${division}_${semStr}_${rollNumber}`;
                    if (processedClassRolls.has(classRollKey)) {
                        errors.push({ row: row._row, reason: `Duplicate Roll No ${rollNumber} in class ${programCode} Div ${division} (${semStr})` });
                    } else {
                        processedClassRolls.add(classRollKey);
                    }
                }

                let targetSemester: any = null;
                if (targetProgram) {
                    targetSemester = semCache.get(`${targetProgram.ProgramID}_${semNum}`);
                    if (!targetSemester) {
                        targetSemester = await Semester.create({
                            ProgramID: targetProgram.ProgramID,
                            SemesterNumber: semNum,
                            SemesterName: semStr,
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
                        RollNumber: rollNumber ?? student.RollNumber,
                        DepartmentID: targetDept?.DepartmentID ?? student.DepartmentID,
                        ProgramID: targetProgram?.ProgramID ?? student.ProgramID,
                        SemesterID: targetSemester?.SemesterID ?? student.SemesterID,
                        Batch: batchName ?? student.Batch,
                        BatchStart: batchYear ?? student.BatchStart,
                        BatchEnd: batchEnd ?? student.BatchEnd,
                        Division: division || student.Division,
                        Semester: semStr || student.Semester,
                        BatchYear: batchYear || student.BatchYear,
                    }, { transaction: t });
                } else {
                    student = await InternalStudent.create({
                        RegisterNumber: regNo,
                        RollNumber: rollNumber,
                        FullName: name,
                        DepartmentID: targetDept?.DepartmentID ?? null,
                        ProgramID: targetProgram?.ProgramID ?? null,
                        SemesterID: targetSemester?.SemesterID ?? null,
                        Batch: batchName,
                        BatchStart: batchYear,
                        BatchEnd: batchEnd,
                        Division: division,
                        Semester: semStr,
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
                            RegistrationMethod: 'EXCEL',
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

        // If no specific examId was provided, auto-map newly imported students to all matching internal exams
        if (!internalExamId) {
            try {
                const activeExams = await InternalExam.findAll({ attributes: ['InternalExamID'] });
                for (const ae of activeExams) {
                    await autoMapStudentsForExamCore(ae.InternalExamID);
                }
            } catch (amErr) {
                console.warn('[AutoMap Post-Import Warning]:', amErr);
            }
        }

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
        try { await t.rollback(); } catch (_) { }
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
                    { model: Department, as: 'Department', attributes: ['DepartmentID', 'DepartmentCode', 'DepartmentName'] },
                    { model: Program, attributes: ['ProgramID', 'ProgramName'] },
                    { model: Semester, as: 'SemesterModel', attributes: ['SemesterID', 'SemesterNumber'] },
                ],
            }],
            order: [
                [{ model: InternalStudent, as: 'Student' }, 'RollNumber', 'ASC'],
                [{ model: InternalStudent, as: 'Student' }, 'RegisterNumber', 'ASC']
            ],
        });

        const students = registrations.map((reg: any) => ({
            registrationId: reg.InternalExamRegistrationID,
            internalStudentId: reg.Student?.InternalStudentID,
            registerNumber: reg.Student?.RegisterNumber,
            rollNumber: reg.Student?.RollNumber ?? null,
            division: reg.Student?.Division ?? null,
            batch: reg.Student?.Batch ?? null,
            fullName: reg.Student?.FullName,
            department: reg.Student?.Department?.DepartmentName,
            departmentCode: reg.Student?.Department?.DepartmentCode,
            program: reg.Student?.Program?.ProgramName,
            semester: reg.Student?.Semester?.SemesterNumber ?? reg.Student?.Semester,
            batchYear: reg.Student?.BatchYear,
            registrationMethod: reg.RegistrationMethod || 'AUTO',
        }));

        // Sort Batch-wise (Department Code -> Division -> Roll Number 1..N -> Register Number)
        students.sort((a: any, b: any) => {
            const deptA = String(a.departmentCode || a.department || '').toUpperCase().trim();
            const deptB = String(b.departmentCode || b.department || '').toUpperCase().trim();
            if (deptA !== deptB) return deptA.localeCompare(deptB);

            const divA = String(a.division || '').toUpperCase().trim();
            const divB = String(b.division || '').toUpperCase().trim();
            if (divA !== divB) return divA.localeCompare(divB);

            const rollA = (a.rollNumber !== null && a.rollNumber !== undefined) ? Number(a.rollNumber) : 999999;
            const rollB = (b.rollNumber !== null && b.rollNumber !== undefined) ? Number(b.rollNumber) : 999999;
            if (rollA !== rollB) return rollA - rollB;

            return String(a.registerNumber || '').localeCompare(String(b.registerNumber || ''));
        });

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
 *  PUT /api/internal/students/:id
 *  Update an internal student record
 * ════════════════════════════════════════════════════════════════ */
export const updateInternalStudent = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
        const id = parseInt(req.params.id as string);
        const { RegisterNumber, FullName, Email, DepartmentID, ProgramID, Semester, RollNumber, Division, BatchYear, Status } = req.body;

        const student = await InternalStudent.findByPk(id, { transaction: t });
        if (!student) {
            await t.rollback();
            return res.status(404).json({ message: 'Internal student not found' });
        }

        if (student.UserID) {
            const user = await User.findByPk(student.UserID, { transaction: t });
            if (user) {
                await user.update({
                    Email: Email || user.Email,
                    FullName: FullName || user.FullName
                }, { transaction: t });
            }
        }

        let semVal = Semester;
        if (semVal !== undefined && semVal !== null && semVal !== '') {
            const numSem = String(semVal).replace(/^S/i, '');
            semVal = `S${numSem}`;
        }

        await student.update({
            RegisterNumber: RegisterNumber ? RegisterNumber.toUpperCase() : student.RegisterNumber,
            FullName: FullName || student.FullName,
            DepartmentID: DepartmentID !== undefined ? (DepartmentID ? Number(DepartmentID) : null) : student.DepartmentID,
            ProgramID: ProgramID !== undefined ? (ProgramID ? Number(ProgramID) : null) : student.ProgramID,
            Semester: semVal !== undefined ? semVal : student.Semester,
            RollNumber: RollNumber !== undefined ? (RollNumber !== null && RollNumber !== '' && !isNaN(Number(RollNumber)) ? Number(RollNumber) : null) : student.RollNumber,
            Division: Division !== undefined ? Division : student.Division,
            BatchYear: BatchYear !== undefined ? (BatchYear ? Number(BatchYear) : null) : student.BatchYear,
            Status: Status || student.Status
        }, { transaction: t });

        await t.commit();
        res.json({ message: 'Internal student updated successfully', student });
    } catch (error: any) {
        await t.rollback();
        console.error('Update Internal Student Error:', error);
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
                { model: Department, as: 'Department', attributes: ['DepartmentName', 'DepartmentCode'] },
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
                s.Program?.ProgramCode || s.Department?.DepartmentCode || 'STUDENT',
                s.Program?.DurationYears || 2
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

/* ════════════════════════════════════════════════════════════════
 *  Core Auto Mapping Helper (Shared by API, Timetable, and Student Import)
 * ════════════════════════════════════════════════════════════════ */
export const autoMapStudentsForExamCore = async (examId: number): Promise<{ mappedCount: number; totalMatched: number; message: string }> => {
    const exam = await InternalExam.findByPk(examId, {
        include: [
            { model: InternalExamDepartment, include: [{ model: Department }] },
        ],
    });
    if (!exam) throw new Error(`Internal exam #${examId} not found`);

    // 1. Extract Semester Number (e.g. "S5", "Sem 5", "5" -> 5)
    const semRaw = String(exam.Semester || '').toUpperCase().trim();
    const match = semRaw.match(/\d+/);
    const semNum = match ? parseInt(match[0], 10) : null;

    if (!semNum) {
        return { mappedCount: 0, totalMatched: 0, message: `Cannot resolve semester number from exam semester "${exam.Semester}"` };
    }

    // 2. Extract mapped departments & division filters
    const deptEntries = (exam as any).InternalExamDepartments || [];
    let deptIds: number[] = deptEntries.map((d: any) => d.DepartmentID).filter(Boolean);

    // If no department explicitly linked, fetch all active department IDs as fallback
    if (deptIds.length === 0) {
        const allDepts = await Department.findAll({ attributes: ['DepartmentID'] });
        deptIds = allDepts.map((d: any) => d.DepartmentID);
    }

    if (deptIds.length === 0) {
        return { mappedCount: 0, totalMatched: 0, message: 'No active departments found in system' };
    }

    // 3. Find matching Semester IDs from Semesters table (if any exist)
    const matchingSemesters = await Semester.findAll({
        where: {
            [Op.or]: [
                { SemesterNumber: semNum },
                { SemesterName: semRaw },
                { SemesterName: `S${semNum}` },
                { SemesterName: `Sem ${semNum}` }
            ]
        }
    });
    const semIds = matchingSemesters.map((s: any) => s.SemesterID);

    // 4. Construct flexible semester conditions for InternalStudent
    const semesterOrConditions: any[] = [
        { Semester: `S${semNum}` },
        { Semester: `${semNum}` },
        { Semester: `Sem ${semNum}` },
        { Semester: `Sem${semNum}` },
        { Semester: `S-${semNum}` },
        { Semester: semRaw }
    ];
    if (semIds.length > 0) {
        semesterOrConditions.push({ SemesterID: { [Op.in]: semIds } });
    }

    // 5. Query active internal students
    const students = await InternalStudent.findAll({
        where: {
            DepartmentID: { [Op.in]: deptIds },
            Status: 'ACTIVE',
            [Op.or]: semesterOrConditions
        }
    });

    if (students.length === 0) {
        return {
            mappedCount: 0,
            totalMatched: 0,
            message: `No active internal students found for Semester S${semNum} in mapped departments.`
        };
    }

    // 6. Map students to InternalExamRegistration
    let mappedCount = 0;
    for (const student of students) {
        // Apply division filter if specified on InternalExamDepartment
        const deptEntry = deptEntries.find((d: any) => d.DepartmentID === student.DepartmentID);
        const deptDiv = deptEntry?.Division ? String(deptEntry.Division).toUpperCase().trim() : 'ALL';
        if (deptDiv !== 'ALL' && deptDiv !== '' && student.Division && String(student.Division).toUpperCase().trim() !== deptDiv) {
            continue; // Skip student if division doesn't match department division filter
        }

        const [_, created] = await InternalExamRegistration.findOrCreate({
            where: {
                InternalExamID: examId,
                InternalStudentID: student.InternalStudentID
            },
            defaults: {
                InternalExamID: examId,
                InternalStudentID: student.InternalStudentID,
                RegistrationMethod: 'AUTO',
            } as any
        });
        if (created) mappedCount++;
    }

    return {
        mappedCount,
        totalMatched: students.length,
        message: `Successfully mapped ${mappedCount} student(s) to this exam.`
    };
};

/* ════════════════════════════════════════════════════════════════
 *  POST /api/internal/exams/:examId/students/auto-map
 *  Auto map existing internal students of the exam's semester
 *  and departments to the exam.
 * ════════════════════════════════════════════════════════════════ */
export const autoMapStudentsForInternalExam = async (req: Request, res: Response) => {
    try {
        const examId = parseInt(req.params.examId as string);
        if (!examId || isNaN(examId)) return res.status(400).json({ message: 'examId is required' });

        const result = await autoMapStudentsForExamCore(examId);
        res.json({
            success: true,
            message: result.message,
            mappedCount: result.mappedCount,
            totalMatched: result.totalMatched
        });
    } catch (error: any) {
        console.error('Auto Map Internal Students Error:', error);
        res.status(500).json({ message: error.message });
    }
};

/* ════════════════════════════════════════════════════════════════
 *  POST /api/internal/series/:seriesId/auto-map-all
 *  Bulk auto-map all eligible internal students to ALL exams in a series
 * ════════════════════════════════════════════════════════════════ */
export const bulkAutoMapStudentsForSeries = async (req: Request, res: Response) => {
    try {
        const seriesId = parseInt(req.params.seriesId as string);
        if (!seriesId || isNaN(seriesId)) return res.status(400).json({ message: 'seriesId is required' });

        const exams = await InternalExam.findAll({
            where: { InternalExamSeriesID: seriesId },
            attributes: ['InternalExamID', 'SubjectCode', 'SubjectName']
        });

        if (exams.length === 0) {
            return res.status(404).json({ message: 'No internal exams found in this series' });
        }

        let totalMapped = 0;
        let totalMatched = 0;
        const results: any[] = [];

        for (const exam of exams) {
            try {
                const res = await autoMapStudentsForExamCore(exam.InternalExamID);
                totalMapped += res.mappedCount;
                totalMatched += res.totalMatched;
                results.push({
                    examId: exam.InternalExamID,
                    subjectCode: exam.SubjectCode,
                    mappedCount: res.mappedCount,
                    totalMatched: res.totalMatched
                });
            } catch (err: any) {
                console.warn(`[BulkAutoMap Warning] Exam #${exam.InternalExamID} error:`, err.message);
            }
        }

        res.json({
            success: true,
            message: `Bulk auto-registration complete across ${exams.length} exams. ${totalMapped} new mapping(s) created (${totalMatched} total student registrations matched).`,
            examsProcessed: exams.length,
            totalMapped,
            totalMatched,
            details: results
        });
    } catch (error: any) {
        console.error('Bulk Auto Map Series Error:', error);
        res.status(500).json({ message: error.message });
    }
};
