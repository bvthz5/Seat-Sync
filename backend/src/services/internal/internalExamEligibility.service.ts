import { Op } from 'sequelize';
import {
    InternalExam,
    InternalExamDepartment,
    InternalExamRegistration,
    InternalStudent,
    InternalStudentSubject,
    InternalSubjectEligibility,
    Department,
    Program,
    Semester
} from '../../models/index.js';
import { SubjectEligibilityImportService } from './subjectEligibilityImport.service.js';
import { normalizeProgramme, normalizeBranch } from '../academicNormalizer.service.js';

export interface BranchBreakdownItem {
    departmentCode: string;
    departmentName: string;
    expected: number;
    registered: number;
    missing: number;
    status: 'OK' | 'ERROR';
}

export interface BatchBreakdownItem {
    batch: string;
    division: string;
    expected: number;
    registered: number;
    missing: number;
}

export interface StudentEligibilityDetail {
    internalStudentId: number;
    registerNumber: string;
    fullName: string;
    departmentCode: string;
    programCode: string;
    division: string;
    rollNumber: number | null;
    batch: string;
    semester: string;
    reason?: string;
}

export interface ExamEligibilityResult {
    examId: number;
    subjectCode: string;
    subjectName: string;
    semester: string;
    subjectType: string;
    scopeType: string;
    branchScope: string[];
    eligibilitySource: 'SUBJECT_LIST' | 'MASTER_BATCH_RULE' | 'AUTO_FALLBACK';
    expectedCount: number;
    eligibleCount: number;
    registeredCount: number;
    missingCount: number;
    unresolvedCount: number;
    status: 'VERIFIED' | 'MISSING_STUDENTS' | 'UNRESOLVED_STUDENTS' | 'SUBJECT_ENROLLMENT_REQUIRED' | 'NO_PROGRAMME_MATCH' | 'DATA_ERROR';
    message: string;
    branchBreakdown: BranchBreakdownItem[];
    batchBreakdown: BatchBreakdownItem[];
    eligibleStudents: StudentEligibilityDetail[];
    missingStudents: StudentEligibilityDetail[];
    unresolvedStudents: any[];
    ineligibleSummary: {
        branchMismatch: number;
        noProgrammeScope: number;
        divisionMismatch: number;
        inactiveCount: number;
    };
}

export class InternalExamEligibilityService {

    /**
     * Helper to parse batch label (e.g. "CSE 2024-2028 C (S5)")
     */
    static parseBatchString(batchStr: string): {
        branch: string | null;
        startYear: number | null;
        endYear: number | null;
        division: string | null;
        semester: string | null;
    } {
        if (!batchStr) return { branch: null, startYear: null, endYear: null, division: null, semester: null };
        const clean = batchStr.trim();
        const branchMatch = clean.match(/^([A-Za-z]+)\b/);
        const yearsMatch = clean.match(/(\d{4})[-–](\d{4})/);
        const divMatch = clean.match(/\b([A-Z])\b/);
        const semMatch = clean.match(/\((S\d+|SEM\s*\d+)\)/i);

        return {
            branch: branchMatch && branchMatch[1] ? branchMatch[1].toUpperCase() : null,
            startYear: yearsMatch && yearsMatch[1] ? parseInt(yearsMatch[1], 10) : null,
            endYear: yearsMatch && yearsMatch[2] ? parseInt(yearsMatch[2], 10) : null,
            division: divMatch && divMatch[1] ? divMatch[1].toUpperCase() : null,
            semester: semMatch && semMatch[1] ? semMatch[1].toUpperCase() : null
        };
    }

