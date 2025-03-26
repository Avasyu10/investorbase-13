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
  source: "email" | "email_pitch" | "public_form";
  from_email?: string | null;
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
        console.log("Fetching public submissions for user:", user.id);
        console.log("User email:", user.email);
        
        const { data: reportData, error: reportError } = await supabase
          .from('reports')
          .select(`
            id,
            title,
            description,
            pdf_url,
            created_at,
            analysis_status,
            companies:companies!reports_company_id_fkey(id)
          `)
          .eq('is_public_submission', true)
          .eq('user_id', user.id)
          .is('company_id', null)
          .order('created_at', { ascending: false });
          
        if (reportError) {
          console.error("Error fetching public submissions from reports:", reportError);
          throw reportError;
        }
        
        console.log("Public submissions from reports:", reportData?.length || 0);
        
        const { data: formData, error: formError } = await supabase
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
          
        if (formError) {
          console.error("Error fetching public form submissions:", formError);
          throw formError;
        }
        
        console.log("Public form submissions fetched:", formData?.length || 0);
        
        const { data: emailData, error: emailError } = await supabase
          .from('email_submissions')
          .select(`
            *,
            reports:report_id (
              id,
              company_id,
              analysis_status
            )
          `)
          .eq('from_email', user.email)
          .order('created_at', { ascending: false });
          
        if (emailError) {
          console.error("Error fetching email submissions:", emailError);
          throw emailError;
        }
        
        console.log("Email submissions fetched:", emailData?.length || 0);
        
        let emailPitchData = [];
        try {
          const { data: pitchData, error: emailPitchError } = await supabase
            .from('email_pitch_submissions')
            .select(`
              *,
              reports:report_id (
                id,
                company_id,
                analysis_status
              )
            `)
            .order('created_at', { ascending: false });
          
          if (emailPitchError) {
            console.error("Error fetching email pitch submissions:", emailPitchError);
            // Continue with other data, don't throw error
          } else {
            console.log("Email pitch submissions fetched:", pitchData?.length || 0);
            console.log("Sample email pitch submission:", pitchData?.[0]);
            
            emailPitchData = pitchData?.filter(submission => 
              submission.sender_email === user.email
            ) || [];
            
            console.log("Filtered email pitch submissions for current user:", emailPitchData.length);
          }
        } catch (pitchError) {
          console.error("Error in pitch email fetch:", pitchError);
          // Continue with other data
        }
        
        const transformedReportData = reportData
          .filter(report => report.analysis_status !== 'completed' && !report.companies?.id)
          .map(report => ({
            id: report.id,
            title: report.title,
            description: report.description,
            company_stage: null,
            industry: null,
            website_url: null,
            created_at: report.created_at,
            form_slug: "",
            pdf_url: report.pdf_url,
            report_id: report.id,
            source: "public_form" as const
          }));
          
        console.log("Transformed report data:", transformedReportData.length);
        
        const transformedFormData = formData
          .filter(submission => {
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
            form_slug: submission.form_slug,
            pdf_url: submission.pdf_url,
            report_id: submission.report_id,
            source: "public_form" as const
          }));
          
        console.log("Filtered public form submissions:", transformedFormData.length);
        
        const transformedEmailData = emailData
          .filter(submission => {
            return !submission.reports || 
                   !submission.reports.company_id ||
                   submission.reports.analysis_status === 'failed' ||
                   submission.reports.analysis_status === 'pending';
          })
          .map(submission => ({
            id: submission.id,
            title: submission.subject || "Email Submission",
            description: submission.email_body,
            company_stage: null,
            industry: null,
            website_url: null,
            created_at: submission.received_at,
            form_slug: "",
            pdf_url: submission.attachment_url,
            report_id: submission.report_id,
            source: "email" as const,
            from_email: submission.from_email
          }));
        
        console.log("Filtered email submissions:", transformedEmailData.length);
        
        const transformedEmailPitchData = emailPitchData
          .filter(submission => {
            return !submission.reports || 
                   !submission.reports.company_id ||
                   submission.reports.analysis_status === 'failed' ||
                   submission.reports.analysis_status === 'pending';
          })
          .map(submission => ({
            id: submission.id,
            title: submission.company_name || "Pitch Submission",
            description: `Email pitch from ${submission.sender_name || submission.sender_email}`,
            company_stage: null,
            industry: null,
            website_url: null,
            created_at: submission.received_at ? submission.received_at : submission.created_at,
            form_slug: "",
            pdf_url: submission.attachment_url,
            report_id: submission.report_id,
            source: "email_pitch" as const,
            from_email: submission.sender_email
          }));
        
        console.log("Filtered email pitch submissions:", transformedEmailPitchData.length);
        
        const submissionsMap = new Map();
        
        [...transformedReportData, ...transformedFormData, ...transformedEmailData, ...transformedEmailPitchData].forEach(submission => {
          const key = submission.report_id || submission.id;
          
          if (!submissionsMap.has(key) || 
              new Date(submission.created_at) > new Date(submissionsMap.get(key).created_at)) {
            submissionsMap.set(key, submission);
          }
        });
        
        const combinedSubmissions = Array.from(submissionsMap.values())
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        console.log("Combined submissions after deduplication:", combinedSubmissions.length);
        
        const emailPitchCount = combinedSubmissions.filter(s => s.source === 'email_pitch').length;
        console.log("Email pitch submissions in final combined list:", emailPitchCount);
        
        setSubmissions(combinedSubmissions);
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
      if (submission.source === "email_pitch") {
        setCurrentSubmission(submission);
        setShowModal(true);
        setIsAnalyzing(true);
        
        try {
          console.log(`Initiating auto-analyze for email pitch submission: ${submission.id}`);
          
          const response = await supabase.functions.invoke('auto-analyze-email-pitch-pdf', {
            body: { id: submission.id }
          });
          
          console.log('Auto-analyze function response:', response);
          
          if (response.error) {
            throw new Error(`Auto-analyze failed: ${response.error.message || JSON.stringify(response.error)}`);
          }
          
          if (!response.data || !response.data.reportId) {
            throw new Error("No report ID returned from auto-analyze function");
          }
          
          const reportId = response.data.reportId;
          console.log(`Report created with ID: ${reportId}`);
          
          let analysisComplete = false;
          let retries = 0;
          let companyId = null;
          
          while (!analysisComplete && retries < 30) {
            const { data: reportData, error: reportError } = await supabase
              .from('reports')
              .select('*')
              .eq('id', reportId)
              .single();
              
            if (reportError) {
              console.error("Error fetching report:", reportError);
              retries++;
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
              continue;
            }
            
            if (reportData.analysis_status === 'completed' && reportData.company_id) {
              analysisComplete = true;
              companyId = reportData.company_id;
              break;
            } else if (reportData.analysis_status === 'failed') {
              throw new Error(`Analysis failed: ${reportData.analysis_error || "Unknown error"}`);
            }
            
            retries++;
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          }
          
          if (companyId) {
            toast({
              title: "Analysis complete",
              description: "The submission has been successfully analyzed",
            });
            
            navigate(`/company/${companyId}`);
          } else {
            throw new Error("Analysis timed out. Please check the report status later.");
          }
          
        } catch (error) {
          console.error("Error during auto-analyze:", error);
          
          toast({
            title: "Analysis failed",
            description: error instanceof Error ? error.message : "An unknown error occurred",
            variant: "destructive",
          });
        } finally {
          setIsAnalyzing(false);
          setShowModal(false);
        }
        
        return;
      }
      
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
      console.log("Checking if this is a public submission...");
      
      const { data: formSubmission } = await supabase
        .from('public_form_submissions')
        .select('*')
        .eq('report_id', submission.report_id)
        .maybeSingle();
        
      if (formSubmission) {
        console.log("Report is a public submission");
        console.log("Will use analyze-public-pdf function for analysis");
      } else {
        console.log("Not a public form submission, will use default analyze-pdf");
      }
      
      const result = await analyzeReport(submission.report_id);
      
      if (result && result.companyId) {
        toast({
          title: "Analysis complete",
          description: "The submission has been successfully analyzed",
        });
        
        navigate(`/company/${result.companyId}`);
      } else {
        throw new Error("Analysis completed but no company ID was returned");
      }
    } catch (error) {
      console.error("Analysis error:", error);
      
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      
      if (errorMessage.includes("Storage") || 
          errorMessage.includes("downloading") || 
          errorMessage.includes("PDF")) {
        toast({
          title: "File storage error",
          description: "There was an error accessing the PDF file. Please check that the file exists in storage.",
          variant: "destructive",
        });
      }
      else if ((errorMessage.includes("Network error") || 
           errorMessage.includes("Failed to fetch") ||
           errorMessage.includes("Failed to send") ||
           errorMessage.includes("CORS") ||
           errorMessage.includes("Origin") ||
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
        toast({
          title: "Persistent connection issue",
          description: "We're having trouble connecting to the analysis service. Please try again later or contact support.",
          variant: "destructive",
        });
      } else {
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
