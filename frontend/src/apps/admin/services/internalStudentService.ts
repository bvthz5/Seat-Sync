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
    // Import students and optionally map to an internal exam or auto-map across a semester/series
    importStudents: async (
        file: File, 
        params?: number | null | { internalExamId?: number | null; seriesId?: number | string; semester?: string }
    ): Promise<InternalStudentImportResult> => {
        const formData = new FormData();
        formData.append('file', file);
        if (typeof params === 'number') {
            formData.append('internalExamId', params.toString());
        } else if (params) {
            if (params.internalExamId) formData.append('internalExamId', params.internalExamId.toString());
            if (params.seriesId) formData.append('seriesId', params.seriesId.toString());
            if (params.semester) formData.append('semester', params.semester.toString());
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

    // Remove specific department(s) and all their mapped students from an exam
    removeDepartmentFromExam: async (examId: number, deptCodes: string | string[]): Promise<{ success: boolean; message: string; deptCodes: string[]; deletedCount: number }> => {
        const codeParam = Array.isArray(deptCodes) ? deptCodes.join(',') : deptCodes;
        const response = await api.delete(`/internal/exams/${examId}/departments/${encodeURIComponent(codeParam)}`);
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

    // Clear student mappings across a semester or entire series
    clearSeriesStudentMappings: async (seriesId: number, semester?: string): Promise<{ success: boolean; message: string; clearedCount: number; examsCount: number }> => {
        const response = await api.delete(`/internal/series/${seriesId}/clear-mappings`, {
            params: { semester }
        });
        return response.data;
    },

    // Remove selected department(s) and all their students from all exams in a series semester
    removeDepartmentsFromSeries: async (
        seriesId: number,
        deptCodes: string | string[],
        semester?: string
    ): Promise<{ success: boolean; message: string; deptCodes: string[]; deletedCount: number; examsAffected: number }> => {
        const codeParam = Array.isArray(deptCodes) ? deptCodes.join(',') : deptCodes;
        const response = await api.delete(`/internal/series/${seriesId}/departments/${encodeURIComponent(codeParam)}`, {
            params: semester ? { semester } : {}
        });
        return response.data;
    },

    // Get distinct departments with student counts for a series+semester (for Remove Dept modal)
    getSeriesSemesterDepartments: async (
        seriesId: number,
        semester?: string
    ): Promise<{ departments: { departmentId: number; departmentCode: string; departmentName: string; studentCount: number }[]; totalExams: number; semester: string | null }> => {
        const response = await api.get(`/internal/series/${seriesId}/semester-departments`, {
            params: semester ? { semester } : {}
        });
        return response.data;
    },

    // List all internal students
    getAllStudents: async (params?: { page?: number; limit?: number; search?: string; dept?: number; batch?: number; sem?: number | string; examId?: number }) => {
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
    },

    // Get exam reconciliation (expected vs registered breakdown)
    getExamReconciliation: async (examId: number) => {
        const response = await api.get(`/internal/exams/${examId}/reconciliation`);
        return response.data;
    },

    // Get series-level reconciliation report
    getSeriesReconciliation: async (seriesId: number) => {
        const response = await api.get(`/internal/series/${seriesId}/reconciliation`);
        return response.data;
    },

    // Upload / Add student subject enrollments (for Electives/Minor/Honours)
    uploadSubjectEnrollments: async (enrollments: Array<{ registerNumber: string; subjectCode: string; semester?: string; enrollmentType?: string }>) => {
        const response = await api.post('/internal/students/subject-enrollments', { enrollments });
        return response.data;
    }
};
