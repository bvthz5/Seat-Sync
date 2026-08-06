import api from '../../../services/api';

export interface InternalStudentImportResult {
    message: string;
    importType: string;
    examId: number;
    examName: string;
    studentsImported: number;
    studentsMapped: number;
    errorCount: number;
    errors: { row: number; reason: string }[];
}

export interface InternalExamDetail {
    exam: {
        InternalExamID: number;
        SubjectCode: string;
        SubjectName: string;
        ExamDate: string;
        Session: string;
        Semester: string;
        Slot: string;
        Duration: number;
        StartTime: string;
        EndTime: string;
        departments: { DepartmentID: number; DepartmentCode: string; DepartmentName: string }[];
    };
    studentCount: number;
    departmentBreakdown: { DepartmentCode: string; DepartmentName: string; count: number }[];
}

export interface MappedStudent {
    registrationId: number;
    internalStudentId: number;
    registerNumber: string;
    rollNumber?: number | null;
    division?: string | null;
    batch?: string | null;
    fullName: string;
    department: string;
    departmentCode: string;
    program: string;
    semester: number | string;
    batchYear: number;
    registrationMethod?: string;
}

export const InternalStudentService = {
    // Import students and optionally map to an internal exam
    importStudents: async (file: File, internalExamId?: number | null): Promise<InternalStudentImportResult> => {
        const formData = new FormData();
        formData.append('file', file);
        if (internalExamId) {
            formData.append('internalExamId', internalExamId.toString());
        }
        const response = await api.post('/internal/students/import', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    // Get exam detail with student count + department breakdown
    getExamDetail: async (examId: number): Promise<InternalExamDetail> => {
        const response = await api.get(`/internal/exams/${examId}/detail`);
        return response.data;
    },

    // Get all students mapped to an exam
    getStudentsForExam: async (examId: number): Promise<{ exam: any; totalStudents: number; students: MappedStudent[] }> => {
        const response = await api.get(`/internal/exams/${examId}/students`);
        return response.data;
    },

    // Remove a single student mapping from an exam
    removeStudentFromExam: async (examId: number, studentId: number) => {
        const response = await api.delete(`/internal/exams/${examId}/students/${studentId}`);
        return response.data;
    },

    // Clear all student mappings from an exam
    clearStudentsFromExam: async (examId: number) => {
        const response = await api.delete(`/internal/exams/${examId}/students`);
        return response.data;
    },

    // Auto map existing matching students in system database to an exam
    autoMapStudents: async (examId: number): Promise<{ success: boolean; message: string; mappedCount: number }> => {
        const response = await api.post(`/internal/exams/${examId}/students/auto-map`);
        return response.data;
    },

    // Bulk auto map existing matching students for all exams in an exam series
    bulkAutoMapSeries: async (seriesId: number): Promise<{ success: boolean; message: string; totalMapped: number; totalMatched: number; examsProcessed: number }> => {
        const response = await api.post(`/internal/series/${seriesId}/auto-map-all`);
        return response.data;
    },

    // List all internal students
    getAllStudents: async (params?: { page?: number; limit?: number; search?: string; dept?: number; batch?: number; examId?: number }) => {
        const response = await api.get('/internal/students', { params });
        return response.data;
    },

    // Get filter options for internal students
    getFilterOptions: async () => {
        const response = await api.get('/internal/students/filter-options');
        return response.data;
    },

    // Get dashboard stats for internal students
    getStats: async () => {
        const response = await api.get('/internal/students/stats');
        return response.data;
    },

    // Delete internal student
    deleteStudent: async (id: number) => {
        const response = await api.delete(`/internal/students/${id}`);
        return response.data;
    },

    // Delete all internal students
    deleteAllInternalStudents: async () => {
        const response = await api.delete('/internal/students');
        return response.data;
    },

    // Export internal student passwords
    exportPasswords: async (dept?: string) => {
        const response = await api.get('/internal/students/export-credentials', {
            params: { dept },
            responseType: 'blob'
        });
        return response.data;
    },

    // Sync semesters for internal students
    syncSemesters: async () => {
        const response = await api.post('/internal/students/sync-semesters');
        return response.data;
    }
};
