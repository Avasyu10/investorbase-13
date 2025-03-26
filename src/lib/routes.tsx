
import Index from "@/pages/Index";
import Login from "@/pages/Login";
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

export const routes = [
  {
    path: "/",
    element: <Index />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/signup",
    element: <Signup />,
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
    path: "/company/:companyId/analysis",
    element: (
      <ProtectedRoute>
        <AnalysisSummary />
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    element: <NotFound />,
  }
];
