import { Op } from 'sequelize';
import {
    InternalExam,
    InternalExamDepartment,
    InternalExamRegistration,
    InternalStudent,
    InternalStudentSubject,
    Department,
    Program,
    Semester
} from '../../models/index.js';

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
    expectedCount: number;
    eligibleCount: number;
    registeredCount: number;
    missingCount: number;
    status: 'VALIDATED' | 'MISSING_STUDENTS' | 'SUBJECT_ENROLLMENT_REQUIRED' | 'NO_PROGRAMME_MATCH' | 'DATA_ERROR';
    message: string;
    branchBreakdown: BranchBreakdownItem[];
    batchBreakdown: BatchBreakdownItem[];
    eligibleStudents: StudentEligibilityDetail[];
    missingStudents: StudentEligibilityDetail[];
    ineligibleSummary: {
        branchMismatch: number;
        noProgrammeScope: number;
        divisionMismatch: number;
        inactiveCount: number;
    };
}

export class InternalExamEligibilityService {

    /**
     * Calculates deterministic student eligibility for an Internal Exam.
     * Enforces explicit branch scopes, elective enrollment rules, and program isolation.
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

        if (!semNum) {
            return {
                examId,
                subjectCode: exam.SubjectCode,
                subjectName: exam.SubjectName,
                semester: semRaw,
                subjectType: exam.SubjectType || 'CORE',
                scopeType: exam.ScopeType || 'BRANCH_SCOPE',
                branchScope: [],
                expectedCount: 0,
                eligibleCount: 0,
                registeredCount: 0,
                missingCount: 0,
                status: 'DATA_ERROR',
                message: `Unparseable semester format "${exam.Semester}" on exam #${examId}`,
                branchBreakdown: [],
                batchBreakdown: [],
                eligibleStudents: [],
                missingStudents: [],
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

        // 2. Fetch Departments in scope
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

        // Fallback: If targetDeptIds is still empty, include all departments to prevent 0-matching
        if (targetDeptIds.length === 0) {
            allDepts.forEach(d => targetDeptIds.push(d.DepartmentID));
        }

        // 3. Check for Elective / Minor / Honours requirements
        const isElectiveOrMinor = exam.SubjectType === 'ELECTIVE' ||
            exam.SubjectType === 'MINOR' ||
            exam.SubjectType === 'HONOURS' ||
            exam.ScopeType === 'ELECTIVE_REGISTRATION_REQUIRED';

        let eligibleStudentsRaw: InternalStudent[] = [];

        if (isElectiveOrMinor) {
            // Require explicit student subject enrollments from InternalStudentSubjects table
            const enrollments = await InternalStudentSubject.findAll({
                where: { SubjectCode: exam.SubjectCode },
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

            const enrolledStudents = enrollments.map((e: any) => e.Student).filter(Boolean);
            if (enrolledStudents.length === 0) {
                return {
                    examId,
                    subjectCode: exam.SubjectCode,
                    subjectName: exam.SubjectName,
                    semester: semRaw,
                    subjectType: exam.SubjectType || 'ELECTIVE',
                    scopeType: 'ELECTIVE_REGISTRATION_REQUIRED',
                    branchScope,
                    expectedCount: 0,
                    eligibleCount: 0,
                    registeredCount: 0,
                    missingCount: 0,
                    status: 'SUBJECT_ENROLLMENT_REQUIRED',
                    message: `Elective/Minor/Honours subject "${exam.SubjectCode}" requires explicit student subject enrollments. Upload subject enrollments to map students.`,
                    branchBreakdown: [],
                    batchBreakdown: [],
                    eligibleStudents: [],
                    missingStudents: [],
                    ineligibleSummary: { branchMismatch: 0, noProgrammeScope: 0, divisionMismatch: 0, inactiveCount: 0 }
                };
            }
            eligibleStudentsRaw = enrolledStudents;
        } else {
            // Core subject: query active students by semester and department scope
            const matchingSemesters = await Semester.findAll({
                where: {
                    [Op.or]: [
                        { SemesterNumber: semNum },
                        { SemesterName: semRaw },
                        { SemesterName: `S${semNum}` },
                        { SemesterName: `Sem ${semNum}` }
                    ]
                },
                transaction
            });
            const semIds = matchingSemesters.map(s => s.SemesterID);

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
            if (semIds.length > 0) semesterOrConditions.push({ SemesterID: { [Op.in]: semIds } });

            const studentWhere: any = {
                Status: 'ACTIVE',
                [Op.or]: semesterOrConditions
            };

            if (!isAllBranches && targetDeptIds.length > 0) {
                studentWhere[Op.or] = [
                    ...semesterOrConditions.map(cond => ({ ...cond, DepartmentID: { [Op.in]: targetDeptIds } })),
                    ...semesterOrConditions.map(cond => ({ ...cond, DepartmentID: null }))
                ];
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

        // Apply division filter if specified in InternalExamDepartment
        const finalEligibleStudents: InternalStudent[] = [];
        let divMismatchCount = 0;

        for (const student of eligibleStudentsRaw) {
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
        let status: ExamEligibilityResult['status'] = 'VALIDATED';
        let message = `All ${expectedCount} eligible students are registered for this exam.`;

        if (expectedCount === 0) {
            status = 'NO_PROGRAMME_MATCH';
            message = `No active students found in branch scope (${branchScope.join(', ')}) for Semester S${semNum}.`;
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
            expectedCount,
            eligibleCount: expectedCount,
            registeredCount,
            missingCount,
            status,
            message,
            branchBreakdown,
            batchBreakdown,
            eligibleStudents: eligibleDetails,
            missingStudents: missingDetails,
            ineligibleSummary: {
                branchMismatch: otherBranchStudentsCount,
                noProgrammeScope: otherBranchStudentsCount,
                divisionMismatch: divMismatchCount,
                inactiveCount
            }
        };
    }
}
