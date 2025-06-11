
import { Routes, Route } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "@/pages/Index";
import Dashboard from "@/pages/Dashboard";
import UploadReport from "@/pages/UploadReport";
import Report from "@/pages/Report";
import CompanyPage from "@/pages/CompanyPage";
import SectionPage from "@/pages/SectionPage";
import PublicUpload from "@/pages/PublicUpload";
import BarcSubmit from "@/pages/BarcSubmit";
import CompanyDetailPage from "@/pages/CompanyDetailPage";
import CompanyOverviewPage from "@/pages/CompanyOverviewPage";
import AnalysisSummary from "@/pages/AnalysisSummary";
import Profile from "@/pages/Profile";
import ProfileEdit from "@/pages/ProfileEdit";
import ProfileSetup from "@/pages/ProfileSetup";
import Feedback from "@/pages/Feedback";
import NotFound from "@/pages/NotFound";
import Admin from "@/pages/Admin";
import PublicForms from "@/pages/PublicForms";
import NewsFeed from "@/pages/NewsFeed";
import EmailTest from "@/pages/EmailTest";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import SupplementaryMaterials from "@/pages/SupplementaryMaterials";

export function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/public-upload/:slug" element={<PublicUpload />} />
        <Route path="/barc-submit/:slug" element={<BarcSubmit />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/upload" element={
          <ProtectedRoute>
            <UploadReport />
          </ProtectedRoute>
        } />
        <Route path="/report/:id" element={
          <ProtectedRoute>
            <Report />
          </ProtectedRoute>
        } />
        <Route path="/company/:id" element={
          <ProtectedRoute>
            <CompanyPage />
          </ProtectedRoute>
        } />
        <Route path="/company/:companyId/section/:sectionId" element={
          <ProtectedRoute>
            <SectionPage />
          </ProtectedRoute>
        } />
        <Route path="/company-detail/:id" element={
          <ProtectedRoute>
            <CompanyDetailPage />
          </ProtectedRoute>
        } />
        <Route path="/company-overview/:id" element={
          <ProtectedRoute>
            <CompanyOverviewPage />
          </ProtectedRoute>
        } />
        <Route path="/analysis-summary/:id" element={
          <ProtectedRoute>
            <AnalysisSummary />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="/profile/edit" element={
          <ProtectedRoute>
            <ProfileEdit />
          </ProtectedRoute>
        } />
        <Route path="/profile/setup" element={
          <ProtectedRoute>
            <ProfileSetup />
          </ProtectedRoute>
        } />
        <Route path="/feedback" element={
          <ProtectedRoute>
            <Feedback />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute>
            <Admin />
          </ProtectedRoute>
        } />
        <Route path="/public-forms" element={
          <ProtectedRoute>
            <PublicForms />
          </ProtectedRoute>
        } />
        <Route path="/news-feed" element={
          <ProtectedRoute>
            <NewsFeed />
          </ProtectedRoute>
        } />
        <Route path="/email-test" element={
          <ProtectedRoute>
            <EmailTest />
          </ProtectedRoute>
        } />
        <Route path="/supplementary-materials/:companyId" element={
          <ProtectedRoute>
            <SupplementaryMaterials />
          </ProtectedRoute>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
