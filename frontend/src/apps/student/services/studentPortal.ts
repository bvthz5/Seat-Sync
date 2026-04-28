import api from '../../../services/api';

export interface StudentDashboardResponse {
    student: {
        userId: number | null;
        name: string;
        email: string | null;
        registerNumber: string;
        department: string | null;
        departmentCode: string | null;
        program: string | null;
        semester: string | number | null;
        batchYear: number | null;
    };
    academic: {
        department: string | null;
        departmentCode: string | null;
        program: string | null;
        semester: string | number | null;
        batchYear: number | null;
    };
    stats: {
        totalExams: number;
        upcomingExams: number;
        unreadNotifications: number;
        criticalNotifications: number;
    };
    todayExam: any | null;
    upcomingExams: any[];
    seating: any | null;
    notifications: any[];
    history: any[];
}

export const studentPortalApi = {
    async getDashboard(): Promise<StudentDashboardResponse> {
        const response = await api.get('/student/dashboard');
        return response.data;
    },

    async getExams(): Promise<any[]> {
        const response = await api.get('/student/exams');
        return response.data.data;
    },

    async getSeating(): Promise<any> {
        const response = await api.get('/student/seating');
        return response.data.data;
    },

    async getNotifications(params: Record<string, any> = {}): Promise<any> {
        const response = await api.get('/student/notifications', { params });
        return response.data;
    },

    async getHistory(): Promise<any[]> {
        const response = await api.get('/student/history');
        return response.data.data;
    },
};