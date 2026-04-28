import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import StudentLogin from './pages/StudentLogin';
import StudentRegister from './pages/StudentRegister';
import StudentForgotPassword from './pages/StudentForgotPassword';
import StudentResetPassword from './pages/StudentResetPassword';
import StudentChangePassword from './pages/StudentChangePassword';
import StudentDashboard from './pages/StudentDashboard';
import StudentExams from './pages/StudentExams';
import StudentSeating from './pages/StudentSeating';
import StudentHistory from './pages/StudentHistory';
import StudentProfile from './pages/StudentProfile';
import StudentLayout from './components/StudentLayout';
import RequireAuth from '../../components/RequireAuth';

const StudentApp: React.FC = () => {
  return (
    <Routes>
      <Route index element={<Navigate to="login" replace />} />

      {/* Auth Routes */}
      <Route path="login" element={<StudentLogin />} />
      <Route path="register" element={<StudentRegister />} />
      <Route path="forgot-password" element={<StudentForgotPassword />} />
      <Route path="reset-password" element={<StudentResetPassword />} />
      <Route path="change-password" element={<StudentChangePassword />} />

      {/* Authenticated Student Routes */}
      <Route element={<RequireAuth allowedRoles={['student']} redirectTo="/student/login" />}>
        <Route element={<StudentLayout />}>
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="exams" element={<StudentExams />} />
          <Route path="seating" element={<StudentSeating />} />
          <Route path="seating/:examId" element={<StudentSeating />} />
          <Route path="history" element={<StudentHistory />} />
          <Route path="notifications" element={<div>Notifications Page (Coming Soon)</div>} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="settings" element={<div>Settings Page (Coming Soon)</div>} />
        </Route>
      </Route>

      {/* Default route */}
      <Route path="*" element={<Navigate to="login" replace />} />
    </Routes>
  );
};

export default StudentApp;
