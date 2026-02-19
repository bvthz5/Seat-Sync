
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/security';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        headers: {
            Authorization: `Bearer ${token}`
        }
    };
};

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
    const response = await axios.get(`${API_URL}/dashboard-stats`, getAuthHeaders());
    return response.data.data;
};

export const getActiveSessions = async (): Promise<ActiveSession[]> => {
    const response = await axios.get(`${API_URL}/sessions`, getAuthHeaders());
    return response.data.data;
};

export const terminateSession = async (sessionId: number): Promise<void> => {
    await axios.delete(`${API_URL}/sessions/${sessionId}`, getAuthHeaders());
};

export const terminateAllUserSessions = async (userId: number): Promise<void> => {
    await axios.delete(`${API_URL}/users/${userId}/sessions`, getAuthHeaders());
};

export const invalidateAllTokens = async (): Promise<void> => {
    await axios.post(`${API_URL}/invalidate-all`, {}, getAuthHeaders());
};