    /**
     * Calculates deterministic student eligibility for an Internal Exam.
     * Level 1: Subject-Wise Student Roster (InternalSubjectEligibility)
     * Level 2: Explicit Registrations
     * Level 3: Curriculum / Batch / Division / Branch Rule
     * Level 4: Department + Semester Fallback
     */
    static async calculateExamEligibility(examId: number, options?: { transaction?: any }): Promise<ExamEligibilityResult> {
        const transaction = options?.transaction;

        const exam = await InternalExam.findByPk(examId, {
            include: [
                { model: InternalExamDepartment, include: [{ model: Department }] },
            ],
            transaction
        });

        if (!exam) throw new Error(`Internal Exam #${examId} not found`);

        const semRaw = String(exam.Semester || '').toUpperCase().trim();
        const semMatch = semRaw.match(/\d+/);
        const semNum = semMatch ? parseInt(semMatch[0], 10) : null;
        const normCourseCode = SubjectEligibilityImportService.normalizeCourseCode(exam.SubjectCode || '');

        if (!semNum) {
            return {
                examId,
                subjectCode: exam.SubjectCode || '',
                subjectName: exam.SubjectName || '',
                semester: semRaw,
                subjectType: exam.SubjectType || 'CORE',
                scopeType: exam.ScopeType || 'BRANCH_SCOPE',
                branchScope: [],
                eligibilitySource: 'AUTO_FALLBACK',
                expectedCount: 0,
                eligibleCount: 0,
                registeredCount: 0,
                missingCount: 0,
                unresolvedCount: 0,
                status: 'DATA_ERROR',
                message: `Unparseable semester format "${exam.Semester}" on exam #${examId}`,
                branchBreakdown: [],
                batchBreakdown: [],
                eligibleStudents: [],
                missingStudents: [],
                unresolvedStudents: [],
                ineligibleSummary: { branchMismatch: 0, noProgrammeScope: 0, divisionMismatch: 0, inactiveCount: 0 }
            };
        }

        // 1. Resolve Branch Scope
        const deptEntries = (exam as any).InternalExamDepartments || [];
        const scopeCodesSet = new Set<string>();

        if (exam.BranchScope) {
            exam.BranchScope.split(',').map(s => s.trim().toUpperCase()).filter(Boolean).forEach(c => scopeCodesSet.add(c));
        }
        deptEntries.forEach((d: any) => {
            if (d.Department?.DepartmentCode) {
                scopeCodesSet.add(d.Department.DepartmentCode.toUpperCase());
            }
        });

        const branchScope = Array.from(scopeCodesSet);
        const isAllBranches = exam.ScopeType === 'ALL_BRANCHES' || branchScope.includes('ALL_BRANCHES') || branchScope.includes('ALL') || branchScope.length === 0;

        // Fetch Departments in scope (outer scope for breakdown calculation)
        const allDepts = await Department.findAll({ transaction });
        const deptMapById = new Map<number, Department>();
        allDepts.forEach(d => deptMapById.set(d.DepartmentID, d));
        const targetDeptIds: number[] = [];

        if (isAllBranches) {
            allDepts.forEach(d => targetDeptIds.push(d.DepartmentID));
        } else {
            branchScope.forEach(code => {
                const cleanCode = code.toUpperCase().trim();
                allDepts.forEach(d => {
                    const dCode = (d.DepartmentCode || '').toUpperCase().trim();
                    const dName = (d.DepartmentName || '').toUpperCase().trim();
                    if (dCode === cleanCode || dName === cleanCode || cleanCode.includes(dCode) || dCode.includes(cleanCode)) {
                        targetDeptIds.push(d.DepartmentID);
                    }
                });
            });
        }
        if (targetDeptIds.length === 0) allDepts.forEach(d => targetDeptIds.push(d.DepartmentID));

        // 2. LEVEL 1 CHECK: Is there a Subject-Wise Student Roster for this SubjectCode?
        const subjectEligibilityRows = await InternalSubjectEligibility.findAll({
            where: {
                SubjectCode: {
                    [Op.or]: [
                        exam.SubjectCode || '',
                        normCourseCode
                    ]
                }
            },
            include: [{
                model: InternalStudent,
                as: 'Student',
                include: [
                    { model: Department, as: 'Department' },
                    { model: Program }
                ]
            }],
            transaction
        });

        let eligibilitySource: ExamEligibilityResult['eligibilitySource'] = 'MASTER_BATCH_RULE';
        let eligibleStudentsRaw: InternalStudent[] = [];
        const unresolvedStudents: any[] = [];

        if (subjectEligibilityRows.length > 0) {
            // Subject-wise roster exists -> AUTHORITATIVE LEVEL 1
            eligibilitySource = 'SUBJECT_LIST';
            const resolvedStudentIds = new Set<number>();

            for (const row of subjectEligibilityRows) {
                if (row.Student) {
                    if (!resolvedStudentIds.has(row.Student.InternalStudentID)) {
                        resolvedStudentIds.add(row.Student.InternalStudentID);
                        eligibleStudentsRaw.push(row.Student);
                    }
                } else {
                    unresolvedStudents.push({
                        pseudoRoll: row.SubjectPseudoRoll,
                        admissionNumber: row.AdmissionNumber,
                        studentName: row.StudentName,
                        reason: 'UNRESOLVED_STUDENT_IN_MASTER_REGISTRY'
                    });
                }
            }
        } else {
            // Level 3: Curriculum / Batch / Department Scope rule
            const semesterOrConditions: any[] = [
                { Semester: `S${semNum}` },
                { Semester: `${semNum}` },
                { Semester: `Sem ${semNum}` },
                { Semester: `Sem${semNum}` },
                { Semester: `S-${semNum}` },
                { Semester: `Semester S${semNum}` },
                { Semester: `Semester ${semNum}` },
                { Semester: semRaw }
            ];

            const scopeList = Array.from(scopeCodesSet);
            const batchLikeConds = scopeList.map(code => ({ Batch: { [Op.like]: `%${code}%` } }));
            const regLikeConds = scopeList.map(code => ({ RegisterNumber: { [Op.like]: `%${code}%` } }));

            const isScopeRestricted = !isAllBranches && (targetDeptIds.length > 0 || scopeList.length > 0);

            const studentWhere: any = {
                Status: 'ACTIVE'
            };

            if (isScopeRestricted) {
                studentWhere[Op.and] = [
                    { [Op.or]: semesterOrConditions },
                    {
                        [Op.or]: [
                            { DepartmentID: { [Op.in]: targetDeptIds } },
                            { DepartmentID: null },
                            ...batchLikeConds,
                            ...regLikeConds
                        ]
                    }
                ];
            } else {
                studentWhere[Op.or] = semesterOrConditions;
            }

            eligibleStudentsRaw = await InternalStudent.findAll({
                where: studentWhere,
                include: [
                    { model: Department, as: 'Department' },
                    { model: Program }
                ],
                transaction
            });
        }

        // Apply strict 2-step Programme & Branch filter + Division filter
        const finalEligibleStudents: InternalStudent[] = [];
        let divMismatchCount = 0;

        const examProgNorm = normalizeProgramme(exam.Programme || (
            (exam.SubjectCode || '').includes('INMCA') ? 'INT_MCA' :
            (exam.SubjectCode || '').startsWith('24SJMCA') ? 'MCA' : 'BTECH'
        ));

        for (const student of eligibleStudentsRaw) {
            const studentBatch = String(student.Batch || '').toUpperCase();
            const studentProgCode = (student.Program?.ProgramCode || '').toUpperCase();
            
            const studentProgNorm = normalizeProgramme(
                studentBatch.includes('INT MCA') || studentBatch.includes('INT_MCA') ? 'INT_MCA' :
                studentBatch.includes('MCA') ? 'MCA' :
                studentProgCode
            );

            // STEP 1: Programme match check (BTECH vs MCA vs INT_MCA)
            if (examProgNorm !== studentProgNorm) {
                continue;
            }

            // STEP 2: Branch scope match check (CA vs MCA vs INT_MCA vs AD vs CSE...)
            if (!isAllBranches && branchScope.length > 0) {
                const studentBranchNorm = normalizeBranch(
                    student.Department?.DepartmentCode || studentBatch.split(/\s+/)[0] || ''
                );

                const matchesBranch = branchScope.some(bCode => {
                    const normTargetBranch = normalizeBranch(bCode);
                    return normTargetBranch === studentBranchNorm || studentBatch.includes(normTargetBranch);
                });

                if (!matchesBranch) {
                    continue;
                }
            }

            const deptEntry = deptEntries.find((d: any) => d.DepartmentID === student.DepartmentID);
            const deptDiv = deptEntry?.Division ? String(deptEntry.Division).toUpperCase().trim() : 'ALL';

            if (deptDiv !== 'ALL' && deptDiv !== '' && student.Division && String(student.Division).toUpperCase().trim() !== deptDiv) {
                divMismatchCount++;
                continue;
            }
            finalEligibleStudents.push(student);
        }

        // 4. Fetch existing registrations in InternalExamRegistrations
        const existingRegistrations = await InternalExamRegistration.findAll({
            where: { InternalExamID: examId },
            attributes: ['InternalStudentID'],
            transaction
        });
        const registeredStudentIds = new Set(existingRegistrations.map(r => r.InternalStudentID));

        // 5. Partition eligible students into registered vs missing
        const eligibleDetails: StudentEligibilityDetail[] = [];
        const missingDetails: StudentEligibilityDetail[] = [];

        for (const s of finalEligibleStudents) {
            const detail: StudentEligibilityDetail = {
                internalStudentId: s.InternalStudentID,
                registerNumber: s.RegisterNumber,
                fullName: s.FullName,
                departmentCode: s.Department?.DepartmentCode || 'UNKNOWN',
                programCode: s.Program?.ProgramCode || s.Department?.DepartmentCode || 'UNKNOWN',
                division: s.Division || 'A',
                rollNumber: s.RollNumber ?? null,
                batch: s.Batch || `${s.BatchYear || ''}`,
                semester: s.Semester || `S${semNum}`,
            };

            if (registeredStudentIds.has(s.InternalStudentID)) {
                eligibleDetails.push(detail);
            } else {
                detail.reason = 'ELIGIBLE_UNREGISTERED';
                missingDetails.push(detail);
            }
        }

        const expectedCount = finalEligibleStudents.length;
        const registeredCount = registeredStudentIds.size;
        const missingCount = missingDetails.length;

        // 6. Calculate Ineligible Summaries across non-scope programs in same semester
        const otherBranchStudentsCount = await InternalStudent.count({
            where: {
                DepartmentID: { [Op.notIn]: targetDeptIds.length > 0 ? targetDeptIds : [-1] },
                Status: 'ACTIVE',
                Semester: `S${semNum}`
            },
            transaction
        });

        const inactiveCount = await InternalStudent.count({
            where: {
                DepartmentID: { [Op.in]: targetDeptIds.length > 0 ? targetDeptIds : [-1] },
                Status: { [Op.ne]: 'ACTIVE' },
                Semester: `S${semNum}`
            },
            transaction
        });

        // 7. Generate Branch-wise & Batch-wise breakdowns
        const branchBreakdownMap = new Map<string, { deptName: string; expected: number; registered: number; missing: number }>();

        targetDeptIds.forEach(id => {
            const dept = deptMapById.get(id);
            if (dept) {
                branchBreakdownMap.set(dept.DepartmentCode, {
                    deptName: dept.DepartmentName,
                    expected: 0,
                    registered: 0,
                    missing: 0
                });
            }
        });

        const batchBreakdownMap = new Map<string, { expected: number; registered: number; missing: number }>();

        for (const s of finalEligibleStudents) {
            const code = s.Department?.DepartmentCode || 'UNKNOWN';
            const bKey = `${s.Program?.ProgramCode || code}_${s.Batch || s.BatchYear}_${s.Division || 'A'}`;

            if (!branchBreakdownMap.has(code)) {
                branchBreakdownMap.set(code, { deptName: s.Department?.DepartmentName || code, expected: 0, registered: 0, missing: 0 });
            }
            const bItem = branchBreakdownMap.get(code)!;
            bItem.expected++;

            if (!batchBreakdownMap.has(bKey)) {
                batchBreakdownMap.set(bKey, { expected: 0, registered: 0, missing: 0 });
            }
            const batchItem = batchBreakdownMap.get(bKey)!;
            batchItem.expected++;

            if (registeredStudentIds.has(s.InternalStudentID)) {
                bItem.registered++;
                batchItem.registered++;
            } else {
                bItem.missing++;
                batchItem.missing++;
            }
        }

        const branchBreakdown: BranchBreakdownItem[] = Array.from(branchBreakdownMap.entries()).map(([code, val]) => ({
            departmentCode: code,
            departmentName: val.deptName,
            expected: val.expected,
            registered: val.registered,
            missing: val.missing,
            status: val.missing === 0 ? 'OK' : 'ERROR'
        }));

        const batchBreakdown: BatchBreakdownItem[] = Array.from(batchBreakdownMap.entries()).map(([key, val]) => {
            const [batch, division] = key.split('_');
            return {
                batch: batch || key,
                division: division || 'A',
                expected: val.expected,
                registered: val.registered,
                missing: val.missing
            };
        });

        // 8. Final Status determination
        let status: ExamEligibilityResult['status'] = 'VERIFIED';
        let message = `All ${expectedCount} eligible students are registered for this exam (${eligibilitySource}).`;

        const unresolvedCount = unresolvedStudents.length;

        if (expectedCount === 0) {
            status = 'NO_PROGRAMME_MATCH';
            message = `No active students found for ${exam.SubjectCode} (${branchScope.join(', ')}) in Semester ${semRaw}.`;
        } else if (unresolvedCount > 0) {
            status = 'UNRESOLVED_STUDENTS';
            message = `${unresolvedCount} students listed in subject roster for "${exam.SubjectCode}" are missing from the master student registry.`;
        } else if (missingCount > 0) {
            status = 'MISSING_STUDENTS';
            message = `${missingCount} of ${expectedCount} eligible students are not registered for this exam.`;
        }

        return {
            examId,
            subjectCode: exam.SubjectCode,
            subjectName: exam.SubjectName,
            semester: semRaw,
            subjectType: exam.SubjectType || 'CORE',
            scopeType: exam.ScopeType || 'BRANCH_SCOPE',
            branchScope,
            eligibilitySource,
            expectedCount,
            eligibleCount: expectedCount,
            registeredCount,
            missingCount,
            unresolvedCount,
            status,
            message,
            branchBreakdown,
            batchBreakdown,
            eligibleStudents: eligibleDetails,
            missingStudents: missingDetails,
            unresolvedStudents,
            ineligibleSummary: {
                branchMismatch: 0,
                noProgrammeScope: 0,
                divisionMismatch: divMismatchCount,
                inactiveCount: 0
            }
        };
    }
}
