import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from "@/components/theme-provider"
import { QueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster"
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';
import Dashboard from '@/pages/Dashboard';
import Companies from '@/pages/Companies';
import CompanyDetails from '@/components/companies/CompanyDetails';
import CompanyOverviewPage from '@/pages/CompanyOverviewDetailPage';
import CompanyOverviewPageOld from '@/pages/CompanyOverviewPage';
import Reports from '@/pages/Reports';
import ReportViewer from '@/components/reports/ReportViewer';
import Profile from '@/pages/Profile';
import Feedback from '@/pages/Feedback';
import PublicSubmissions from '@/pages/PublicSubmissions';
import Analysis from '@/pages/Analysis';
import BarcForm from '@/pages/BarcForm';
import BarcAnalysis from '@/pages/BarcAnalysis';
import SupplementaryMaterials from '@/pages/SupplementaryMaterials';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RealtimeSubscriptions } from '@/components/realtime/RealtimeSubscriptions';
import { RealtimeEmailListener } from '@/components/realtime/RealtimeEmailListener';

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <QueryClient>
        <BrowserRouter>
          <div className="min-h-screen bg-background text-foreground">
            <RealtimeSubscriptions />
            <RealtimeEmailListener />
            <Toaster />
            <Routes>
              {/* Authentication Routes */}
              <Route path="/login" element={<LoginForm />} />
              <Route path="/signup" element={<SignupForm />} />
              
              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/companies" element={<Companies />} />
                <Route path="/company/:id" element={<CompanyDetails />} />
                <Route path="/company/:id/overview" element={<CompanyOverviewPage />} />
                <Route path="/company/:id/section/:sectionId" element={<CompanyOverviewPageOld />} />
                <Route path="/company/:id/supplementary" element={<SupplementaryMaterials />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/reports/:id" element={<ReportViewer />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/setup" element={<Profile />} />
                <Route path="/feedback" element={<Feedback />} />
                <Route path="/public-submissions" element={<PublicSubmissions />} />
                <Route path="/analysis/:reportId" element={<Analysis />} />
                <Route path="/barc-form/:slug" element={<BarcForm />} />
                <Route path="/barc-analysis/:submissionId" element={<BarcAnalysis />} />
              </Route>
            </Routes>
          </div>
        </BrowserRouter>
      </QueryClient>
    </ThemeProvider>
  );
}

export default App;
