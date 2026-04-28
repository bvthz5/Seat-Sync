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

    async getUpcomingExams(): Promise<any[]> {
        const response = await api.get('/student/exams/upcoming');
        return response.data.data;
    },

    async getExams(): Promise<any[]> {
        const response = await api.get('/student/exams');
        return response.data.data;
    },

    async getSeating(examId?: string | number): Promise<any> {
        const url = examId ? `/student/seating/${examId}` : '/student/seating';
        const response = await api.get(url);
        return response.data.data;
    },

    async getSeatLayout(examId: string | number): Promise<any[]> {
        const response = await api.get(`/student/seating/layout/${examId}`);
        return response.data.data;
    },

    async getNotifications(params: Record<string, any> = {}): Promise<any> {
        const response = await api.get('/student/notifications', { params });
        return response.data;
    },

    async getHistory(): Promise<any[]> {
        const response = await api.get('/student/exams/history');
        return response.data.data;
    },

    async getProfile(): Promise<any> {
        const response = await api.get('/student/profile');
        return response.data.data;
    },

    async updateProfile(data: any): Promise<any> {
        const response = await api.put('/student/profile', data);
        return response.data;
    },

    async uploadAvatar(avatar: string): Promise<any> {
        const response = await api.post('/student/profile/avatar', { avatar });
        return response.data;
    },
};