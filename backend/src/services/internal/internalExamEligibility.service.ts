import { Op } from 'sequelize';
import {
    InternalExam,
    InternalExamDepartment,
    InternalExamRegistration,
    InternalStudent,
    InternalSubjectEligibility,
    Department,
    Program,
    Semester
} from '../../models/index.js';
import { SubjectEligibilityImportService } from './subjectEligibilityImport.service.js';
import { normalizeProgramme, normalizeBranchCode, parseBatchString, getProgrammeLabel } from '../academicNormalizer.service.js';

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
    normalizedBranchScope: string[];
    programme: string;
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
     * Parses raw branch scope string (e.g. "AD, CA, CC, CS", "CE, EE, EC, ER, ME", "Int. MCA")
     * into a Set of normalized canonical branch codes.
     */
    static parseScopeToNormalizedBranches(rawScope: string | null | undefined): {
        rawBranches: string[];
        normalizedBranches: Set<string>;
        isAllBranches: boolean;
    } {
        if (!rawScope) {
            return { rawBranches: [], normalizedBranches: new Set(), isAllBranches: true };
        }

        const text = String(rawScope).trim().toUpperCase();
        if (text.includes('ALL BRANCHES') || text === 'ALL' || text === 'ALL_BRANCHES') {
            return { rawBranches: ['ALL_BRANCHES'], normalizedBranches: new Set(['ALL_BRANCHES']), isAllBranches: true };
        }

        const tokens = text.split(/[\s,/;&|.\-_]+/).filter(Boolean);
        const rawBranches: string[] = [];
        const normalizedBranches = new Set<string>();

        // Also check comma-separated chunks first to preserve multi-word codes like "INT MCA"
        const commaChunks = text.split(/[,;&|]+/).map(s => s.trim()).filter(Boolean);
        for (const chunk of commaChunks) {
            const norm = normalizeBranchCode(chunk);
            if (norm && norm !== 'UNKNOWN') {
                rawBranches.push(chunk);
                normalizedBranches.add(norm);
            }
        }

        if (normalizedBranches.size === 0) {
            for (const token of tokens) {
                const norm = normalizeBranchCode(token);
                if (norm && norm !== 'UNKNOWN' && !['A', 'B', 'C', 'D', 'E', 'S'].includes(norm)) {
                    rawBranches.push(token);
                    normalizedBranches.add(norm);
                }
            }
        }

        const isAllBranches = normalizedBranches.has('ALL_BRANCHES') || normalizedBranches.size === 0;
        return { rawBranches, normalizedBranches, isAllBranches };
    }

    /**
     * Calculates deterministic student eligibility for an Internal Exam.
     * Level 1: Subject-Wise Student Roster (InternalSubjectEligibility)
     * Level 2: Explicit Registrations
     * Level 3: Curriculum / Batch / Division / Branch Rule
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
                normalizedBranchScope: [],
                programme: exam.Programme || 'B.Tech',
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

        // 1. Resolve Exam Programme & Canonical Branch Scope
        const examProgNorm = normalizeProgramme(exam.Programme || (
            (exam.SubjectCode || '').includes('INMCA') || (exam.SubjectCode || '').includes('IMCA') ? 'INT_MCA' :
            (exam.SubjectCode || '').startsWith('24SJMCA') || (exam.SubjectCode || '').includes('MCA') ? 'MCA' : 'BTECH'
        ));
        const examProgLabel = getProgrammeLabel(examProgNorm);

        const deptEntries = (exam as any).InternalExamDepartments || [];
        const rawScopeParts: string[] = [];

        if (exam.BranchScope) {
            rawScopeParts.push(exam.BranchScope);
        }
        deptEntries.forEach((d: any) => {
            if (d.Department?.DepartmentCode) {
                rawScopeParts.push(d.Department.DepartmentCode);
            }
        });

        const combinedScopeStr = rawScopeParts.join(', ');
        const { rawBranches, normalizedBranches, isAllBranches } = InternalExamEligibilityService.parseScopeToNormalizedBranches(combinedScopeStr);
        const normalizedBranchList = Array.from(normalizedBranches);

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
            // Level 3: Curriculum / Master Student rule
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

            eligibleStudentsRaw = await InternalStudent.findAll({
                where: {
                    Status: 'ACTIVE',
                    [Op.or]: semesterOrConditions
                },
                include: [
                    { model: Department, as: 'Department' },
                    { model: Program }
                ],
                transaction
            });
        }

        // 3. Apply Strict 2-Step Matching (Programme -> Branch -> Division)
        const finalEligibleStudents: InternalStudent[] = [];
        let progMismatchCount = 0;
        let branchMismatchCount = 0;
        let divMismatchCount = 0;

        for (const student of eligibleStudentsRaw) {
            const studentBatch = String(student.Batch || '').trim();
            const studentParsed = parseBatchString(studentBatch);
            
            // Extract Student Programme
            let studentProgNorm = studentParsed.programCode;
            if (studentProgNorm === 'UNKNOWN' || !studentProgNorm) {
                studentProgNorm = normalizeProgramme(student.Program?.ProgramCode || student.Program?.ProgramName || studentBatch);
            }

            // STEP 1: Programme match check (BTECH vs MCA vs INT_MCA vs MTECH vs MBA)
            if (studentProgNorm !== examProgNorm) {
                progMismatchCount++;
                continue;
            }

            // STEP 2: Branch scope match check (CS vs EC vs EE vs ME vs CE vs AD vs CA vs CC vs ER vs MCA vs INT_MCA)
            if (!isAllBranches && normalizedBranches.size > 0) {
                let studentBranchNorm = studentParsed.normalizedBranchCode;
                if (studentBranchNorm === 'UNKNOWN' || !studentBranchNorm) {
                    studentBranchNorm = normalizeBranchCode(student.Department?.DepartmentCode || studentBatch);
                }

                if (!normalizedBranches.has(studentBranchNorm)) {
                    branchMismatchCount++;
                    continue;
                }
            }

            // STEP 3: Division check
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
            const sParsed = parseBatchString(s.Batch || '');
            const deptCode = s.Department?.DepartmentCode || sParsed.departmentCode || sParsed.rawBranch || 'UNKNOWN';

            const detail: StudentEligibilityDetail = {
                internalStudentId: s.InternalStudentID,
                registerNumber: s.RegisterNumber,
                fullName: s.FullName,
                departmentCode: deptCode,
                programCode: s.Program?.ProgramCode || sParsed.programCode || 'UNKNOWN',
                division: s.Division || sParsed.division || 'A',
                rollNumber: s.RollNumber ?? null,
                batch: s.Batch || sParsed.batchName || `${s.BatchYear || ''}`,
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

        // 6. Branch-wise & Batch-wise breakdowns
        const branchBreakdownMap = new Map<string, { deptName: string; expected: number; registered: number; missing: number }>();
        const batchBreakdownMap = new Map<string, { expected: number; registered: number; missing: number }>();

        for (const s of finalEligibleStudents) {
            const sParsed = parseBatchString(s.Batch || '');
            const rawBranch = sParsed.rawBranch !== 'UNKNOWN' ? sParsed.rawBranch : (s.Department?.DepartmentCode || sParsed.normalizedBranchCode);
            const deptName = s.Department?.DepartmentName || sParsed.departmentName || rawBranch;
            const bKey = s.Batch || sParsed.batchName || `${rawBranch} ${s.BatchYear || ''} ${s.Division || 'A'}`;

            if (!branchBreakdownMap.has(rawBranch)) {
                branchBreakdownMap.set(rawBranch, { deptName, expected: 0, registered: 0, missing: 0 });
            }
            const bItem = branchBreakdownMap.get(rawBranch)!;
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
            status: (val.missing === 0 ? 'OK' : 'ERROR') as 'OK' | 'ERROR'
        })).sort((a, b) => a.departmentCode.localeCompare(b.departmentCode));

        const batchBreakdown: BatchBreakdownItem[] = Array.from(batchBreakdownMap.entries()).map(([key, val]) => {
            const divMatch = key.match(/\b([A-E])\b$/);
            const division = divMatch && divMatch[1] ? divMatch[1] : 'A';
            return {
                batch: key,
                division,
                expected: val.expected,
                registered: val.registered,
                missing: val.missing
            };
        }).sort((a, b) => a.batch.localeCompare(b.batch));

        // 7. Final Status determination
        let status: ExamEligibilityResult['status'] = 'VERIFIED';
        let message = `All ${expectedCount} eligible students are registered for this exam (${eligibilitySource}).`;

        const unresolvedCount = unresolvedStudents.length;

        if (expectedCount === 0) {
            status = 'NO_PROGRAMME_MATCH';
            message = `No active ${examProgLabel} students found for ${exam.SubjectCode} (${exam.BranchScope || 'All Branches'}) in Semester ${semRaw}.`;
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
            branchScope: rawBranches,
            normalizedBranchScope: normalizedBranchList,
            programme: examProgLabel,
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
                branchMismatch: branchMismatchCount,
                noProgrammeScope: progMismatchCount,
                divisionMismatch: divMismatchCount,
                inactiveCount: 0
            }
        };
    }
}
