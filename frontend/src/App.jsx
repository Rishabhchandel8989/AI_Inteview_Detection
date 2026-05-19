import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';

import CandidateView from './pages/CandidateView';
import SessionHistory from './pages/SessionHistory'; // Now Interviewee Dashboard
import ProctorDashboard from './pages/ProctorDashboard';
import ReportPage from './pages/ReportPage';
import InterviewerDashboard from './pages/InterviewerDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="text-white p-8">Loading session...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect generic based on role
    if (user.role === 'super_admin') return <Navigate to="/admin" />;
    if (user.role === 'interviewer') return <Navigate to="/interviewer" />;
    return <Navigate to="/interviewee" />;
  }

  return children;
};

// Redirect authenticated users to their role-based dashboard
const DefaultRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="text-white p-8">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'super_admin') return <Navigate to="/admin" />;
  if (user.role === 'interviewer') return <Navigate to="/interviewer" />;
  return <Navigate to="/interviewee" />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Default Route */}
          <Route path="/" element={<DefaultRoute />} />

          {/* Super Admin Routes */}
          <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <SuperAdminDashboard />
            </ProtectedRoute>
          } />

          {/* Interviewer Routes — specific routes MUST come before the wildcard */}
          <Route path="/interviewer/proctor/:id" element={
            <ProtectedRoute allowedRoles={['interviewer', 'super_admin']}>
              <ProctorDashboard />
            </ProtectedRoute>
          } />
          <Route path="/interviewer/report/:id" element={
            <ProtectedRoute allowedRoles={['interviewer', 'super_admin']}>
              <ReportPage />
            </ProtectedRoute>
          } />
          <Route path="/interviewer" element={
            <ProtectedRoute allowedRoles={['interviewer', 'super_admin']}>
              <InterviewerDashboard />
            </ProtectedRoute>
          } />

          {/* Interviewee Routes */}
          <Route path="/interviewee" element={
            <ProtectedRoute allowedRoles={['interviewee']}>
              <SessionHistory /> {/* Will be modified to Join Gateway */}
            </ProtectedRoute>
          } />
          <Route path="/interviewee/room/:id" element={
            <ProtectedRoute allowedRoles={['interviewee', 'interviewer', 'super_admin']}>
              <CandidateView />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
