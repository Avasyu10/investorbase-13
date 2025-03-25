import React from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/auth-context';
import { ProtectedRoute } from '@/components/protected-route';
import { RealtimeSubscriptions } from '@/components/RealtimeSubscriptions';

// Pages
import HomePage from '@/pages/home';
import LoginPage from '@/pages/login';
import SignupPage from '@/pages/signup';
import DashboardPage from '@/pages/dashboard';
import ReportPage from '@/pages/report';
import UploadPage from '@/pages/upload';
import PublicUploadPage from '@/pages/public-upload';
import SettingsPage from '@/pages/settings';
import NotFoundPage from '@/pages/not-found';

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <RealtimeSubscriptions />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/public-upload" element={<PublicUploadPage />} />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
          <Route path="/report/:id" element={
            <ProtectedRoute>
              <ReportPage />
            </ProtectedRoute>
          } />
          <Route path="/upload" element={
            <ProtectedRoute>
              <UploadPage />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } />
          
          {/* 404 route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
