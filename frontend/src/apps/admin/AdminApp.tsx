import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './layout/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Exams from './pages/Exams';
import SeriesSelection from './pages/SeriesSelection';
import ExamSeriesList from './pages/ExamSeriesList';
import SeatingPlans from './pages/SeatingPlans';
import InternalSeatingPage from './pages/InternalSeatingPage';
import Invigilators from './pages/Invigilators';
import InvigilatorAssign from './pages/InvigilatorAssign';
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';


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
import ExamDates from './pages/ExamDates';
import ExamDateDetail from './pages/ExamDateDetail';
import AuditLogs from './pages/AuditLogs';
import DataCleanup from './pages/DataCleanup';
import Profile from './pages/Profile';
import NotFound from '../../pages/NotFound';
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
                    <Route path="profile" element={<Profile />} />
                    <Route path="students" element={<Students />} />
                    <Route path="exams" element={<SeriesSelection />} />
                    <Route path="exams/series/:seriesId" element={<ExamSeriesList />} />
                    <Route path="exams/series/:seriesId/dates" element={<ExamDates />} />
                    <Route path="exams/series/:seriesId/dates/:date" element={<ExamDateDetail />} />
                    <Route path="seating/endsem" element={<SeatingPlans />} />
                    <Route path="seating/internal" element={<InternalSeatingPage />} />
                    <Route path="invigilators" element={<Invigilators />} />
                    <Route path="invigilators/assign" element={<InvigilatorAssign />} />
                    <Route path="attendance" element={<Attendance />} />
                    <Route path="reports" element={<Reports />} />



                    {/* ADMINISTRATION SECTION - Root Admin Only */}
                    <Route element={<RequireRoot />}>
                        <Route path="admin-management" element={<AdminManagement />} />
                        <Route path="college-structure" element={<CollegeStructure />} />
                        <Route path="academic-setup" element={<AcademicSetup />} />
                        <Route path="exam-control" element={<ExamControl />} />
                        <Route path="notifications" element={<Notifications />} />
                        <Route path="audit-logs" element={<AuditLogs />} />
                        <Route path="security" element={<Security />} />
                        <Route path="data-cleanup" element={<DataCleanup />} />
                    </Route>
                </Route>
            </Route>

            {/* Catch all for admin */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
};

export default AdminApp;
