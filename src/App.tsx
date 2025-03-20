
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";
import Index from "@/pages/Index";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import CompanyPage from "@/pages/CompanyPage";
import SectionPage from "@/pages/SectionPage";
import Report from "@/pages/Report";
import UploadReport from "@/pages/UploadReport";
import PublicUpload from "@/pages/PublicUpload";
import AnalysisSummary from "@/pages/AnalysisSummary";
import NotFound from "@/pages/NotFound";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Navbar } from "@/components/layout/Navbar";
import { Toaster } from "@/components/ui/toaster";
import Profile from "@/pages/Profile";
import ProfileSetup from "@/pages/ProfileSetup";
import ProfileEdit from "@/pages/ProfileEdit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SupplementaryMaterials from "@/pages/SupplementaryMaterials";

// Create a new query client instance
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <main className="min-h-screen flex flex-col dark bg-background text-foreground">
              <Navbar />
              <div className="flex-1">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/company/:companyId" element={<CompanyPage />} />
                  <Route path="/company/:companyId/section/:sectionId" element={<SectionPage />} />
                  <Route path="/company/:companyId/analysis" element={<AnalysisSummary />} />
                  <Route path="/company/:companyId/supplementary" element={<SupplementaryMaterials />} />
                  <Route path="/reports/:id" element={<Report />} />
                  <Route path="/report/:reportId" element={<Report />} />
                  <Route path="/upload" element={<UploadReport />} />
                  <Route path="/public-upload" element={<PublicUpload />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/profile/setup" element={<ProfileSetup />} />
                  <Route path="/profile/edit" element={<ProfileEdit />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
              <Toaster />
            </main>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
