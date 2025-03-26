
import React from 'react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { RealtimeSubscriptions } from '@/components/RealtimeSubscriptions';
import { Navbar } from '@/components/layout/Navbar';

// Pages
import Index from '@/pages/Index';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Dashboard from '@/pages/Dashboard';
import Report from '@/pages/Report';
import UploadReport from '@/pages/UploadReport';
import PublicUpload from '@/pages/PublicUpload';
import Profile from '@/pages/Profile';
import NotFound from '@/pages/NotFound';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Feedback from '@/pages/Feedback';
import CompanyPage from '@/pages/CompanyPage';
import SectionPage from '@/pages/SectionPage';
import ProfileEdit from '@/pages/ProfileEdit';
import ProfileSetup from '@/pages/ProfileSetup';
import AnalysisSummary from '@/pages/AnalysisSummary';
import SupplementaryMaterials from '@/pages/SupplementaryMaterials';

function App() {
  const { user, isLoading } = useAuth();

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <RealtimeSubscriptions />
      <Navbar />
      <main className="min-h-screen">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/public-upload" element={<PublicUpload />} />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<UploadReport />} />
          <Route path="/report/:id" element={<Report />} />
          <Route path="/company/:id" element={<CompanyPage />} />
          <Route path="/section/:id" element={<SectionPage />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/edit" element={<ProfileEdit />} />
          <Route path="/profile/setup" element={<ProfileSetup />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/analysis/:id" element={<AnalysisSummary />} />
          <Route path="/materials/:id" element={<SupplementaryMaterials />} />
          
          {/* 404 route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
