import { createBrowserRouter } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ThemeProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "@/pages/Index";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import ProfileSetup from "@/pages/ProfileSetup";
import ProfileEdit from "@/pages/ProfileEdit";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import GetStarted from "@/pages/GetStarted";
import CompanyPage from "@/pages/CompanyPage";
import CompanyDetails from "@/pages/CompanyDetails";
import CompanyDetailPage from "@/pages/CompanyDetailPage";
import CompanyOverviewPage from "@/pages/CompanyOverviewPage";
import SectionPage from "@/pages/SectionPage";
import UploadReport from "@/pages/UploadReport";
import Report from "@/pages/Report";
import PublicUpload from "@/pages/PublicUpload";
import PublicForms from "@/pages/PublicForms";
import ThankYou from "@/pages/ThankYou";
import BarcSubmit from "@/pages/BarcSubmit";
import BarcSubmissions from "@/pages/BarcSubmissions";
import EurekaSample from "@/pages/EurekaSample";
import EurekaIframe from "@/pages/EurekaIframe";
import Admin from "@/pages/Admin";
import Feedback from "@/pages/Feedback";
import NewsFeed from "@/pages/NewsFeed";
import AnalysisSummary from "@/pages/AnalysisSummary";
import SupplementaryMaterials from "@/pages/SupplementaryMaterials";
import NotFound from "@/pages/NotFound";
import EmailTest from "@/pages/EmailTest";

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <div className="min-h-screen">
          <Toaster />
        </div>
      </ThemeProvider>
    ),
    children: [
      {
        path: "/",
        element: <Index />,
      },
      {
        path: "/get-started",
        element: <GetStarted />,
      },
      {
        path: "/signup",
        element: <Signup />,
      },
      {
        path: "/login",
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
        path: "/profile",
        element: (
          <ProtectedRoute>
            <Profile />
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
        path: "/profile/edit",
        element: (
          <ProtectedRoute>
            <ProfileEdit />
          </ProtectedRoute>
        ),
      },
      {
        path: "/company/:companyId",
        element: (
          <ProtectedRoute>
            <CompanyPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/company/:companyId/details",
        element: (
          <ProtectedRoute>
            <CompanyDetails />
          </ProtectedRoute>
        ),
      },
      {
        path: "/company/:companyId/detail/:detailId",
        element: (
          <ProtectedRoute>
            <CompanyDetailPage />
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
        path: "/company/:companyId/section/:sectionId",
        element: (
          <ProtectedRoute>
            <SectionPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/company/:companyId/upload",
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
        path: "/submit/public",
        element: <PublicUpload />,
      },
      {
        path: "/submit/public/:slug",
        element: <PublicForms />,
      },
      {
        path: "/thank-you",
        element: <ThankYou />,
      },
      {
        path: "/submit/barc",
        element: <BarcSubmit />,
      },
      {
        path: "/barc-submissions",
        element: (
          <ProtectedRoute>
            <BarcSubmissions />
          </ProtectedRoute>
        ),
      },
      {
        path: "/submit/eureka-sample",
        element: (
          <ProtectedRoute>
            <EurekaSample />
          </ProtectedRoute>
        ),
      },
      {
        path: "/eureka-iframe/:slug",
        element: <EurekaIframe />,
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
        path: "/feedback",
        element: (
          <ProtectedRoute>
            <Feedback />
          </ProtectedRoute>
        ),
      },
      {
        path: "/newsfeed",
        element: (
          <ProtectedRoute>
            <NewsFeed />
          </ProtectedRoute>
        ),
      },
      {
        path: "/analysis-summary/:companyId",
        element: (
          <ProtectedRoute>
            <AnalysisSummary />
          </ProtectedRoute>
        ),
      },
      {
        path: "/supplementary-materials/:companyId",
        element: (
          <ProtectedRoute>
            <SupplementaryMaterials />
          </ProtectedRoute>
        ),
      },
      {
        path: "/email-test",
        element: <EmailTest />,
      },
      {
        path: "*",
        element: <NotFound />,
      },

      // Public embedded Eureka form (no authentication required)
      {
        path: "/embed/eureka",
        element: <EurekaSample />,
      },
      {
        path: "/embed/eureka/:slug",
        element: <EurekaSample />,
      },
    ],
  },
]);

export default router;
