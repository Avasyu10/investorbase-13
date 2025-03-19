
import { useParams, useNavigate } from "react-router-dom";
import { ReportViewer } from "@/components/reports/ReportViewer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Report = () => {
  // Support both /report/:reportId and /reports/:id route patterns
  const { reportId, id } = useParams<{ reportId?: string; id?: string }>();
  const reportIdentifier = id || reportId;
  
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [reportExists, setReportExists] = useState<boolean | null>(null);

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
        
        console.log('Checking report access for ID:', reportIdentifier);
        
        // Try to fetch the report - will handle access control
        const { data, error } = await supabase
          .from('reports')
          .select('id, title, user_id, company_id')
          .eq('id', reportIdentifier)
          .maybeSingle();
          
        if (error) {
          console.error('Error fetching report:', error);
          throw error;
        }
          
        if (!data) {
          console.log('Report not found:', reportIdentifier);
          setReportExists(false);
          setIsAuthorized(false);
          toast({
            title: "Report not found",
            description: "The requested report does not exist",
            variant: "destructive"
          });
          // Redirect after a short delay
          setTimeout(() => navigate('/dashboard'), 2000);
          return;
        }
        
        console.log('Report found:', data);
        setReportExists(true);
        
        // Check if user has access (either owns the report or has access to the company)
        if (data.user_id === user.id) {
          console.log('User owns the report, access granted');
          setIsAuthorized(true);
          return;
        }
        
        // If there's a company_id, check if user has access to the company
        if (data.company_id) {
          console.log('Checking company access for company ID:', data.company_id);
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('id, user_id')
            .eq('id', data.company_id)
            .eq('user_id', user.id)
            .maybeSingle();
            
          if (companyError) {
            console.error('Error checking company access:', companyError);
            throw companyError;
          }
          
          if (companyData) {
            console.log('User has access to the company, access granted');
            setIsAuthorized(true);
            return;
          }
        }
        
        console.log('User does not have access to the report or company');
        setIsAuthorized(false);
        toast({
          title: "Access denied",
          description: "You do not have permission to view this report",
          variant: "destructive"
        });
        // Redirect after a short delay
        setTimeout(() => navigate('/dashboard'), 2000);
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
