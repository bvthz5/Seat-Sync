import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import { User, AuthState } from '../types/auth'; // Ensure path is correct
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const initAuth = async () => {
            // Check for active session flag (Session Storage survives reload, dies on close)
            const sessionActive = sessionStorage.getItem('seat_sync_active');

            if (!sessionActive) {
                // Tab was closed or new session. Treat as logged out.
                // We proactively clear artifacts to ensure no stale state.
                AccessTokenStore.clear();
                setIsAuthenticated(false);
                setIsLoading(false);
                // Optional: Attempt to clear backend cookies just in case they persist
                try { await AuthService.logout(); } catch (e) { /* ignore */ }
                return;
            }

            try {
                // Attempt to refresh token or get locally
                let token = AccessTokenStore.token;

                // Validate local token expiration
                if (token) {
                    try {
                        const base64Url = token.split('.')[1];
                        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
                            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                        }).join(''));
                        const payload = JSON.parse(jsonPayload);

                        // Check if token is expired (add 10s buffer)
                        const currentTime = Date.now() / 1000;
                        if (payload.exp && payload.exp < (currentTime + 10)) {
                            token = null;
                        }
                    } catch (e) {
                        token = null;
                    }
                }

                if (!token) {
                    token = await AuthService.refresh();
                }

                AccessTokenStore.setToken(token);
                setAccessToken(token);

                // Decode token to get user info (manual decode)
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                const payload = JSON.parse(jsonPayload);

                setUser({
                    UserID: payload.UserID,
                    Email: payload.Email,
                    Role: payload.Role,
                    IsRootAdmin: payload.IsRootAdmin
                });
                setIsAuthenticated(true);
            } catch (error) {
                // Not authenticated or token expired
                setIsAuthenticated(false);
                AccessTokenStore.clear();
                sessionStorage.removeItem('seat_sync_active');
            } finally {
                // Always unset loading state
                setIsLoading(false);
            }
        };

        const timer = setTimeout(() => {
            // Safety fallback: ensure loader doesn't stick for more than 5s if backend hangs
            setIsLoading((prev) => (prev ? false : prev));
        }, 5000);

        initAuth();

        return () => clearTimeout(timer);
    }, []);

    const login = async (email: string, password: string, role?: string) => {
        try {
            const data = await AuthService.login(email, password, role);
            setUser(data.user);
            setAccessToken(data.accessToken);
            AccessTokenStore.setToken(data.accessToken);
            // Mark session as active
            sessionStorage.setItem('seat_sync_active', 'true');
            setIsAuthenticated(true);
            toast.success(`Welcome, ${data.user.Email}`);
        } catch (error: any) {
            throw error;
        }
    };

    const logout = async (options?: LogoutOptions) => {
        try {
            await AuthService.logout();
        } catch (e) { /* ignore */ }
        setUser(null);
        setAccessToken(null);
        setIsAuthenticated(false);
        AccessTokenStore.clear();
        sessionStorage.removeItem('seat_sync_active');

        if (!options?.silent) {
            toast.success('Logged out successfully');
        }
    };

    const canAccess = React.useCallback((feature: FeatureKey) => {
        return checkPermission(user, feature);
    }, [user]);

    const value = React.useMemo(() => ({
        user,
        accessToken,
        isAuthenticated,
        isLoading,
        login,
        logout,
        canAccess
    }), [user, accessToken, isAuthenticated, isLoading, login, logout, canAccess]);

    return (
        <AuthContext.Provider value={value}>
            <AnimatePresence>
                {isLoading && <GlobalLoader key="global-loader" />}
            </AnimatePresence>
            {!isLoading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
