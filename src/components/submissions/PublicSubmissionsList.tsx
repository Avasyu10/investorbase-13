
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, FileText } from "lucide-react";
import { PublicSubmissionsTable } from "./PublicSubmissionsTable";
import { AnalysisModal } from "./AnalysisModal";
import { useAuth } from "@/hooks/useAuth";
import { analyzeReport } from "@/lib/supabase/analysis";

interface PublicSubmission {
  id: string;
  title: string;
  description: string | null;
  company_stage: string | null;
  industry: string | null;
  website_url: string | null;
  created_at: string;
  form_slug: string;
  pdf_url: string | null;
  report_id: string | null;
}

export function PublicSubmissionsList() {
  const [submissions, setSubmissions] = useState<PublicSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentSubmission, setCurrentSubmission] = useState<PublicSubmission | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    async function fetchSubmissions() {
      try {
        if (!user) {
          setSubmissions([]);
          setIsLoading(false);
          return;
        }
        
        setIsLoading(true);
        
        console.log('Fetching submissions for user:', user.id, 'with email:', user.email);
        
        // Get user's email for matching with submitter_email in reports
        // Using maybeSingle() instead of single() to avoid errors when no profile exists
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', user.id)
          .maybeSingle();
          
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching user profile:', profileError);
          // Only throw if it's not the "no rows" error
          throw profileError;
        }
        
        const userEmail = userProfile?.email || user.email || '';
        console.log('User email for matching:', userEmail);
        
        // First, check if there are any email submissions in reports table directly
        const { data: emailReports, error: emailReportsError } = await supabase
          .from('reports')
          .select(`
            id,
            title,
            description,
            pdf_url,
            created_at,
            is_public_submission,
            submitter_email,
            analysis_status
          `)
          .or(`user_id.eq.${user.id},submitter_email.ilike.${userEmail}`)
          .eq('is_public_submission', true)
          .order('created_at', { ascending: false });
          
        if (emailReportsError) {
          console.error('Error fetching email reports:', emailReportsError);
          throw emailReportsError;
        }
        
        console.log('Email reports found:', emailReports?.length || 0);
        
        // Then fetch submissions from public form submissions
        const { data: formData, error: formError } = await supabase
          .from('public_form_submissions')
          .select(`
            *,
            reports:report_id (
              id,
              company_id,
              analysis_status,
              user_id,
              submitter_email
            )
          `)
          .order('created_at', { ascending: false });
          
        if (formError) {
          console.error('Error fetching form submissions:', formError);
          throw formError;
        }
        
        console.log('Form submissions found:', formData?.length || 0);
        
        // Process email reports into the same format as form submissions
        const emailSubmissions = emailReports?.map(report => ({
          id: `email-${report.id}`,
          title: report.title || 'Email Submission',
          description: report.description,
          company_stage: null,
          industry: null,
          website_url: null,
          created_at: report.created_at,
          form_slug: 'email-submission',
          pdf_url: report.pdf_url,
          report_id: report.id,
          source: 'Email'
        })) || [];
        
        // Transform form data
        const formSubmissions = formData
          .filter(submission => {
            // Include if:
            // 1. Report exists but analysis hasn't created a company yet OR
            // 2. The submitter_email matches the user's email (case-insensitive) OR
            // 3. The user ID matches
            return (!submission.reports || 
                   !submission.reports.company_id ||
                   submission.reports.analysis_status === 'failed' ||
                   submission.reports.analysis_status === 'pending' ||
                   (submission.reports.submitter_email && 
                    submission.reports.submitter_email.toLowerCase() === userEmail.toLowerCase()) ||
                   submission.reports.user_id === user.id);
          })
          .map(submission => ({
            id: submission.id,
            title: submission.title,
            description: submission.description,
            company_stage: submission.company_stage,
            industry: submission.industry,
            website_url: submission.website_url,
            created_at: submission.created_at,
            form_slug: submission.form_slug || 'Unknown Form',
            pdf_url: submission.pdf_url,
            report_id: submission.report_id,
            source: 'Form'
          }));
        
        // Combine both sources of submissions
        const allSubmissions = [...emailSubmissions, ...formSubmissions];
        console.log('Combined submissions:', allSubmissions.length);
        
        // Sort by creation date
        allSubmissions.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        setSubmissions(allSubmissions);
      } catch (error) {
        console.error("Error fetching submissions:", error);
        toast({
          title: "Failed to load submissions",
          description: "Please try again later or contact support",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchSubmissions();
  }, [toast, user]);

  const handleAnalyze = async (submission: PublicSubmission) => {
    if (!submission.report_id) {
      toast({
        title: "Cannot analyze submission",
        description: "No report ID associated with this submission",
        variant: "destructive",
      });
      return;
    }
    
    setCurrentSubmission(submission);
    setShowModal(true);
    setIsAnalyzing(true);
    
    try {
      console.log(`Calling analyze function with report ID: ${submission.report_id}`);
      
      // Start the analysis process
      const result = await analyzeReport(submission.report_id);
      
      if (result && result.companyId) {
        toast({
          title: "Analysis complete",
          description: "The submission has been successfully analyzed",
        });
        
        // Reset retry count on success
        setRetryCount(0);
        
        // Redirect to the company page
        navigate(`/company/${result.companyId}`);
      } else {
        throw new Error("Analysis completed but no company ID was returned");
      }
    } catch (error) {
      console.error("Analysis error:", error);
      
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      
      // If this is a CORS-related error or connection error
      if (errorMessage.includes("CORS") || 
          errorMessage.includes("blocked by CORS policy") || 
          errorMessage.includes("access-control-allow-origin") ||
          errorMessage.includes("Failed to send a request to the Edge Function") ||
          errorMessage.includes("Edge Function returned a non-2xx status code")) {
        toast({
          title: "Network Connection Error",
          description: "Unable to connect to analysis service. Please try again after a moment.",
          variant: "destructive",
        });
      }
      // If this is storage related error
      else if (errorMessage.includes("Storage") || 
          errorMessage.includes("downloading") || 
          errorMessage.includes("PDF")) {
        toast({
          title: "File storage error",
          description: "There was an error accessing the PDF file. Please check that the file exists in storage.",
          variant: "destructive",
        });
      }
      // If this is a network error and we haven't retried too many times, suggest retrying
      else if ((errorMessage.includes("Network error") || 
           errorMessage.includes("Failed to fetch") ||
           errorMessage.includes("Failed to send") ||
           errorMessage.includes("network") ||
           errorMessage.includes("Connection")) && 
          retryCount < 2) {
        
        setRetryCount(prevCount => prevCount + 1);
        
        toast({
          title: "Connection issue",
          description: "Network connection issue detected. Please try again.",
          variant: "destructive",
        });
      } else if (retryCount >= 2) {
        // If we've retried multiple times, suggest a different approach
        toast({
          title: "Persistent connection issue",
          description: "We're having trouble connecting to the analysis service. Please try again later or contact support.",
          variant: "destructive",
        });
      } else {
        // Don't display another error toast if one was already shown in the analyzeReport function
        if (!errorMessage.includes("Network error") && 
            !errorMessage.includes("timed out") &&
            !errorMessage.includes("analysis failed") &&
            !errorMessage.includes("Edge Function")) {
          toast({
            title: "Analysis failed",
            description: errorMessage,
            variant: "destructive",
          });
        }
      }
    } finally {
      setIsAnalyzing(false);
      setShowModal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12 border rounded-lg bg-card/50">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">Authentication Required</h3>
          <p className="mt-2 text-muted-foreground">
            Please sign in to view new applications
          </p>
          <Button 
            onClick={() => navigate("/")} 
            className="mt-6"
          >
            Go to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">New Applications</h1>
          <p className="text-muted-foreground">
            Submissions from public forms and emails waiting to be analyzed
          </p>
        </div>
      </div>

      {submissions.length > 0 ? (
        <PublicSubmissionsTable 
          submissions={submissions} 
          onAnalyze={handleAnalyze} 
        />
      ) : (
        <div className="text-center py-12 border rounded-lg bg-card/50">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No applications found</h3>
          <p className="mt-2 text-muted-foreground">
            You don't have any new applications waiting to be analyzed.
          </p>
        </div>
      )}

      <AnalysisModal
        isOpen={showModal}
        isAnalyzing={isAnalyzing}
        submission={currentSubmission}
        onClose={() => {
          if (!isAnalyzing) {
            setShowModal(false);
          }
        }}
      />
    </div>
  );
}
