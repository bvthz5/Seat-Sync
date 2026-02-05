import api from '../../../services/api';

export const academicService = {
    // --- Academic Years ---
    getYears: async () => api.get('/academic-setup/years'),
    createYear: async (data: any) => api.post('/academic-setup/years', data),
    setCurrentYear: async (id: number) => api.patch(`/academic-setup/years/${id}/set-current`),
    deleteYear: async (id: number) => api.delete(`/academic-setup/years/${id}`),

    // --- Departments ---
    getDepartments: async (params?: any) => api.get('/departments', { params }),
    importDepartments: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/departments/import', formData);
        return response.data;
    },
    downloadDepartmentTemplate: async () => {
        const response = await api.get('/departments/template', { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'department_template.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();
    },

    // --- Programs ---
    getPrograms: async (params?: any) => api.get('/programs', { params }),
    importPrograms: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/programs/import', formData);
        return response.data;
    },
    downloadProgramTemplate: async () => {
        const response = await api.get('/programs/template', { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'program_template.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();
    },

    // --- Semesters ---
    getSemesters: async (params?: any) => api.get('/academic-setup/semesters', { params }),
    createSemester: async (data: any) => api.post('/academic-setup/semesters', data),

    // --- Subjects ---
    getSubjects: async (params?: any) => api.get('/academic-setup/subjects', { params }),
    createSubject: async (data: any) => api.post('/academic-setup/subjects', data),

    // --- Students ---
    importStudents: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/students/import', formData);
        return response.data;
    },
    deleteAllStudents: async () => api.delete('/students/delete-all'),

    // --- User Management (Cleanup) ---
    getStudentUsers: async (params?: any) => api.get('/users/students', { params }),
    deleteUser: async (id: number) => api.delete(`/users/${id}`),
    deleteAllStudentUsers: async () => api.delete('/users/students/delete-all'),
};

export default academicService;
