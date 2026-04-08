import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import StudentLogin from './pages/StudentLogin';
import StudentRegister from './pages/StudentRegister';
import StudentForgotPassword from './pages/StudentForgotPassword';
import StudentResetPassword from './pages/StudentResetPassword';
import StudentDashboard from './pages/StudentDashboard';
import RequireAuth from '../../components/RequireAuth';

// Student Auth & Dashboard Router

const StudentApp: React.FC = () => {
  return (
    <Routes>
      <Route index element={<Navigate to="login" replace />} />

      {/* Auth Routes */}
      <Route path="login" element={<StudentLogin />} />
      <Route path="register" element={<StudentRegister />} />
      <Route path="forgot-password" element={<StudentForgotPassword />} />
      <Route path="reset-password" element={<StudentResetPassword />} />

      {/* Dashboard */}
      <Route element={<RequireAuth allowedRoles={['student']} redirectTo="/student/login" />}>
        <Route path="dashboard" element={<StudentDashboard />} />
      </Route>

      {/* Default route */}
      <Route path="*" element={<Navigate to="login" replace />} />
    </Routes>
  );
};

export default StudentApp;
