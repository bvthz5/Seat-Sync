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

// Token storage using localStorage (persists across refreshes)
export const AccessTokenStore = {
    get token() { return localStorage.getItem('accessToken'); },
    setToken: (t: string) => { localStorage.setItem('accessToken', t); },
    clear: () => { localStorage.removeItem('accessToken'); }
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
        const token = localStorage.getItem('accessToken');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
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
                // Call refresh endpoint using raw axios instance to avoid interceptors
                // We assume the refresh endpoint relies on the HttpOnly cookie
                const response = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {}, {
                    withCredentials: true
                });

                const { accessToken } = response.data;

                localStorage.setItem('accessToken', accessToken);
                // Also update the memory store wrapper
                AccessTokenStore.setToken(accessToken);

                api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

                processQueue(null, accessToken);

                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                }

                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                AccessTokenStore.clear(); // Clears localStorage
                sessionStorage.removeItem('seat_sync_active'); // Ensure session is dead

                // Only redirect if we are not explicitly told to handle it elsewhere
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/admin/login';
                }

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        } else if (error.response?.status === 401 && originalRequest._retry) {
            // If the retry also fails with 401, force logout (Double Fail Safety)
            AccessTokenStore.clear();
            sessionStorage.removeItem('seat_sync_active');
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/admin/login';
            }
            return Promise.reject(error);
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

        // Handle Network Errors (Connection Refused, Server Down) - User Request
        if (!error.response || error.code === 'ERR_NETWORK') {
            AccessTokenStore.clear();
            sessionStorage.removeItem('seat_sync_active');
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/admin/login';
            }
        }

        return Promise.reject(error);
    }
);

export default api;
