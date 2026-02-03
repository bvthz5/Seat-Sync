import api from '../../../services/api';

export const AdminManagementService = {
    getStats: async () => {
        const response = await api.get('/admin-management/stats');
        return response.data;
    },

    getAllAdmins: async (params?: any) => {
        // Params can include page, limit, search, status, etc.
        const response = await api.get('/admin-management', { params });
        return response.data;
    },

    createAdmin: async (data: { email: string; fullName: string }) => {
        const response = await api.post('/admin-management', data);
        return response.data;
    },

    toggleStatus: async (adminId: number, isActive: boolean) => {
        // Using PATCH as per original route definition compatibility or PUT/PATCH depending on backend.
        // My updated backend controller supports PUT /users/:id/status but I updated routes to use my controller.
        // The original route file used PATCH /:adminId/toggle-status and I updated the routes file to use my controller methods.
        // So the route in `adminManagement.routes.ts` is `router.patch("/:adminId/toggle-status", toggleAdminStatus);`.
        // My controller toggles if no body, or sets if body.
        return await api.patch(`/admin-management/${adminId}/toggle-status`, { isActive });
    },

    resetPassword: async (adminId: number) => {
        // Route in adminManagement.routes.ts is PATCH /:adminId/reset-password
        return await api.patch(`/admin-management/${adminId}/reset-password`);
    },

    deleteAdmin: async (adminId: number) => {
        return await api.delete(`/admin-management/${adminId}`);
    },

    getActivity: async (adminId: number, params?: any) => {
        const response = await api.get(`/admin-management/${adminId}/activity`, { params });
        return response.data;
    }
};
