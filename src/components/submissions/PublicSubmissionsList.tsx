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
import { analyzeBarcSubmission } from "@/lib/api/barc";

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
  source: "email" | "email_pitch" | "public_form" | "barc_form";
  from_email?: string | null;
}

export function PublicSubmissionsList() {
  const [submissions, setSubmissions] = useState<PublicSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentSubmission, setCurrentSubmission] = useState<PublicSubmission | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [analyzingSubmissions, setAnalyzingSubmissions] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    async function fetchSubmissions() {
      try {
        if (!user) {
          console.log("No user found, clearing submissions");
          setSubmissions([]);
          setIsLoading(false);
          return;
        }
        
        setIsLoading(true);
        console.log("Fetching submissions for user:", user.id, "email:", user.email);
        
        const allSubmissions: PublicSubmission[] = [];
        
        // Fetch reports that are public submissions and not completed
        try {
          console.log("Fetching reports...");
          const { data: reportData, error: reportError } = await supabase
            .from('reports')
            .select('*')
            .eq('is_public_submission', true)
            .in('analysis_status', ['pending', 'failed'])
            .order('created_at', { ascending: false });
            
          if (reportError) {
            console.error("Error fetching reports:", reportError);
          } else {
            console.log("Reports fetched:", reportData?.length || 0);
            
            if (reportData && reportData.length > 0) {
              const transformedReports = reportData.map(report => ({
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
              
              allSubmissions.push(...transformedReports);
              console.log("Added reports to submissions:", transformedReports.length);
            }
          }
        } catch (err) {
          console.error("Error in reports fetch:", err);
        }
        
        // Fetch public form submissions
        try {
          console.log("Fetching public form submissions...");
          const { data: formData, error: formError } = await supabase
            .from('public_form_submissions')
            .select('*')
            .order('created_at', { ascending: false });
            
          if (formError) {
            console.error("Error fetching public form submissions:", formError);
          } else {
            console.log("Public form submissions fetched:", formData?.length || 0);
            
            if (formData && formData.length > 0) {
              const transformedForms = formData.map(submission => ({
                id: submission.id,
                title: submission.title,
                description: submission.description,
                company_stage: submission.company_stage,
                industry: submission.industry,
                website_url: submission.website_url,
                created_at: submission.created_at,
                form_slug: submission.form_slug || "",
                pdf_url: submission.pdf_url,
                report_id: submission.report_id,
                source: "public_form" as const
              }));
              
              allSubmissions.push(...transformedForms);
              console.log("Added public forms to submissions:", transformedForms.length);
            }
          }
        } catch (err) {
          console.error("Error in public form submissions fetch:", err);
        }
        
        // Fetch BARC form submissions - only show pending and failed ones in New Applications
        try {
          console.log("Fetching BARC form submissions...");
          const { data: barcData, error: barcError } = await supabase
            .from('barc_form_submissions')
            .select('*')
            .in('analysis_status', ['pending', 'failed'])
            .order('created_at', { ascending: false });
            
          if (barcError) {
            console.error("Error fetching BARC form submissions:", barcError);
          } else {
            console.log("BARC form submissions fetched:", barcData?.length || 0);
            
            if (barcData && barcData.length > 0) {
              const transformedBarc = barcData.map(submission => ({
                id: submission.id,
                title: submission.company_name || "BARC Application",
                description: submission.executive_summary,
                company_stage: null,
                industry: null,
                website_url: null,
                created_at: submission.created_at,
                form_slug: submission.form_slug || "",
                pdf_url: null,
                report_id: null,
                source: "barc_form" as const,
                from_email: submission.submitter_email
              }));
              
              allSubmissions.push(...transformedBarc);
              console.log("Added BARC forms to submissions:", transformedBarc.length);
            }
          }
        } catch (err) {
          console.error("Error in BARC form submissions fetch:", err);
        }
        
        // Fetch email submissions
        try {
          console.log("Fetching email submissions...");
          const { data: emailData, error: emailError } = await supabase
            .from('email_submissions')
            .select('*')
            .order('created_at', { ascending: false });
            
          if (emailError) {
            console.error("Error fetching email submissions:", emailError);
          } else {
            console.log("Email submissions fetched:", emailData?.length || 0);
            
            if (emailData && emailData.length > 0) {
              const transformedEmails = emailData.map(submission => ({
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
              
              allSubmissions.push(...transformedEmails);
              console.log("Added email submissions:", transformedEmails.length);
            }
          }
        } catch (err) {
          console.error("Error in email submissions fetch:", err);
        }
        
        // Remove duplicates and sort
        const uniqueSubmissions = allSubmissions.filter((submission, index, self) => 
          index === self.findIndex(s => s.id === submission.id)
        ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        console.log("Final submissions count:", uniqueSubmissions.length);
        console.log("Submissions by source:", {
          public_form: uniqueSubmissions.filter(s => s.source === 'public_form').length,
          email: uniqueSubmissions.filter(s => s.source === 'email').length,
          barc_form: uniqueSubmissions.filter(s => s.source === 'barc_form').length
        });
        
        setSubmissions(uniqueSubmissions);
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
    console.log('PublicSubmissionsList handleAnalyze called with:', submission);
    
    // Handle BARC form submissions
    if (submission.source === "barc_form") {
      console.log('Handling BARC form submission analysis');
      
      // Add to analyzing set to show loading state
      setAnalyzingSubmissions(prev => new Set(prev).add(submission.id));
      setCurrentSubmission(submission);
      setShowModal(true);
      setIsAnalyzing(true);
      
      try {
        console.log(`Calling BARC analysis for submission: ${submission.id}`);
        
        const result = await analyzeBarcSubmission(submission.id);
        
        console.log('BARC analysis result:', result);
        
        if (result && result.success) {
          toast({
            title: "Analysis complete",
            description: "The BARC application has been successfully analyzed",
          });
          
          // Remove the submission from the list since it's now analyzed
          setSubmissions(prev => prev.filter(s => s.id !== submission.id));
          
          // Navigate to BARC submissions page to view results
          navigate('/barc-submissions');
        } else {
          throw new Error("Analysis completed but no result was returned");
        }
      } catch (error) {
        console.error("BARC analysis error:", error);
        
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        
        toast({
          title: "Analysis failed",
          description: errorMessage,
          variant: "destructive",
        });
        
        // Keep the submission in the list so user can retry
      } finally {
        setIsAnalyzing(false);
        setAnalyzingSubmissions(prev => {
          const newSet = new Set(prev);
          newSet.delete(submission.id);
          return newSet;
        });
        setShowModal(false);
      }
      
      return;
    }

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
          
          // Wait for analysis to complete
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
              await new Promise(resolve => setTimeout(resolve, 2000));
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
            await new Promise(resolve => setTimeout(resolve, 2000));
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
      } else if ((errorMessage.includes("Network error") || 
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
        toast({
          title: "Analysis failed",
          description: errorMessage,
          variant: "destructive",
        });
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
            Submissions from public forms, BARC applications, and emails waiting to be analyzed
          </p>
        </div>
      </div>

      {submissions.length > 0 ? (
        <PublicSubmissionsTable 
          submissions={submissions} 
          onAnalyze={handleAnalyze}
          analyzingSubmissions={analyzingSubmissions}
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
