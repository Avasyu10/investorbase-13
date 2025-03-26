import { Home } from "@/pages/Home";
import { Login } from "@/pages/Login";
import { Signup } from "@/pages/Signup";
import { Dashboard } from "@/pages/Dashboard";
import { Upload } from "@/pages/Upload";
import { Report } from "@/pages/Report";
import { CompanyPage } from "@/pages/CompanyPage";
import { SectionPage } from "@/pages/SectionPage";
import { Supplementary } from "@/pages/Supplementary";
import { PublicForm } from "@/pages/PublicForm";
import { PublicSubmission } from "@/pages/PublicSubmission";
import { AnalysisSummary } from "@/pages/AnalysisSummary";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export const routes = [
  {
    path: "/",
    element: <Home />,
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
        <Upload />
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
        <Supplementary />
      </ProtectedRoute>
    ),
  },
  {
    path: "/public-form",
    element: <PublicForm />,
  },
  {
    path: "/public-submission/:submissionId",
    element: <PublicSubmission />,
  },
  {
    path: "/company/:companyId/analysis",
    element: (
      <ProtectedRoute>
        <AnalysisSummary />
      </ProtectedRoute>
    ),
  },
];
