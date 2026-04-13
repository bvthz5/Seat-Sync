import api from '../../../services/api';

const PREFIX = '/exams';

export const ExamService = {
    getAll: async (params?: any) => {
        const response = await api.get(PREFIX, { params });
        return response.data;
    },

    getStats: async (params?: any) => {
        const response = await api.get(`${PREFIX}/stats`, { params });
        return response.data;
    },

    create: async (data: any) => {
        const response = await api.post(PREFIX, data);
        return response.data;
    },

    update: async (id: number, data: any) => {
        const response = await api.put(`${PREFIX}/${id}`, data);
        return response.data;
    },

    delete: async (id: number) => {
        const response = await api.delete(`${PREFIX}/${id}`);
        return response.data;
    },

    deleteAll: async (seriesId?: number | string) => {
        const response = await api.delete(`${PREFIX}/delete-all`, {
            params: seriesId ? { seriesId } : undefined
        });
        return response.data;
    },

    importTimetable: async (file: File, seriesId?: number, examTitle?: string) => {
        const formData = new FormData();
        formData.append('file', file);
        if (seriesId) {
            formData.append('seriesId', String(seriesId));
        }
        if (examTitle) {
            formData.append('title', examTitle);
        }
        const response = await api.post(`${PREFIX}/import-timetable`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    downloadTemplate: async () => {
        const response = await api.get(`${PREFIX}/template`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'exam_timetable_template.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();
    },

    allocate: async (examId: number) => {
        const response = await api.post('/allocation/create', { examId });
        return response.data;
    }
};
