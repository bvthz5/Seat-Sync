import { InternalExam } from '../../models/index.js';
import { InternalExamEligibilityService, ExamEligibilityResult } from './internalExamEligibility.service.js';
import { fn, col, where, Op } from 'sequelize';

export interface SeriesReconciliationSummary {
    seriesId: number;
    totalExams: number;
    validatedExams: number;
    missingStudentsExams: number;
    subjectEnrollmentRequiredExams: number;
    noProgrammeMatchExams: number;
    dataErrorExams: number;
    totalExpectedStudents: number;
    totalRegisteredStudents: number;
    totalMissingStudents: number;
    isFullyValidated: boolean;
    details: ExamEligibilityResult[];
}

export interface PreSeatingValidationResult {
    isValid: boolean;
    missingExamsCount: number;
    totalMissingStudents: number;
    errors: Array<{
        examId: number;
        subjectCode: string;
        subjectName: string;
        semester: string;
        missingCount: number;
        branchBreakdown: any[];
        missingStudents: any[];
    }>;
}

export class InternalReconciliationService {

    /**
     * Reconciles a single Internal Exam (Expected vs Registered)
     */
    static async reconcileExam(examId: number, options?: { transaction?: any }): Promise<ExamEligibilityResult> {
        return InternalExamEligibilityService.calculateExamEligibility(examId, options);
    }

    /**
     * Reconciles all exams in an Internal Exam Series.
     */
    static async reconcileSeries(seriesId: number, options?: { transaction?: any }): Promise<SeriesReconciliationSummary> {
        const transaction = options?.transaction;

        const exams = await InternalExam.findAll({
            where: { InternalExamSeriesID: seriesId },
            attributes: ['InternalExamID'],
            transaction
        });

        if (exams.length === 0) {
            return {
                seriesId,
                totalExams: 0,
                validatedExams: 0,
                missingStudentsExams: 0,
                subjectEnrollmentRequiredExams: 0,
                noProgrammeMatchExams: 0,
                dataErrorExams: 0,
                totalExpectedStudents: 0,
                totalRegisteredStudents: 0,
                totalMissingStudents: 0,
                isFullyValidated: false,
                details: []
            };
        }

        const details: ExamEligibilityResult[] = [];
        let totalExpected = 0;
        let totalRegistered = 0;
        let totalMissing = 0;
        let validatedCount = 0;
        let missingStudentsCount = 0;
        let subjectEnrollmentCount = 0;
        let noProgrammeMatchCount = 0;
        let dataErrorCount = 0;

        for (const e of exams) {
            const res = await InternalExamEligibilityService.calculateExamEligibility(e.InternalExamID, { transaction });
            details.push(res);

            totalExpected += res.expectedCount;
            totalRegistered += res.registeredCount;
            totalMissing += res.missingCount;

            if (res.status === 'VALIDATED') validatedCount++;
            else if (res.status === 'MISSING_STUDENTS') missingStudentsCount++;
            else if (res.status === 'SUBJECT_ENROLLMENT_REQUIRED') subjectEnrollmentCount++;
            else if (res.status === 'NO_PROGRAMME_MATCH') noProgrammeMatchCount++;
            else if (res.status === 'DATA_ERROR') dataErrorCount++;
        }

        const isFullyValidated = missingStudentsCount === 0 && dataErrorCount === 0;

        return {
            seriesId,
            totalExams: exams.length,
            validatedExams: validatedCount,
            missingStudentsExams: missingStudentsCount,
            subjectEnrollmentRequiredExams: subjectEnrollmentCount,
            noProgrammeMatchExams: noProgrammeMatchCount,
            dataErrorExams: dataErrorCount,
            totalExpectedStudents: totalExpected,
            totalRegisteredStudents: totalRegistered,
            totalMissingStudents: totalMissing,
            isFullyValidated,
            details
        };
    }

    /**
     * Validates that all exams for a specific date and session have zero missing registered students before seating allocation begins.
     */
    static async validatePreSeating(seriesId: number, examDate: string, session: string, options?: { transaction?: any }): Promise<PreSeatingValidationResult> {
        const transaction = options?.transaction;

        const exams = await InternalExam.findAll({
            where: {
                InternalExamSeriesID: seriesId,
                ExamDate: examDate,
                [Op.and]: [where(fn('UPPER', col('Session')), session.toUpperCase())]
            },
            transaction
        });

        if (exams.length === 0) {
            throw new Error(`No internal exams found for date=${examDate}, session=${session}, seriesId=${seriesId}`);
        }

        const errors: PreSeatingValidationResult['errors'] = [];
        let totalMissingStudents = 0;

        for (const exam of exams) {
            const res = await InternalExamEligibilityService.calculateExamEligibility(exam.InternalExamID, { transaction });
            if (res.status === 'MISSING_STUDENTS' || res.missingCount > 0) {
                totalMissingStudents += res.missingCount;
                errors.push({
                    examId: exam.InternalExamID,
                    subjectCode: res.subjectCode,
                    subjectName: res.subjectName,
                    semester: res.semester,
                    missingCount: res.missingCount,
                    branchBreakdown: res.branchBreakdown,
                    missingStudents: res.missingStudents
                });
            }
        }

        const isValid = errors.length === 0;

        return {
            isValid,
            missingExamsCount: errors.length,
            totalMissingStudents,
            errors
        };
    }
}
