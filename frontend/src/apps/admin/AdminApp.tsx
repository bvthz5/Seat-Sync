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
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ChangePassword from './pages/ChangePassword';
import Students from './pages/Students';
import CollegeStructure from './pages/CollegeStructure';
import ExamControl from './pages/ExamControl';
import SystemSettings from './pages/SystemSettings';
import ActivityLogs from './pages/ActivityLogs';
import Notifications from './pages/Notifications';
import Security from './pages/Security';
import RequireAuth from '../../components/RequireAuth';
import RequireRoot from './components/RequireRoot';

const AdminApp: React.FC = () => {
    return (
        <Routes>
            <Route path="login" element={<Login />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password" element={<ResetPassword />} />

            <Route element={<RequireAuth />}>
                <Route element={<AdminLayout />}>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="students" element={<Students />} />
                    <Route path="exams" element={<Exams />} />
                    <Route path="seating" element={<SeatingPlans />} />
                    <Route path="invigilators" element={<Invigilators />} />
                    <Route path="attendance" element={<Attendance />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="change-password" element={<ChangePassword />} />

                    {/* Root Admin Only Routes */}
                    <Route element={<RequireRoot />}>
                        <Route path="manage-admins" element={<ManageAdmins />} />
                        <Route path="structure" element={<CollegeStructure />} />
                        <Route path="control" element={<ExamControl />} />
                        <Route path="settings" element={<SystemSettings />} />
                        <Route path="logs" element={<ActivityLogs />} />
                        <Route path="notifications" element={<Notifications />} />
                        <Route path="security" element={<Security />} />
                    </Route>
                </Route>
            </Route>

            {/* Catch all for admin (optional) */}
            <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
    );
};

export default AdminApp;
