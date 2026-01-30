
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

export const SubjectService = {
    getAll: async () => {
        // Fetch all subjects (assuming endpoint exists, if not we'll need to check Routes)
        // Based on typical REST patterns in this app
        const response = await axios.get(`${API_URL}/subjects`);
        return response.data;
    }
};
