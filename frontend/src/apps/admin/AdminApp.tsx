import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './layout/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Exams from './pages/Exams';
import SeatingPlans from './pages/SeatingPlans';
import Invigilators from './pages/Invigilators';
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';
import ManageAdmins from './pages/ManageAdmins';
import RequireAuth from '../../components/RequireAuth';

const AdminApp: React.FC = () => {
    return (
        <Routes>
            <Route path="login" element={<Login />} />

            <Route element={<RequireAuth />}>
                <Route element={<AdminLayout />}>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="exams" element={<Exams />} />
                    <Route path="seating" element={<SeatingPlans />} />
                    <Route path="invigilators" element={<Invigilators />} />
                    <Route path="attendance" element={<Attendance />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="manage-admins" element={<ManageAdmins />} />
                    {/* Add other protected routes here */}
                </Route>
            </Route>

            {/* Catch all for admin (optional) */}
            <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
    );
};

export default AdminApp;
