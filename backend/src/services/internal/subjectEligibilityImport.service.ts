import xlsx from 'xlsx';
import { InternalStudent, InternalSubjectEligibility, Department } from '../../models/index.js';
import { Op } from 'sequelize';

export interface SubjectEligibilityRecord {
    courseCode: string;
    courseName: string;
    pseudoRoll: string;
    admissionNumber: string;
    studentName: string;
    internalStudentId: number | null;
    status: 'MATCHED' | 'UNRESOLVED';
}

export interface SubjectEligibilityImportResult {
    success: boolean;
    subjectCode: string;
    subjectName: string;
    totalParsed: number;
    resolvedCount: number;
    unresolvedCount: number;
    records: SubjectEligibilityRecord[];
    message: string;
}

export class SubjectEligibilityImportService {

    /**
     * Normalizes a course code string to canonical uppercase alphanumeric form for matching.
     * e.g. "24SJMNADT301", "24sjmnadt301", "24SJM NADT301" => "24SJMNADT301"
     */
    static normalizeCourseCode(code: string): string {
        if (!code) return '';
        return code.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
    }

    /**
     * Parses a buffer/file for subject-wise student eligibility list.
     */
    static async parseAndSaveSubjectEligibility(
        fileBuffer: Buffer,
        originalFilename: string,
        manualCourseCode?: string,
        manualCourseName?: string
    ): Promise<SubjectEligibilityImportResult> {
        let extractedCourseCode = manualCourseCode || '';
        let extractedCourseName = manualCourseName || '';
        const parsedRows: { pseudoRoll: string; name: string; admissionNo: string }[] = [];

        const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
        
        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            if (!sheet) continue;
            const data: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });

            for (const row of data) {
                if (!row || row.length === 0) continue;
                const rowStr = row.map(c => String(c || '').trim()).join(' ');

                // 1. Look for Header line e.g. "24SJMNECT529 - MEDICAL EMBEDDED SYSTEMS"
                if (!extractedCourseCode) {
                    const codeMatch = rowStr.match(/\b([0-9]{2}[A-Za-z]{2,8}[0-9]{3,4}[A-Za-z0-9]*)\b/);
                    if (codeMatch && codeMatch[1]) {
                        extractedCourseCode = codeMatch[1];
                        const parts = rowStr.split(/[-–—:]/);
                        if (parts.length > 1) {
                            extractedCourseName = parts.slice(1).join(' ').trim();
                        }
                    }
                }

                // 2. Look for student data row: PseudoRoll | Name | AdmissionNo
                // Admission numbers look like: 24AD026, 24CS061, 25CE001, 24CS107, 2401234
                const admMatch = rowStr.match(/\b([0-9]{2}[A-Za-z]{2,5}[0-9]{2,5}|[0-9]{6,12})\b/);
                if (admMatch && admMatch[1] && admMatch[0]) {
                    const admNo = admMatch[1].toUpperCase();
                    // Avoid matching pure course code as admission number
                    if (this.normalizeCourseCode(admNo) === this.normalizeCourseCode(extractedCourseCode)) {
                        continue;
                    }

                    // Extract pseudo roll e.g. MES-1, AI-1, 1, 2
                    let pseudoRoll = '';
                    const rollMatch = rowStr.match(/\b([A-Za-z]{2,5}[-_\s]*\d+|\d+)\b/);
                    if (rollMatch && rollMatch[1]) {
                        pseudoRoll = rollMatch[1].toUpperCase();
                    }

                    // Extract student name
                    let name = rowStr.replace(admMatch[0], '').replace(pseudoRoll, '').replace(/[|,\t]/g, ' ').trim();

                    parsedRows.push({
                        pseudoRoll: pseudoRoll || `R-${parsedRows.length + 1}`,
                        name: name || 'Student',
                        admissionNo: admNo
                    });
                }
            }
        }

        const canonicalCode = this.normalizeCourseCode(extractedCourseCode);
        if (!canonicalCode) {
            throw new Error(`Could not detect course code from subject list file "${originalFilename}". Please specify course code manually.`);
        }

        // 3. Resolve Admission Numbers against Master InternalStudents Registry
        const admissionNos = Array.from(new Set(parsedRows.map(r => r.admissionNo)));
        const existingStudents = await InternalStudent.findAll({
            where: {
                RegisterNumber: { [Op.in]: admissionNos }
            }
        });

        const studentMapByAdm = new Map<string, InternalStudent>();
        existingStudents.forEach(s => {
            studentMapByAdm.set(s.RegisterNumber.toUpperCase().trim(), s);
        });

        const resultRecords: SubjectEligibilityRecord[] = [];
        let resolvedCount = 0;
        let unresolvedCount = 0;

        for (const pr of parsedRows) {
            const student = studentMapByAdm.get(pr.admissionNo);
            const internalStudentId = student ? student.InternalStudentID : null;
            const status: 'MATCHED' | 'UNRESOLVED' = student ? 'MATCHED' : 'UNRESOLVED';

            if (student) resolvedCount++;
            else unresolvedCount++;

            resultRecords.push({
                courseCode: canonicalCode,
                courseName: extractedCourseName,
                pseudoRoll: pr.pseudoRoll,
                admissionNumber: pr.admissionNo,
                studentName: student ? student.FullName : pr.name,
                internalStudentId,
                status
            });

            // Upsert into InternalSubjectEligibilities table
            await InternalSubjectEligibility.upsert({
                SubjectCode: canonicalCode,
                SubjectName: extractedCourseName || canonicalCode,
                SubjectPseudoRoll: pr.pseudoRoll,
                AdmissionNumber: pr.admissionNo,
                StudentName: pr.name,
                InternalStudentID: internalStudentId,
                SourceFile: originalFilename
            });
        }

        return {
            success: true,
            subjectCode: canonicalCode,
            subjectName: extractedCourseName || canonicalCode,
            totalParsed: parsedRows.length,
            resolvedCount,
            unresolvedCount,
            records: resultRecords,
            message: `Parsed ${parsedRows.length} subject eligibility records (${resolvedCount} matched, ${unresolvedCount} unresolved).`
        };
    }
}
