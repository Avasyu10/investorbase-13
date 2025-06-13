
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ThemeProvider } from "@/components/ThemeProvider"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster"
import LoginForm from '@/components/auth/LoginForm';
import SignupForm from '@/components/auth/SignupForm';
import Dashboard from '@/pages/Dashboard';
import CompanyDetails from '@/components/companies/CompanyDetails';
import CompanyOverviewPage from '@/pages/CompanyOverviewDetailPage';
import CompanyOverviewPageOld from '@/pages/CompanyOverviewPage';
import { ReportViewer } from '@/components/reports/ReportViewer';
import Profile from '@/pages/Profile';
import Feedback from '@/pages/Feedback';
import ProtectedRoute from '@/components/ProtectedRoute';

const queryClient = new QueryClient();

// Wrapper component to extract reportId from URL params
const ReportViewerWrapper = () => {
  const { id } = useParams<{ id: string }>();
  return <ReportViewer reportId={id || ''} />;
};

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
                <Route path="/reports/:id" element={<ReportViewerWrapper />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/setup" element={<Profile />} />
                <Route path="/feedback" element={<Feedback />} />
              </Route>
            </Routes>
          </div>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
