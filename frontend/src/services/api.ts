import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// ─── Axios Instance ────────────────────────────────────────────────────────────
const api: AxiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    withCredentials: true, // Required for HttpOnly refresh-token cookie
});

// ─── Role-scoped Session Storage Keys ─────────────────────────────────────────
// Uses sessionStorage (NOT localStorage) so tokens are cleared on browser/tab close.
const STORAGE_KEYS = {
    admin:       'ss_admin_token',
    invigilator: 'ss_invigilator_token',
    student:     'ss_student_token',
    fallback:    'ss_token',
} as const;

const getStorageKey = (): string => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/admin'))       return STORAGE_KEYS.admin;
    if (path.includes('/invigilator')) return STORAGE_KEYS.invigilator;
    if (path.includes('/student'))     return STORAGE_KEYS.student;
    return STORAGE_KEYS.fallback;
};

const REFRESH_STORAGE_KEYS = {
    admin:       'ss_admin_refresh_token',
    invigilator: 'ss_invigilator_refresh_token',
    student:     'ss_student_refresh_token',
    fallback:    'ss_refresh_token',
} as const;

const getRefreshStorageKey = (): string => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/admin'))       return REFRESH_STORAGE_KEYS.admin;
    if (path.includes('/invigilator')) return REFRESH_STORAGE_KEYS.invigilator;
    if (path.includes('/student'))     return REFRESH_STORAGE_KEYS.student;
    return REFRESH_STORAGE_KEYS.fallback;
};

const getEffectiveToken = (): string | null => {
    // Only read the token for the current portal — no cross-role fallback
    // (prevents a stale student token from accidentally authenticating an admin request)
    const key  = getStorageKey();
    const raw  = sessionStorage.getItem(key);
    if (raw && raw !== 'undefined' && raw !== 'null') return raw.trim();
    return null;
};

const getEffectiveRefreshToken = (): string | null => {
    const key  = getRefreshStorageKey();
    const raw  = sessionStorage.getItem(key);
    if (raw && raw !== 'undefined' && raw !== 'null') return raw.trim();
    return null;
};

export const AccessTokenStore = {
    get token() { return getEffectiveToken(); },
    get refreshToken() { return getEffectiveRefreshToken(); },

    setToken: (t: string, rt?: string) => {
        const token = (t || '').trim();
        const key   = getStorageKey();
        if (!token || token === 'undefined' || token === 'null') {
            sessionStorage.removeItem(key);
        } else {
            sessionStorage.setItem(key, token);
        }

        const refKey = getRefreshStorageKey();
        const refToken = (rt || '').trim();
        if (!refToken || refToken === 'undefined' || refToken === 'null') {
            // Keep existing if not explicitly updating
        } else {
            sessionStorage.setItem(refKey, refToken);
        }
    },

    /** Clears ALL portal token keys so a logout is truly clean. */
    clear: () => {
        Object.values(STORAGE_KEYS).forEach(k => sessionStorage.removeItem(k));
        Object.values(REFRESH_STORAGE_KEYS).forEach(k => sessionStorage.removeItem(k));
    },

    /** Returns true when there is ANY session token present (any portal). */
    hasAnySession: (): boolean => {
        return Object.values(STORAGE_KEYS).some(k => {
            const v = sessionStorage.getItem(k);
            return v && v !== 'undefined' && v !== 'null';
        }) || Object.values(REFRESH_STORAGE_KEYS).some(k => {
            const v = sessionStorage.getItem(k);
            return v && v !== 'undefined' && v !== 'null';
        });
    },
};

// ─── Refresh Token State ───────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token as string));
    failedQueue = [];
};

// ─── Helper: portal-aware login redirect ──────────────────────────────────────
const redirectToLogin = () => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/login')) return; // already on a login page — don't loop
    if (path.startsWith('/invigilator')) {
        window.location.replace('/invigilator/login');
    } else if (path.startsWith('/student')) {
        window.location.replace('/student/login');
    } else {
        window.location.replace('/admin/login');
    }
};

// ─── Request Interceptor ──────────────────────────────────────────────────────
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = AccessTokenStore.token;
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: AxiosError) => Promise.reject(error)
);

// ─── Response Interceptor: 401 handling + token refresh ───────────────────────
api.interceptors.response.use(
    response => response,
    async (error: AxiosError) => {
        const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
        const url = original?.url ?? '';

        // ── 401 Unauthorized ──
        if (error.response?.status === 401 && !original._retry) {
            // Don't attempt refresh on auth endpoints themselves
            if (url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout')) {
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
                    .then(token => {
                        if (original.headers) original.headers.Authorization = `Bearer ${token}`;
                        return api(original);
                    });
            }

            original._retry = true;
            isRefreshing = true;

            try {
                const storedRefreshToken = AccessTokenStore.refreshToken;
                const res = await axios.post(
                    `${api.defaults.baseURL}/auth/refresh`,
                    { refreshToken: storedRefreshToken },
                    { 
                        withCredentials: true,
                        headers: storedRefreshToken ? { 'X-Refresh-Token': storedRefreshToken } : {}
                    }
                );
                const newToken = ((res.data as any)?.accessToken ?? '').trim();
                const newRefreshToken = ((res.data as any)?.refreshToken ?? '').trim();
                if (!newToken) throw new Error('Empty refresh token');

                AccessTokenStore.setToken(newToken, newRefreshToken);
                api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                processQueue(null, newToken);

                if (original.headers) original.headers.Authorization = `Bearer ${newToken}`;
                return api(original);
            } catch (refreshErr) {
                processQueue(refreshErr, null);
                AccessTokenStore.clear();
                redirectToLogin();
                return Promise.reject(refreshErr);
            } finally {
                isRefreshing = false;
            }
        }

        // ── 401 on retry → force logout ──
        if (error.response?.status === 401 && original._retry) {
            AccessTokenStore.clear();
            redirectToLogin();
            return Promise.reject(error);
        }

        // ── Network / Server Down (ERR_CONNECTION_REFUSED etc.) ──
        // Only redirect if we're NOT already on a login/public page
        if (!error.response || error.code === 'ERR_NETWORK') {
            const path = window.location.pathname.toLowerCase();
            const isPublicPage = path.includes('/login') || path === '/' ||
                path.includes('/activate') || path.includes('/forgot') ||
                path.includes('/reset') || path.includes('/request');
            if (!isPublicPage) {
                AccessTokenStore.clear();
                redirectToLogin();
            }
        }

        return Promise.reject(error);
    }
);

export default api;
