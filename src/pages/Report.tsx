
import { useParams, useNavigate } from "react-router-dom";
import { ReportViewer } from "@/components/reports/ReportViewer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";

const Report = () => {
  // Support both /report/:reportId and /reports/:id route patterns
  const { reportId, id } = useParams<{ reportId?: string; id?: string }>();
  const reportIdentifier = id || reportId;
  
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    // If user is not authenticated and we're done loading, redirect to login
    if (!isLoading && !user) {
      navigate('/login', { state: { from: `/report/${reportIdentifier}` } });
    }
  }, [user, isLoading, navigate, reportIdentifier]);

  useEffect(() => {
    // Check if user is authorized to access this report
    const checkAuthorization = async () => {
      if (!user || !reportIdentifier) return;
      
      try {
        setIsAuthorized(null); // Reset while checking
        
        // Try to fetch the report - RLS will handle access control
        const { data, error } = await fetch(`/api/reports/${reportIdentifier}`)
          .then(res => {
            if (!res.ok) throw new Error('Not authorized');
            return res.json();
          });
          
        if (error) throw error;
        setIsAuthorized(true);
      } catch (error) {
        console.error('Authorization check failed:', error);
        setIsAuthorized(false);
        toast({
          title: "Access denied",
          description: "You do not have permission to view this report",
          variant: "destructive"
        });
        // Redirect after a short delay
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    };
    
    if (user && reportIdentifier) {
      checkAuthorization();
    }
  }, [user, reportIdentifier, navigate]);

  const handleBackClick = () => {
    navigate(-1); // Navigate to the previous page in history
  };

  if (isLoading || isAuthorized === null) {
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

  if (!reportIdentifier || isAuthorized === false) {
    return null; // Will redirect in useEffect
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
