import api, { AccessTokenStore } from './api';
import { LoginResponse, User } from '../types/auth';

export const AuthService = {
    async login(email: string, password: string): Promise<LoginResponse> {
        const response = await api.post<LoginResponse>('/auth/login', { email, password });
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
    }
};
