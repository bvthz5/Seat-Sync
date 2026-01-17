import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './hooks/useAuth';
import AdminApp from './apps/admin/AdminApp';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} /> {/* Redirect root to admin for now */}

          <Route path="/admin/*" element={<AdminApp />} />

          {/* Placeholders for other apps */}
          <Route path="/student/*" element={<div>Student App Placeholder</div>} />
          <Route path="/invigilator/*" element={<div>Invigilator App Placeholder</div>} />

          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
        <Toaster position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
