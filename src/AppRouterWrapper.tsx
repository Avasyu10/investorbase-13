
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/NotFound";
import Report from "@/pages/Report";
import App from "./App";

const AppRouterWrapper = () => {
  return (
    <AuthProvider>
      <Routes>
        {/* Route for specific report */}
        <Route path="/reports/:id" element={<Report />} />
        
        {/* Main App routes */}
        <Route path="/*" element={<App />} />
        
        {/* Fallback route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </AuthProvider>
  );
};

export default AppRouterWrapper;
