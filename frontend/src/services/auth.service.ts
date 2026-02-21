import api, { AccessTokenStore } from './api';
import { LoginResponse, User, UserProfile } from '../types/auth';

export const AuthService = {
    async login(email: string, password: string, role?: string): Promise<LoginResponse> {
        const response = await api.post<LoginResponse>('/auth/login', { email, password, role });
        if (response.data.accessToken) {
            AccessTokenStore.setToken(response.data.accessToken);
        }
        return response.data;
    },

    async logout(): Promise<void> {
        try {
            await api.post('/auth/logout');
        } finally {
            AccessTokenStore.clear();
        }
    },

    async refresh(): Promise<string> {
        const response = await api.post<{ accessToken: string }>('/auth/refresh');
        return response.data.accessToken;
    },

    async forgotPassword(email: string): Promise<void> {
        await api.post('/auth/forgot-password', { email });
    },

    async resetPassword(token: string, newPassword: string): Promise<void> {
        await api.post('/auth/reset-password', { token, newPassword });
    },

    async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        await api.post('/auth/change-password', { currentPassword, newPassword });
    },

    async getProfile(): Promise<UserProfile> {
        const response = await api.get<UserProfile>('/auth/profile');
        return response.data;
    },

    async updateProfile(data: Partial<UserProfile>): Promise<void> {
        await api.put('/auth/profile', data);
    }
};
