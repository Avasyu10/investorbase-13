
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
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
import { Toaster } from "@/components/ui/toaster";
import Profile from "@/pages/Profile";
import ProfileSetup from "@/pages/ProfileSetup";
import ProfileEdit from "@/pages/ProfileEdit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create a new query client instance with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reduce retries to minimize unnecessary requests
      retry: 0,
      // Don't refetch on window focus to avoid page refreshes
      refetchOnWindowFocus: false,
      // Increase stale time to reduce unnecessary refetches
      staleTime: 1000 * 60 * 5, // 5 minutes
      // Cache data for longer
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
    mutations: {
      // Don't retry mutations automatically
      retry: 0,
    },
  },
});

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
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/company/:companyId" element={<CompanyPage />} />
                  <Route path="/company/:companyId/section/:sectionId" element={<SectionPage />} />
                  <Route path="/company/:companyId/analysis" element={<AnalysisSummary />} />
                  <Route path="/reports/:id" element={<Report />} />
                  <Route path="/report/:reportId" element={<Report />} />
                  <Route path="/upload" element={<UploadReport />} />
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
