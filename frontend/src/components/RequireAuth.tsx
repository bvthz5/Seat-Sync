import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from './GlobalLoader';

interface RequireAuthProps {
    allowedRoles?: string[];
    redirectTo?: string;
}

/**
 * Route guard that enforces authentication and optional role-based access.
 *
 * - If loading:          shows a centered spinner.
 * - If not authenticated: redirects to `redirectTo` (saves current location for post-login redirect).
 * - If authenticated but wrong role: redirects to `redirectTo`.
 *   Exception: IsRootAdmin users are ALWAYS allowed into the admin portal regardless of role.
 */
const RequireAuth: React.FC<RequireAuthProps> = ({ allowedRoles, redirectTo = '/admin/login' }) => {
    const { isAuthenticated, isLoading, user } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="flex bg-gray-100 h-screen w-full items-center justify-center">
                <Spinner />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }

    // Root admins bypass role restrictions on the admin portal
    if (allowedRoles && user) {
        const isRoot = user.IsRootAdmin === true;
        const hasRole = allowedRoles.includes(user.Role);
        if (!hasRole && !isRoot) {
            return <Navigate to={redirectTo} replace />;
        }
    }

    return <Outlet />;
};

export default RequireAuth;
