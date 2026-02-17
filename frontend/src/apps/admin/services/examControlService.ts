
import api from '../../../services/api';

export const ExamControlService = {
    getOverview: async () => {
        const response = await api.get('/admin/exam-control/overview');
        return response.data;
    },

    getLogs: async (examId?: number) => {
        const url = examId ? `/admin/exam-control/${examId}/logs` : '/admin/exam-control/logs';
        const response = await api.get(url);
        return response.data;
    },

    updateStatus: async (examId: number, status: string, reason: string) => {
        const response = await api.patch(`/admin/exam-control/${examId}/status`, { newStatus: status, reason });
        return response.data;
    },

    toggleVisibility: async (examId: number, visible: boolean, reason: string) => {
        const response = await api.patch(`/admin/exam-control/${examId}/visibility`, { visible, reason });
        return response.data;
    },

    emergencyAllocate: async (examId: number, excludeRoomIds: number[]) => {
        const response = await api.post(`/admin/exam-control/${examId}/emergency/allocate`, { excludeRoomIds });
        return response.data;
    },

    disableRoom: async (roomId: number, reason: string) => {
        const response = await api.post(`/admin/exam-control/emergency/disable-room`, { roomId, reason });
        return response.data;
    },

    lockAttendance: async (examId: number) => {
        const response = await api.patch(`/admin/exam-control/${examId}/lock-attendance`);
        return response.data;
    },

    broadcast: async (examId: number | undefined, title: string, message: string, type: string) => {
        const url = examId ? `/admin/exam-control/${examId}/broadcast` : `/admin/exam-control/0/broadcast`; // 0 or separate endpoint? 
        // My route is /:examId/broadcast. If global, I might need a dummy ID or change route.
        // Route is /:examId/broadcast. If I strictly want global without exam context, I should pass a dummy ID or handle it.
        // My controller parses examId. If examId is provided, it prepends title.
        // I will pass 0 if generic.
        const response = await api.post(url, { title, message, type });
        return response.data;
    }
};
