import api from '../../../services/api';

const PREFIX = '/series';

export const SeriesService = {
    getAll: async (params?: any) => {
        const response = await api.get(PREFIX, { params });
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
