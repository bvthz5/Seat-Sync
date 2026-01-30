import api from '../../../services/api';

export const academicService = {
    // --- Academic Years ---
    getYears: async () => api.get('/academic-setup/years'),
    createYear: async (data: any) => api.post('/academic-setup/years', data),
    setCurrentYear: async (id: number) => api.patch(`/academic-setup/years/${id}/set-current`),

    // --- Departments ---
    getDepartments: async (params?: any) => api.get('/academic-setup/departments', { params }),
    createDepartment: async (data: any) => api.post('/academic-setup/departments', data),

    // --- Programs ---
    getPrograms: async (params?: any) => api.get('/academic-setup/programs', { params }),
    createProgram: async (data: any) => api.post('/academic-setup/programs', data),

    // --- Semesters ---
    getSemesters: async (params?: any) => api.get('/academic-setup/semesters', { params }),
    createSemester: async (data: any) => api.post('/academic-setup/semesters', data),

    // --- Subjects ---
    getSubjects: async (params?: any) => api.get('/academic-setup/subjects', { params }),
    createSubject: async (data: any) => api.post('/academic-setup/subjects', data),
};
