
import { useParams, useNavigate } from "react-router-dom";
import { ReportViewer } from "@/components/reports/ReportViewer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";

const Report = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  // Safely access auth context - handle if auth provider isn't available yet
  let authData = { user: null, isLoading: false };
  try {
    authData = useAuth();
  } catch (error) {
    console.warn("Auth context not available, proceeding anyway");
  }
  
  const { user, isLoading } = authData;

  useEffect(() => {
    if (!isLoading && !user) {
      // Soft handling - we'll proceed anyway for now
      setIsAuthenticated(false);
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loader"></div>
      </div>
    );
  }

  if (!id) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <Button 
        variant="ghost" 
        className="mb-6 -ml-2 transition-colors" 
        onClick={() => navigate("/dashboard")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to reports
      </Button>
      
      <ReportViewer reportId={id} />
    </div>
  );
};

export default Report;
