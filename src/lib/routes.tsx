import Index from "@/pages/Index";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import UploadReport from "@/pages/UploadReport";
import Report from "@/pages/Report";
import CompanyPage from "@/pages/CompanyPage";
import SectionPage from "@/pages/SectionPage";
import SupplementaryMaterials from "@/pages/SupplementaryMaterials";
import PublicUpload from "@/pages/PublicUpload";
import AnalysisSummary from "@/pages/AnalysisSummary";
import NotFound from "@/pages/NotFound";
import ProtectedRoute from "@/components/ProtectedRoute";
import Profile from "@/pages/Profile";
import ProfileEdit from "@/pages/ProfileEdit";
import ProfileSetup from "@/pages/ProfileSetup";
import Feedback from "@/pages/Feedback";
import CompanyOverviewPage from "@/pages/CompanyOverviewPage";
import NewsFeed from "@/pages/NewsFeed";
import EmailTest from "@/pages/EmailTest";
import CompanyDetailPage from "@/pages/CompanyDetailPage";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Admin from "@/pages/Admin";
import PublicForms from "@/pages/PublicForms";

const routes = [
  {
    path: "/",
    element: <Index />,
  },
  {
    path: "/signup",
    element: <Signup />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />,
  },
  {
    path: "/reset-password",
    element: <ResetPassword />,
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/upload",
    element: (
      <ProtectedRoute>
        <UploadReport />
      </ProtectedRoute>
    ),
  },
  {
    path: "/report/:reportId",
    element: (
      <ProtectedRoute>
        <Report />
      </ProtectedRoute>
    ),
  },
  {
    path: "/reports/:id",
    element: (
      <ProtectedRoute>
        <Report />
      </ProtectedRoute>
    ),
  },
  {
    path: "/company/:id",
    element: (
      <ProtectedRoute>
        <CompanyPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/company/:companyId/section/:sectionId",
    element: (
      <ProtectedRoute>
        <SectionPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/company/:companyId/supplementary",
    element: (
      <ProtectedRoute>
        <SupplementaryMaterials />
      </ProtectedRoute>
    ),
  },
  {
    path: "/public-upload",
    element: <PublicUpload />,
  },
  {
    path: "/public-upload/:formSlug",
    element: <PublicUpload />,
  },
  {
    path: "/public-forms",
    element: (
      <ProtectedRoute>
        <PublicForms />
      </ProtectedRoute>
    ),
  },
  {
    path: "/company/:companyId/analysis",
    element: (
      <ProtectedRoute>
        <AnalysisSummary />
      </ProtectedRoute>
    ),
  },
  {
    path: "/profile",
    element: (
      <ProtectedRoute>
        <Profile />
      </ProtectedRoute>
    ),
  },
  {
    path: "/profile/edit",
    element: (
      <ProtectedRoute>
        <ProfileEdit />
      </ProtectedRoute>
    ),
  },
  {
    path: "/profile/setup",
    element: (
      <ProtectedRoute>
        <ProfileSetup />
      </ProtectedRoute>
    ),
  },
  {
    path: "/feedback",
    element: (
      <ProtectedRoute>
        <Feedback />
      </ProtectedRoute>
    ),
  },
  {
    path: "/company/:companyId/overview",
    element: (
      <ProtectedRoute>
        <CompanyOverviewPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/news-feed",
    element: <NewsFeed />,
  },
  {
    path: "/email-test",
    element: (
      <ProtectedRoute>
        <EmailTest />
      </ProtectedRoute>
    ),
  },
  {
    path: "/company-detail-page",
    element: (
      <ProtectedRoute>
        <CompanyDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/company-detail-page/:id",
    element: (
      <ProtectedRoute>
        <CompanyDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute>
        <Admin />
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    element: <NotFound />,
  }
];

export { routes };
