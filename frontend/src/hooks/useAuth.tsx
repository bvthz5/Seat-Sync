import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '../types/auth';
import { AuthService } from '../services/auth.service';
import { AccessTokenStore } from '../services/api';
import { toast } from '../utils/toast';
import { checkPermission } from '../utils/permissions';
import { FeatureKey } from '../types/permission.types';

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

    // Initialize: Try to refresh token on load to verify session
    useEffect(() => {
        const initAuth = async () => {
            // Optimization: Don't attempt refresh if we know user isn't logged in
            // This prevents the scary "401 Unauthorized" console error on fresh loads
            if (sessionStorage.getItem('seatSync_isLoggedIn') !== 'true') {
                setIsLoading(false);
                return;
            }

            try {
                const token = await AuthService.refresh();
                // We need a way to get user details from token or a separate endpoint 'me'. 
                // For now, let's decode the token or assume the user object is stored/fetched.
                // Since backend /refresh returns accessToken (and maybe user? user req said "Issues new access token").
                // The backend /refresh response currently only returns { accessToken }. 
                // The payload has the user. verifyAccessToken(token) returns payload.
                // We can decode the JWT to get the user info.

                AccessTokenStore.setToken(token);
                setAccessToken(token);

                // Simple manual decode for now
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
                sessionStorage.removeItem('seatSync_isLoggedIn'); // Clean up invalid state
                setIsAuthenticated(false);
            } finally {
                setIsLoading(false);
            }
        };
        initAuth();
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const data = await AuthService.login(email, password);
            setUser(data.user);
            setAccessToken(data.accessToken);
            AccessTokenStore.setToken(data.accessToken);
            sessionStorage.setItem('seatSync_isLoggedIn', 'true'); // Mark as logged in (Session only)
            setIsAuthenticated(true);
            toast.success(`Welcome, ${data.user.Email}`);
        } catch (error: any) {
            // Error handling is done in api interceptor or UI component, 
            // but we throw here so UI can stop loading state
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
        sessionStorage.removeItem('seatSync_isLoggedIn'); // Mark as logged out

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
            {children}
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
