
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { Navbar } from "@/components/layout/Navbar";

// Pages
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import CompanyPage from "./pages/CompanyPage";
import SectionPage from "./pages/SectionPage";
import NotFound from "./pages/NotFound";
import AnalysisSummary from "./pages/AnalysisSummary";
import UploadReport from "./pages/UploadReport";
import Report from "./pages/Report";

const queryClient = new QueryClient();

// App routes with Authentication
const AppRoutes = () => (
  <>
    <Navbar />
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/company/:companyId" element={<CompanyPage />} />
      <Route path="/company/:companyId/section/:sectionId" element={<SectionPage />} />
      <Route path="/company/:companyId/analysis" element={<AnalysisSummary />} />
      <Route path="/upload" element={<UploadReport />} />
      <Route path="/report/:reportId" element={<Report />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
