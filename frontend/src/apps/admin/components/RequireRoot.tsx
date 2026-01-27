import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';

const RequireRoot: React.FC = () => {
    const { user } = useAuth();

    if (!user?.IsRootAdmin) {
        return <Navigate to="/admin/dashboard" replace />;
    }

    return <Outlet />;
};

export default RequireRoot;
