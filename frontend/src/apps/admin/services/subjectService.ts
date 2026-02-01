import api from '../../../services/api';

export const SubjectService = {
    getAll: async () => {
        // Fetch all subjects using standard api instance
        const response = await api.get('/subjects');
        return response.data;
    }
};
