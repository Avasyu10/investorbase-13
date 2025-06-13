
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from "@/components/ThemeProvider"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster"
import LoginForm from '@/components/auth/LoginForm';
import SignupForm from '@/components/auth/SignupForm';
import Dashboard from '@/pages/Dashboard';
import CompanyDetails from '@/components/companies/CompanyDetails';
import CompanyOverviewPage from '@/pages/CompanyOverviewDetailPage';
import CompanyOverviewPageOld from '@/pages/CompanyOverviewPage';
import Profile from '@/pages/Profile';
import Feedback from '@/pages/Feedback';
import BarcSubmissions from '@/pages/BarcSubmissions';
import SupplementaryMaterials from '@/pages/SupplementaryMaterials';
import ProtectedRoute from '@/components/ProtectedRoute';
import ReportViewerPage from '@/components/reports/ReportViewerPage';

const queryClient = new QueryClient();

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <div className="min-h-screen bg-background text-foreground">
            <Toaster />
            <Routes>
              {/* Authentication Routes */}
              <Route path="/login" element={<LoginForm />} />
              <Route path="/signup" element={<SignupForm />} />
              
              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/company/:id" element={<CompanyDetails />} />
                <Route path="/company/:id/overview" element={<CompanyOverviewPage />} />
                <Route path="/company/:id/section/:sectionId" element={<CompanyOverviewPageOld />} />
                <Route path="/company/:id/supplementary" element={<SupplementaryMaterials />} />
                <Route path="/reports/:id" element={<ReportViewerPage />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/setup" element={<Profile />} />
                <Route path="/feedback" element={<Feedback />} />
                <Route path="/barc-submissions" element={<BarcSubmissions />} />
              </Route>
            </Routes>
          </div>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
