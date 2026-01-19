import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'react-hot-toast';

// Create Axios instance
const api: AxiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
    withCredentials: true, // Important for cookies (refresh token)
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Attach Access Token
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('accessToken'); // Simple storage for now (or memory via hook, but interceptor needs access)
        // Note: The requirement asked for "memory" storage. Ideally we keep it in memory (variable), 
        // but interceptors exist outside React context. A common pattern is to let the AuthProvider 
        // inject the token or store it in a module-level variable. 
        // For simplicity and robustness in this artifact, I will use a simple module getter/setter 
        // or rely on localStorage if acceptable. 
        // Requirement says: "Access token stored in memory (React context or hook)".
        // So I should expose a method to set the token for the interceptor.

        if (AccessTokenStore.token && config.headers) {
            config.headers.Authorization = `Bearer ${AccessTokenStore.token}`;
        }
        return config;
    },
    (error: AxiosError) => Promise.reject(error)
);

// Response Interceptor: Handle 401 & Refresh
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
                // If login or refresh fails, don't loop
                return Promise.reject(error);
            }

            originalRequest._retry = true;

            try {
                // Call refresh endpoint
                // Use a separate axios instance to avoid interceptor loop if needed, 
                // but since we exclude /refresh path above, same instance is fine.
                const response = await api.post('/auth/refresh');

                const { accessToken } = response.data;
                AccessTokenStore.setToken(accessToken);

                // Update header and retry
                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                }
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed - clean up and redirect
                AccessTokenStore.clear();
                window.location.href = '/admin/login'; // Hard redirect to clear state
                return Promise.reject(refreshError);
            }
        }

        // Global Error Handling (Optional/Requested)
        if (error.response?.data && typeof error.response.data === 'object' && 'message' in error.response.data) {
            // Don't toast 401s as they are handled by refresh flow usually, unless it's final failure
            if (error.response.status !== 401 || originalRequest.url?.includes('/auth/login')) {
                toast.error((error.response.data as any).message || 'An error occurred');
            }
        }

        return Promise.reject(error);
    }
);

// Simple memory store for token (namespaced to avoid global pollution)
export const AccessTokenStore = {
    token: null as string | null,
    setToken: (t: string) => { AccessTokenStore.token = t; },
    clear: () => { AccessTokenStore.token = null; }
};

export default api;
