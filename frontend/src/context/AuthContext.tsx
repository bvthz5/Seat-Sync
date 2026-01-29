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
    login: (email: string, password: string) => Promise<void>;
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
            // Check session storage first
            if (sessionStorage.getItem('seatSync_isLoggedIn') !== 'true') {
                setIsLoading(false);
                return;
            }

            try {
                // Attempt to refresh token
                const token = await AuthService.refresh();

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
                sessionStorage.removeItem('seatSync_isLoggedIn');
                setIsAuthenticated(false);
                AccessTokenStore.clear();
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

    const login = async (email: string, password: string) => {
        try {
            const data = await AuthService.login(email, password);
            setUser(data.user);
            setAccessToken(data.accessToken);
            AccessTokenStore.setToken(data.accessToken);
            sessionStorage.setItem('seatSync_isLoggedIn', 'true');
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
        sessionStorage.removeItem('seatSync_isLoggedIn');

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
