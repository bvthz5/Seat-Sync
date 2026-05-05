import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import AdminApp from './apps/admin/AdminApp';
import InvigilatorLogin from './apps/invigilator/pages/InvigilatorLogin';
import InvigilatorDashboard from './apps/invigilator/pages/InvigilatorDashboard';
import AttendanceConsole from './apps/invigilator/pages/AttendanceConsole';
import InvigilatorProfile from './apps/invigilator/pages/InvigilatorProfile';
import ActivateAccountPage from './apps/invigilator/pages/ActivateAccountPage';
import InvigilatorRequest from './apps/invigilator/pages/InvigilatorRequest';
import LandingPage from './pages/LandingPage';
import NotFound from './pages/NotFound';
import RequireAuth from './components/RequireAuth';
import StudentApp from './apps/student/StudentApp';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="/invigilator/login" element={<InvigilatorLogin />} />
          <Route path="/activate" element={<ActivateAccountPage />} />
          <Route path="/faculty/activate" element={<ActivateAccountPage />} />
          <Route path="/invigilator/activate" element={<ActivateAccountPage />} />
          <Route path="/invigilator/request" element={<InvigilatorRequest />} />
          <Route element={<RequireAuth allowedRoles={['invigilator']} redirectTo="/invigilator/login" />}>
            <Route path="/invigilator/dashboard" element={<InvigilatorDashboard />} />
            <Route path="/invigilator/attendance/:id?" element={<AttendanceConsole />} />
            <Route path="/invigilator/profile" element={<InvigilatorProfile />} />
          </Route>
          <Route path="/student/*" element={<StudentApp />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
