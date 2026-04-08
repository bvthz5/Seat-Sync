import api from './api';

interface ImportResponse {
    successCount: number;
    errorCount: number;
}

const academicService = {
    /**
     * Import students from a CSV/Excel file
     * @param file - The file to import containing student data
     * @returns Promise with success and error counts
     */
    importStudents: async (file: File): Promise<ImportResponse> => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post('/students/import', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                timeout: 30000,
            });

            return {
                successCount: response.data?.successCount || 0,
                errorCount: response.data?.errorCount || 0,
            };
        } catch (error) {
            console.error('Error importing students:', error);
            throw error;
        }
    },

    /**
     * Get import template
     * @returns Promise containing template data
     */
    getImportTemplate: async () => {
        try {
            const response = await api.get('/students/import-template');
            return response.data;
        } catch (error) {
            console.error('Error fetching import template:', error);
            throw error;
        }
    },

    /**
     * Validate import file before uploading
     * @param file - The file to validate
     * @returns Promise with validation result
     */
    validateImportFile: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post('/students/validate-import', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        } catch (error) {
            console.error('Error validating import file:', error);
            throw error;
        }
    },
};

export default academicService;
