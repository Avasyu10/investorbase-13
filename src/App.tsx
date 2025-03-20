
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Toaster } from 'sonner';
import { useAuth } from './hooks/useAuth';
import Navbar from './components/layout/Navbar';
import Index from './pages/Index';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import ProfileEdit from './pages/ProfileEdit';
import ProfileSetup from './pages/ProfileSetup';
import CompanyPage from './pages/CompanyPage';
import SectionPage from './pages/SectionPage';
import AnalysisSummary from './pages/AnalysisSummary';
import Report from './pages/Report';
import SupplementaryMaterials from './pages/SupplementaryMaterials';
import NotFound from './pages/NotFound';
import UploadReport from './pages/UploadReport';
import PublicUpload from './pages/PublicUpload';
import ManagePublicForms from './pages/ManagePublicForms';
import PublicFormUpload from './pages/PublicFormUpload';

function App() {
  const { isLoading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <BrowserRouter>
      <ThemeProvider defaultTheme="light" storageKey="lovable-demo-theme">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/upload" element={<UploadReport />} />
            <Route path="/manage-forms" element={<ManagePublicForms />} />
            <Route path="/public-upload" element={<PublicUpload />} />
            <Route path="/public-form/:slug" element={<PublicFormUpload />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/edit" element={<ProfileEdit />} />
            <Route path="/profile/setup" element={<ProfileSetup />} />
            <Route path="/company/:id" element={<CompanyPage />} />
            <Route path="/company/:companyId/section/:sectionId" element={<SectionPage />} />
            <Route path="/company/:companyId/summary" element={<AnalysisSummary />} />
            <Route path="/report/:id" element={<Report />} />
            <Route path="/report/:id/materials" element={<SupplementaryMaterials />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Toaster />
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
