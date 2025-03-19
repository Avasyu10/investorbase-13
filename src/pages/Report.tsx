
import { useParams, useNavigate } from "react-router-dom";
import { ReportViewer } from "@/components/reports/ReportViewer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

const Report = () => {
  // Support both /report/:reportId and /reports/:id route patterns
  const { reportId, id } = useParams<{ reportId?: string; id?: string }>();
  const reportIdentifier = id || reportId;
  
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // If user is not authenticated and we're done loading, redirect to login
    if (!isLoading && !user) {
      navigate('/login', { state: { from: `/report/${reportIdentifier}` } });
    }
  }, [user, isLoading, navigate, reportIdentifier]);

  const handleBackClick = () => {
    navigate(-1); // Navigate to the previous page in history
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  if (!reportIdentifier) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <Button 
        variant="ghost" 
        className="mb-6 -ml-2 transition-colors" 
        onClick={handleBackClick}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      
      <ReportViewer reportId={reportIdentifier} />
    </div>
  );
};

export default Report;
