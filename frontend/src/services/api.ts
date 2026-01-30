import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { toast } from '../utils/toast';

// Create Axios instance
const api: AxiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
    withCredentials: true, // Important for cookies (refresh token)
    headers: {
        'Content-Type': 'application/json',
    },
});

// Simple memory store for token
export const AccessTokenStore = {
    token: null as string | null,
    setToken: (t: string) => { AccessTokenStore.token = t; },
    clear: () => { AccessTokenStore.token = null; }
};

// -- Refresh Token Mechanism Variables --
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: any) => void;
}> = [];

// Helper to process the queue
const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token as string);
        }
    });
    failedQueue = [];
};

// Request Interceptor: Attach Access Token
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
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

        // Handle 401 errors
        if (error.response?.status === 401 && !originalRequest._retry) {
            // Prevent infinite loops on login/refresh endpoints
            if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
                return Promise.reject(error);
            }

            if (isRefreshing) {
                // If already refreshing, queue this request
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        if (originalRequest.headers) {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                        }
                        return api(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Call refresh endpoint
                const response = await api.post('/auth/refresh');
                const { accessToken } = response.data;

                AccessTokenStore.setToken(accessToken);
                processQueue(null, accessToken);

                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                }

                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                AccessTokenStore.clear();

                // Only redirect if we are not explicitly told to handle it elsewhere
                // But for safety, we usually redirect here.
                // We use window.location to force a full cleanup of state
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/admin/login';
                }

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        // Global Error Handling (for non-401s or unhandled errors)
        if (error.response?.data && typeof error.response.data === 'object' && 'message' in error.response.data) {
            // Don't toast 401s as they are handled above (or result in redirect)
            if (error.response.status !== 401) {
                const msg = (error.response.data as any).message;
                // Avoid redundant toasts for common interruptions
                if (msg !== 'No active session') {
                    // toast.error(msg || 'An error occurred'); 
                    // Commented out to prevent toast spam, let components handle specific errors if needed
                    // Or enable if you prefer global error toasts
                }
            }
        }

        return Promise.reject(error);
    }
);

export default api;
