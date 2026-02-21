import api from '../../../services/api';
import { ExamStatus } from '../types/examControl';

export const ExamControlService = {
    getOverview: async (page = 1, limit = 10) => {
        const response = await api.get(`/exam-control/overview?page=${page}&limit=${limit}`);
        return response.data;
    },

    getLogs: async (examId?: number) => {
        const url = examId ? `/exam-control/${examId}/logs` : '/exam-control/logs';
        const response = await api.get(url);
        return response.data;
    },

    updateStatus: async (examId: number, status: ExamStatus, reason: string) => {
        const response = await api.patch(`/exam-control/${examId}/status`, { newStatus: status, reason });
        return response.data;
    },

    toggleVisibility: async (examId: number, visible: boolean, reason: string) => {
        const response = await api.patch(`/exam-control/${examId}/visibility`, { visible, reason });
        return response.data;
    },

    emergencyAllocate: async (examId: number, excludeRoomIds: number[]) => {
        const response = await api.post(`/exam-control/${examId}/emergency/allocate`, { excludeRoomIds });
        return response.data;
    },

    disableRoom: async (roomId: number, reason: string) => {
        const response = await api.post(`/exam-control/emergency/disable-room`, { roomId, reason });
        return response.data;
    },

    lockAttendance: async (examId: number) => {
        // Updated to include reason if needed later, currently backend accepts optional reason
        const response = await api.patch(`/exam-control/${examId}/lock-attendance`, { reason: "Manual Lock via Emergency Panel" });
        return response.data;
    },

    getDetails: async (examId: number) => {
        const response = await api.get(`/exam-control/${examId}/details`);
        return response.data;
    },

    broadcast: async (examId: number | undefined, title: string, message: string, type: string) => {
        const url = examId ? `/exam-control/${examId}/broadcast` : `/exam-control/broadcast`; // Fixed global route
        const response = await api.post(url, { title, message, type });
        return response.data;
    }
};
