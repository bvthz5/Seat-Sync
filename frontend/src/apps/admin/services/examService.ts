import api from '../../../services/api';

const PREFIX = '/exams';

export const ExamService = {
    getAll: async (params?: any) => {
        const response = await api.get(PREFIX, { params });
        return response.data;
    },

    getStats: async () => {
        const response = await api.get(`${PREFIX}/stats`);
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
    }
};
