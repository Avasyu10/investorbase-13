
import { RouteObject } from "react-router-dom";
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

export const routes: RouteObject[] = [
  { path: "/", element: <Index /> },
  { path: "/signup", element: <Signup /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/reset-password", element: <ResetPassword /> },
  { path: "/public-upload/:slug", element: <PublicUpload /> },
  { path: "/public-upload", element: <PublicUpload /> },
  { path: "/submit/:slug", element: <BarcSubmit /> },
  { 
    path: "/dashboard", 
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    )
  },
  { 
    path: "/upload", 
    element: (
      <ProtectedRoute>
        <UploadReport />
      </ProtectedRoute>
    )
  },
  { 
    path: "/report/:id", 
    element: (
      <ProtectedRoute>
        <Report />
      </ProtectedRoute>
    )
  },
  { 
    path: "/company/:id", 
    element: (
      <ProtectedRoute>
        <CompanyPage />
      </ProtectedRoute>
    )
  },
  { 
    path: "/company/:companyId/section/:sectionId", 
    element: (
      <ProtectedRoute>
        <SectionPage />
      </ProtectedRoute>
    )
  },
  { 
    path: "/company-detail/:id", 
    element: (
      <ProtectedRoute>
        <CompanyDetailPage />
      </ProtectedRoute>
    )
  },
  { 
    path: "/company-overview/:id", 
    element: (
      <ProtectedRoute>
        <CompanyOverviewPage />
      </ProtectedRoute>
    )
  },
  { 
    path: "/analysis-summary/:id", 
    element: (
      <ProtectedRoute>
        <AnalysisSummary />
      </ProtectedRoute>
    )
  },
  { 
    path: "/profile", 
    element: (
      <ProtectedRoute>
        <Profile />
      </ProtectedRoute>
    )
  },
  { 
    path: "/profile/edit", 
    element: (
      <ProtectedRoute>
        <ProfileEdit />
      </ProtectedRoute>
    )
  },
  { 
    path: "/profile/setup", 
    element: (
      <ProtectedRoute>
        <ProfileSetup />
      </ProtectedRoute>
    )
  },
  { 
    path: "/feedback", 
    element: (
      <ProtectedRoute>
        <Feedback />
      </ProtectedRoute>
    )
  },
  { 
    path: "/admin", 
    element: (
      <ProtectedRoute>
        <Admin />
      </ProtectedRoute>
    )
  },
  { 
    path: "/public-forms", 
    element: (
      <ProtectedRoute>
        <PublicForms />
      </ProtectedRoute>
    )
  },
  { 
    path: "/barc-submissions", 
    element: (
      <ProtectedRoute>
        <BarcSubmissions />
      </ProtectedRoute>
    )
  },
  { 
    path: "/news-feed", 
    element: (
      <ProtectedRoute>
        <NewsFeed />
      </ProtectedRoute>
    )
  },
  { 
    path: "/email-test", 
    element: (
      <ProtectedRoute>
        <EmailTest />
      </ProtectedRoute>
    )
  },
  { 
    path: "/supplementary-materials/:companyId", 
    element: (
      <ProtectedRoute>
        <SupplementaryMaterials />
      </ProtectedRoute>
    )
  },
  { path: "*", element: <NotFound /> }
];
