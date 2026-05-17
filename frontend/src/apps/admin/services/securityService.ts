
import api from '../../../services/api';

const API_URL = '/security';

// Interceptors handle token now

export interface SecurityStats {
    activeSessions: number;
    failedLogins24h: number;
    rootLogins24h: number;
    alerts: number;
    loginActivity: {
        date: string;
        successful: number;
        failed: number;
        root: number;
    }[];
}

export interface ActiveSession {
    SessionID: number;
    UserID: number;
    IPAddress: string;
    UserAgent: string;
    LoginAt: string;
    LastActivity: string;
    IsActive: boolean;
    user: {
        UserID: number;
        Email: string;
        FullName: string;
        Role: string;
        IsRootAdmin: boolean;
    };
}

export const getDashboardStats = async (): Promise<SecurityStats> => {
    const response = await api.get(`${API_URL}/dashboard-stats`);
    return response.data.data;
};

export const getActiveSessions = async (): Promise<ActiveSession[]> => {
    const response = await api.get(`${API_URL}/sessions`);
    return response.data.data;
};

export const terminateSession = async (sessionId: number): Promise<void> => {
    await api.delete(`${API_URL}/sessions/${sessionId}`);
};

export const terminateAllUserSessions = async (userId: number): Promise<void> => {
    await api.delete(`${API_URL}/users/${userId}/sessions`);
};

export const invalidateAllTokens = async (): Promise<void> => {
    await api.post(`${API_URL}/invalidate-all`);
};
