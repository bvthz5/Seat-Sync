import api from '../../../services/api';

export interface InternalExamPreviewRow {
    semester: string;
    programmeCode: string;
    programmeLabel: string;
    date: string;
    session: string;
    slot: string;
    branch: string;
    subjectCode: string;
    subjectName: string;
    subjectType: string;
    scopeType: string;
    sourceSheet?: string;
    sourceRow?: number;
}

export interface InternalExamImportProgrammeSummary {
    programme: string;
    programmeLabel: string;
    examCount: number;
}

export interface InternalExamImportSemesterSummary {
    semester: string;
    examCount: number;
    programmes: InternalExamImportProgrammeSummary[];
}

export interface InternalExamImportResult {
    success: boolean;
    message: string;
    totalRows?: number;
    totalExams?: number;
    successCount?: number;
    updatedCount?: number;
    errorCount?: number;
    errors?: string[];
    parseMode?: string;
    semesters?: InternalExamImportSemesterSummary[];
    preview?: InternalExamPreviewRow[];
}

export const InternalExamService = {
    importTimetable: async (file: File, seriesId: string | number, previewOnly: boolean = false): Promise<InternalExamImportResult> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('seriesId', seriesId.toString());
        formData.append('previewOnly', previewOnly.toString());

        const response = await api.post('/internal-exams/import-timetable', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }
};

