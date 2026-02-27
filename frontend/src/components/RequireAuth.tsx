import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from './GlobalLoader';

interface RequireAuthProps {
    allowedRoles?: string[];
    redirectTo?: string;
}

const RequireAuth: React.FC<RequireAuthProps> = ({ allowedRoles, redirectTo = "/admin/login" }) => {
    const { isAuthenticated, isLoading, user } = useAuth();
    const location = useLocation();

    if (isLoading) {
        // Can return a loading spinner here
        return <div className="flex bg-gray-100 h-screen w-full items-center justify-center"><Spinner /></div>;
    }

    if (!isAuthenticated) {
        // Redirect them to the /login page, but save the current location they were
        // trying to go to when they were redirected. This allows us to send them
        // along to that page after they login, which is a nicer user experience.
        return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.Role)) {
        // If they are logged in but don't have the right role, send to 404/not authorized
        return <Navigate to="/404" replace />;
    }

    return <Outlet />;
};

export default RequireAuth;
