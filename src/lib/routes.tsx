
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "@/pages/Index";
import Dashboard from "@/pages/Dashboard";
import UploadReport from "@/pages/UploadReport";
import Report from "@/pages/Report";
import CompanyPage from "@/pages/CompanyPage";
import SectionPage from "@/pages/SectionPage";
import PublicUpload from "@/pages/PublicUpload";
import BarcSubmit from "@/pages/BarcSubmit";
import BarcSubmissions from "@/pages/BarcSubmissions";
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

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Index />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/public-upload/:slug" element={<PublicUpload />} />
      <Route path="/public-upload" element={<PublicUpload />} />
      <Route path="/barc-submit/:slug" element={<BarcSubmit />} />
      
      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload" element={<UploadReport />} />
        <Route path="/report/:id" element={<Report />} />
        <Route path="/company/:id" element={<CompanyPage />} />
        <Route path="/company/:companyId/section/:sectionId" element={<SectionPage />} />
        <Route path="/company-detail/:id" element={<CompanyDetailPage />} />
        <Route path="/company-overview/:id" element={<CompanyOverviewPage />} />
        <Route path="/analysis-summary/:id" element={<AnalysisSummary />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/edit" element={<ProfileEdit />} />
        <Route path="/profile/setup" element={<ProfileSetup />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/public-forms" element={<PublicForms />} />
        <Route path="/barc-submissions" element={<BarcSubmissions />} />
        <Route path="/news-feed" element={<NewsFeed />} />
        <Route path="/email-test" element={<EmailTest />} />
        <Route path="/supplementary-materials/:companyId" element={<SupplementaryMaterials />} />
      </Route>
      
      {/* 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// Export the routes array for backward compatibility if needed elsewhere
export const routes = [
  { path: "/", element: <Index /> },
  { path: "/signup", element: <Signup /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/reset-password", element: <ResetPassword /> },
  { path: "/public-upload/:slug", element: <PublicUpload /> },
  { path: "/public-upload", element: <PublicUpload /> },
  { path: "/barc-submit/:slug", element: <BarcSubmit /> },
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/upload", element: <UploadReport /> },
  { path: "/report/:id", element: <Report /> },
  { path: "/company/:id", element: <CompanyPage /> },
  { path: "/company/:companyId/section/:sectionId", element: <SectionPage /> },
  { path: "/company-detail/:id", element: <CompanyDetailPage /> },
  { path: "/company-overview/:id", element: <CompanyOverviewPage /> },
  { path: "/analysis-summary/:id", element: <AnalysisSummary /> },
  { path: "/profile", element: <Profile /> },
  { path: "/profile/edit", element: <ProfileEdit /> },
  { path: "/profile/setup", element: <ProfileSetup /> },
  { path: "/feedback", element: <Feedback /> },
  { path: "/admin", element: <Admin /> },
  { path: "/public-forms", element: <PublicForms /> },
  { path: "/barc-submissions", element: <BarcSubmissions /> },
  { path: "/news-feed", element: <NewsFeed /> },
  { path: "/email-test", element: <EmailTest /> },
  { path: "/supplementary-materials/:companyId", element: <SupplementaryMaterials /> },
  { path: "*", element: <NotFound /> }
];
