
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/exams';

const getAuthHeader = () => {
    const token = localStorage.getItem('accessToken');
    return { headers: { Authorization: `Bearer ${token}` } };
};

export const ExamService = {
    getAll: async (params?: any) => {
        const response = await axios.get(API_URL, { ...getAuthHeader(), params });
        return response.data;
    },

    getStats: async () => {
        const response = await axios.get(`${API_URL}/stats`, getAuthHeader());
        return response.data;
    },

    create: async (data: any) => {
        const response = await axios.post(API_URL, data, getAuthHeader());
        return response.data;
    },

    update: async (id: number, data: any) => {
        const response = await axios.put(`${API_URL}/${id}`, data, getAuthHeader());
        return response.data;
    },

    delete: async (id: number) => {
        const response = await axios.delete(`${API_URL}/${id}`, getAuthHeader());
        return response.data;
    }
};
