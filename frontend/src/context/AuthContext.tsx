import React, { createContext, useState, useEffect, ReactNode } from 'react';
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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const initAuth = async () => {
            try {
                let token = AccessTokenStore.token;
                if (token) {
                    try {
                        const payload = JSON.parse(decodeURIComponent(window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
                        if (payload.exp && payload.exp < (Date.now() / 1000 + 10)) token = null;
                    } catch (e) { token = null; }
                }
                if (!token) token = await AuthService.refresh();
                AccessTokenStore.setToken(token);
                setAccessToken(token);
                const payload = JSON.parse(decodeURIComponent(window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
                const path = window.location.pathname.toLowerCase();
                const role = payload.Role;
                const isRoot = payload.IsRootAdmin;
                let isCompatible = true;
                if (path.startsWith('/admin')) { if (role !== 'exam_admin' && !isRoot) isCompatible = false; }
                else if (path.startsWith('/invigilator')) { if (role !== 'invigilator' && !isRoot) isCompatible = false; }
                else if (path.startsWith('/student')) { if (role !== 'student') isCompatible = false; }
                if (!isCompatible) { AccessTokenStore.clear(); setIsAuthenticated(false); setUser(null); }
                else { setUser({ UserID: payload.UserID, Email: payload.Email, Role: payload.Role, IsRootAdmin: payload.IsRootAdmin }); setIsAuthenticated(true); }
            } catch (error) { setIsAuthenticated(false); AccessTokenStore.clear(); }
            finally { setIsLoading(false); }
        };
        const timer = setTimeout(() => setIsLoading(prev => prev ? false : prev), 5000);
        initAuth();
        return () => clearTimeout(timer);
    }, []);

    const login = async (email: string, password: string, role?: string) => {
        const data = await AuthService.login(email, password, role);
        setUser(data.user);
        setAccessToken(data.accessToken);
        AccessTokenStore.setToken(data.accessToken);
        setIsAuthenticated(true);
        toast.success(`Welcome, ${data.user.Email}`);
    };

    const logout = async (options?: LogoutOptions) => {
        try { await AuthService.logout(); } catch (e) { }
        setUser(null);
        setAccessToken(null);
        setIsAuthenticated(false);
        AccessTokenStore.clear();
        if (!options?.silent) toast.success('Logged out successfully');
    };

    const canAccess = React.useCallback((feature: FeatureKey) => checkPermission(user, feature), [user]);

    const value = React.useMemo(() => ({ user, accessToken, isAuthenticated, isLoading, login, logout, canAccess }), [user, accessToken, isAuthenticated, isLoading, login, logout, canAccess]);

    return (
        <AuthContext.Provider value={value}>
            <AnimatePresence>{isLoading && <GlobalLoader key="global-loader" />}</AnimatePresence>
            {!isLoading && children}
        </AuthContext.Provider>
    );
};
