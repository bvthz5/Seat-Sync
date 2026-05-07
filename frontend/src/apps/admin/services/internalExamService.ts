import api from '../../../services/api';

export interface InternalExamImportResult {
    success: boolean;
    message: string;
    successCount?: number;
    updatedCount?: number;
    errorCount?: number;
    errors?: string[];
    parseMode?: string;
    preview?: any[];
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
