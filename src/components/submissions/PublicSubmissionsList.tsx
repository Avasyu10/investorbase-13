
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
        
        // Fetch submissions from both public form submissions and email submissions
        // that haven't been fully analyzed yet
        const { data, error } = await supabase
          .from('public_form_submissions')
          .select(`
            *,
            reports:report_id (
              id,
              company_id,
              analysis_status
            )
          `)
          .order('created_at', { ascending: false });
          
        if (error) {
          throw error;
        }
        
        // Transform the data to filter out submissions that have already been analyzed
        const filteredSubmissions = data
          .filter(submission => {
            // Include submissions where:
            // 1. Either report doesn't exist, or
            // 2. Report exists but analysis hasn't created a company yet
            return !submission.reports || 
                   !submission.reports.company_id ||
                   submission.reports.analysis_status === 'failed' ||
                   submission.reports.analysis_status === 'pending';
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
            source: submission.form_slug === 'email-submission' ? 'Email' : 'Public Form'
          }));
        
        setSubmissions(filteredSubmissions);
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
        
        // Redirect to the company page
        navigate(`/company/${result.companyId}`);
      } else {
        throw new Error("Analysis completed but no company ID was returned");
      }
    } catch (error) {
      console.error("Analysis error:", error);
      
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      
      // If this is storage related error
      if (errorMessage.includes("Storage") || 
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
