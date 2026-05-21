import React, { createContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import { User, AuthState } from '../types/auth';
import { AuthService } from '../services/auth.service';
import { AccessTokenStore } from '../services/api';
import { toast } from '../utils/toast';
import { checkPermission } from '../utils/permissions';
import { FeatureKey } from '../types/permission.types';
import GlobalLoader from '../components/GlobalLoader';

interface LogoutOptions {
    silent?: boolean;
}

interface AuthContextType extends AuthState {
    login: (email: string, password: string, role?: string) => Promise<void>;
    logout: (options?: LogoutOptions) => Promise<void>;
    canAccess: (feature: FeatureKey) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── JWT payload decoder ───────────────────────────────────────────────────────
function decodeJwt(token: string): Record<string, any> | null {
    try {
        const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(decodeURIComponent(
            window.atob(b64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
        ));
    } catch {
        return null;
    }
}

// ─── Portal  Role mapping ─────────────────────────────────────────────────────
function isRoleCompatibleWithPortal(role: string, isRoot: boolean): boolean {
    const path = window.location.pathname.toLowerCase();
    if (path.startsWith('/admin'))       return role === 'exam_admin' || isRoot;
    if (path.startsWith('/invigilator')) return role === 'invigilator';
    if (path.startsWith('/student'))     return role === 'student';
    return true; // landing page / public
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser]                   = useState<User | null>(null);
    const [accessToken, setAccessToken]     = useState<string | null>(null);
    const [isAuthenticated, setIsAuth]      = useState(false);
    const [isLoading, setIsLoading]         = useState(true);

    // ── Shared logout implementation ──────────────────────────────────────────
    const clearSession = useCallback(() => {
        setUser(null);
        setAccessToken(null);
        setIsAuth(false);
        AccessTokenStore.clear();
    }, []);

    // ── Initialise: try to reuse existing in-memory token, then refresh ───────
    useEffect(() => {
        const initAuth = async () => {
            // If there is NO session token at all, skip the refresh call entirely.
            // This prevents ERR_CONNECTION_REFUSED on a fresh browser open
            // (sessionStorage is empty after browser close, so we never ping the server).
            if (!AccessTokenStore.hasAnySession()) {
                setIsLoading(false);
                return;
            }

            try {
                let token = AccessTokenStore.token;

                // Validate in-memory token expiry
                if (token) {
                    const payload = decodeJwt(token);
                    if (!payload || (payload.exp && payload.exp < (Date.now() / 1000 + 10))) {
                        token = null;
                    }
                }

                // Try refresh only when the in-memory token is expired/missing
                // but we know there was a session (cookie may still be valid)
                if (!token) {
                    token = await AuthService.refresh();
                }

                const payload = decodeJwt(token);
                if (!payload) throw new Error('Invalid token payload');

                // Strict portal  role check
                if (!isRoleCompatibleWithPortal(payload.Role, payload.IsRootAdmin)) {
                    clearSession();
                    return;
                }

                AccessTokenStore.setToken(token);
                setAccessToken(token);
                setUser({
                    UserID:      payload.UserID,
                    Email:       payload.Email,
                    Role:        payload.Role,
                    IsRootAdmin: payload.IsRootAdmin,
                });
                setIsAuth(true);
            } catch {
                // Refresh failed (expired cookie, server down, etc.) → clean state
                clearSession();
            } finally {
                setIsLoading(false);
            }
        };

        // Safety timeout so UI never hangs if init stalls
        const timeout = setTimeout(() => setIsLoading(false), 6000);
        initAuth().finally(() => clearTimeout(timeout));
    }, [clearSession]);

    // ── Auto-logout on tab/window visibility loss (browser minimize/close) ────
    // "pagehide" fires reliably on Chrome/Edge/Firefox/Safari when tab is closed
    useEffect(() => {
        const handlePageHide = () => {
            // Don't clear on simple navigation within the SPA
            // Only clear when the page is not being kept in bfcache
            // (event.persisted = false means the page is truly unloading)
        };
        const handleBeforeUnload = () => {
            // sessionStorage is automatically cleared by the browser on close,
            // but we also call logout API silently so the server invalidates the
            // refresh-token cookie.  We use sendBeacon so it survives tab close.
            if (isAuthenticated) {
                try {
                    navigator.sendBeacon(
                        (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api') + '/auth/logout'
                    );
                } catch { /* ignore */ }
            }
        };
        window.addEventListener('pagehide', handlePageHide);
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('pagehide', handlePageHide);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isAuthenticated]);

    // ── Login ─────────────────────────────────────────────────────────────────
    const login = useCallback(async (email: string, password: string, role?: string) => {
        const data = await AuthService.login(email, password, role);
        AccessTokenStore.setToken(data.accessToken);
        setAccessToken(data.accessToken);
        setUser(data.user);
        setIsAuth(true);
        toast.success(`Welcome, ${data.user.Email}`);
    }, []);

    // ── Logout ────────────────────────────────────────────────────────────────
    const logout = useCallback(async (options?: LogoutOptions) => {
        try { await AuthService.logout(); } catch { /* ignore server errors on logout */ }
        clearSession();
        if (!options?.silent) toast.success('Logged out successfully');
    }, [clearSession]);

    // ── Permission helper ─────────────────────────────────────────────────────
    const canAccess = useCallback((feature: FeatureKey) => checkPermission(user, feature), [user]);

    const value = useMemo(
        () => ({ user, accessToken, isAuthenticated, isLoading, login, logout, canAccess }),
        [user, accessToken, isAuthenticated, isLoading, login, logout, canAccess]
    );

    return (
        <AuthContext.Provider value={value}>
            <AnimatePresence>{isLoading && <GlobalLoader key="global-loader" />}</AnimatePresence>
            {!isLoading && children}
        </AuthContext.Provider>
    );
};
