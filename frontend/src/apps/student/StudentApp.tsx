import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import StudentLogin from './pages/StudentLogin';
import StudentRegister from './pages/StudentRegister';
import StudentForgotPassword from './pages/StudentForgotPassword';
import StudentResetPassword from './pages/StudentResetPassword';

// Student Auth & Dashboard Router

const StudentApp: React.FC = () => {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="login" element={<StudentLogin />} />
      <Route path="register" element={<StudentRegister />} />
      <Route path="forgot-password" element={<StudentForgotPassword />} />
      <Route path="reset-password" element={<StudentResetPassword />} />

      {/* Dashboard Placeholder (Protected) */}
      <Route path="dashboard" element={<div>Student Dashboard (Protected)</div>} />

      {/* Default route */}
      <Route path="*" element={<Navigate to="login" replace />} />
    </Routes>
  );
};

export default StudentApp;
