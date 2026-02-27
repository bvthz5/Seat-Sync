import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './hooks/useAuth';
import AdminApp from './apps/admin/AdminApp';
import InvigilatorLogin from './apps/invigilator/pages/InvigilatorLogin';
import InvigilatorDashboard from './apps/invigilator/pages/InvigilatorDashboard';
import AttendanceConsole from './apps/invigilator/pages/AttendanceConsole';
import InvigilatorProfile from './apps/invigilator/pages/InvigilatorProfile';
import LandingPage from './pages/LandingPage';
import NotFound from './pages/NotFound';
import RequireAuth from './components/RequireAuth';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />

          {/* Admin App */}
          <Route path="/admin/*" element={<AdminApp />} />

          {/* Invigilator App */}
          <Route path="/invigilator/login" element={<InvigilatorLogin />} />
          <Route element={<RequireAuth allowedRoles={['invigilator']} redirectTo="/invigilator/login" />}>
            <Route path="/invigilator/dashboard" element={<InvigilatorDashboard />} />
            <Route path="/invigilator/attendance" element={<AttendanceConsole />} />
            <Route path="/invigilator/profile" element={<InvigilatorProfile />} />
          </Route>

          {/* Placeholders for other apps */}
          <Route path="/student/*" element={<div>Student App Placeholder</div>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
