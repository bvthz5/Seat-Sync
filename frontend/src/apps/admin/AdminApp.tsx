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
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ChangePassword from './pages/ChangePassword';
import Students from './pages/Students';
import CollegeStructure from './pages/CollegeStructure';
import RequireAuth from '../../components/RequireAuth';
import RequireRoot from './components/RequireRoot';

// New ERP Pages
import AdminManagement from './pages/AdminManagement';
import AcademicSetup from './pages/AcademicSetup';
import Notifications from './pages/Notifications';
import Security from './pages/Security';
import ExamControl from './pages/ExamControl';
import AuditLogs from './pages/AuditLogs';

const AdminApp: React.FC = () => {
    return (
        <Routes>
            <Route path="login" element={<Login />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password" element={<ResetPassword />} />

            <Route element={<RequireAuth />}>
                <Route element={<AdminLayout />}>
                    <Route index element={<Navigate to="dashboard" replace />} />

                    {/* PRIMARY OPERATIONS - All Exam Admins */}
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="students" element={<Students />} />
                    <Route path="exams" element={<Exams />} />
                    <Route path="seating" element={<SeatingPlans />} />
                    <Route path="invigilators" element={<Invigilators />} />
                    <Route path="attendance" element={<Attendance />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="change-password" element={<ChangePassword />} />

                    {/* ADMINISTRATION SECTION - Root Admin Only */}
                    <Route element={<RequireRoot />}>
                        <Route path="admin-management" element={<AdminManagement />} />
                        <Route path="college-structure" element={<CollegeStructure />} />
                        <Route path="academic-setup" element={<AcademicSetup />} />
                        <Route path="exam-control" element={<ExamControl />} />
                        <Route path="notifications" element={<Notifications />} />
                        <Route path="audit-logs" element={<AuditLogs />} />
                        <Route path="security" element={<Security />} />
                    </Route>
                </Route>
            </Route>

            {/* Catch all for admin */}
            <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
    );
};

export default AdminApp;
