
import { useParams, useNavigate } from "react-router-dom";
import { ReportViewer } from "@/components/reports/ReportViewer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";

const Report = () => {
  // Support both /report/:reportId and /reports/:id route patterns
  const { reportId, id } = useParams<{ reportId?: string; id?: string }>();
  const reportIdentifier = id || reportId;
  
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Handle authentication check without immediate redirection
    if (!isLoading) {
      setIsAuthenticated(!!user);
    }
  }, [user, isLoading]);

  // If explicitly not authenticated (not just loading), redirect
  useEffect(() => {
    if (isAuthenticated === false) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loader"></div>
      </div>
    );
  }

  // Don't render anything while still determining auth status
  if (isAuthenticated === null) return null;

  if (!reportIdentifier) {
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
        Back to Pitch Decks
      </Button>
      
      <ReportViewer reportId={reportIdentifier} />
    </div>
  );
};

export default Report;
