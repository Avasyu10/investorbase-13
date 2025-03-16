import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import CompanyPage from "@/pages/CompanyPage";
import SectionPage from "@/pages/SectionPage";
import Report from "@/pages/Report";
import UploadReport from "@/pages/UploadReport";
import AnalysisSummary from "@/pages/AnalysisSummary";
import NotFound from "@/pages/NotFound";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Navbar } from "@/components/layout/Navbar";
import { Toaster } from "@/components/ui/toaster"
import Profile from "@/pages/Profile";
import ProfileSetup from "@/pages/ProfileSetup";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <main className="min-h-screen flex flex-col">
            <Navbar />
            <div className="flex-1">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/company/:companyId" element={<CompanyPage />} />
                <Route path="/company/:companyId/section/:sectionType" element={<SectionPage />} />
                <Route path="/report/:reportId" element={<Report />} />
                <Route path="/upload" element={<UploadReport />} />
                <Route path="/summary/:reportId" element={<AnalysisSummary />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/setup" element={<ProfileSetup />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
            <Toaster />
          </main>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
