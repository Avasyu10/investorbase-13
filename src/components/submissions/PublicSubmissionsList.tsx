import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, FileText } from "lucide-react";
import { PublicSubmissionsTable } from "./PublicSubmissionsTable";
import { AnalysisModal } from "./AnalysisModal";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
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
  submitter_email?: string | null;
  analysis_status?: string;
}

// Helper function to get form slugs that the user owns
async function getUserOwnedFormSlugs(userId: string): Promise<string[]> {
  try {
    const { data: forms, error } = await supabase
      .from('public_submission_forms')
      .select('form_slug')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user forms:', error);
      return [];
    }

    return forms?.map(f => f.form_slug) || [];
  } catch (err) {
    console.error('Error in getUserOwnedFormSlugs:', err);
    return [];
  }
}

// Helper function to get report IDs the user has access to
async function getUserAccessibleReports(userId: string): Promise<string[]> {
  try {
    const { data: reports, error } = await supabase
      .from('reports')
      .select('id')
      .or(`user_id.eq.${userId},is_public_submission.eq.true`);

    if (error) {
      console.error('Error fetching accessible reports:', error);
      return [];
    }

    return reports?.map(r => r.id) || [];
  } catch (err) {
    console.error('Error in getUserAccessibleReports:', err);
    return [];
  }
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
  const { toast, dismiss } = useToast();
  const { user } = useAuth();
  const { isIITBombay } = useProfile();

  // Enhanced realtime subscription for BARC form submission updates
  useEffect(() => {
    if (!user) return;

    console.log('🔥 Setting up enhanced real-time subscription for BARC in submissions list');
    
    // Listen for custom events from the global realtime subscription
    const handleSubmissionAdded = (event: CustomEvent) => {
      console.log('🎯 Received barcSubmissionAdded event in submissions list:', event.detail);
      fetchSubmissions(); // Refresh the submissions list
    };

    const handleSubmissionUpdated = (event: CustomEvent) => {
      console.log('📊 Received barcSubmissionUpdated event in submissions list:', event.detail);
      
      const { submissionId, newStatus, oldStatus, companyId, submission } = event.detail;
      
      console.log(`🔄 Submissions List - Processing status update for ${submissionId}: ${oldStatus} → ${newStatus}`);
      
      // IMMEDIATE STATE UPDATE for smooth transitions
      setSubmissions(prev => prev.map(sub => {
        if (sub.id === submissionId && sub.source === 'barc_form') {
          console.log(`✨ Submissions List - Updating submission ${submissionId} to status: ${newStatus}`);
          return {
            ...sub,
            analysis_status: newStatus
          };
        }
        return sub;
      }));

      // Remove from analyzing set if analysis completed
      if (newStatus === 'completed' || newStatus === 'failed' || newStatus === 'error') {
        console.log(`🧹 Submissions List - Removing ${submissionId} from analyzing set`);
        setAnalyzingSubmissions(prev => {
          const newSet = new Set(prev);
          newSet.delete(submissionId);
          return newSet;
        });
      }
      
      // Refresh data after a short delay
      setTimeout(() => {
        console.log('🔄 Submissions List - Refreshing data after status update');
        fetchSubmissions();
      }, 1000);
    };

    // Add event listeners for custom events
    window.addEventListener('barcSubmissionAdded', handleSubmissionAdded as EventListener);
    window.addEventListener('barcSubmissionUpdated', handleSubmissionUpdated as EventListener);

    // Also set up direct realtime subscription
    const channel = supabase
      .channel('barc_submissions_list_direct')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'barc_form_submissions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📊 Submissions List - Direct realtime update:', payload);
          
          const updatedSubmission = payload.new;
          const newStatus = updatedSubmission.analysis_status;
          const submissionId = updatedSubmission.id;
          
          console.log(`🔄 Submissions List - Direct update: ${submissionId} to ${newStatus}`);
          
          // Update the submissions state immediately
          setSubmissions(prev => prev.map(submission => {
            if (submission.id === submissionId && submission.source === 'barc_form') {
              console.log(`✨ Submissions List - Direct updating submission ${submissionId}`);
              return {
                ...submission,
                analysis_status: newStatus
              };
            }
            return submission;
          }));

          // Remove from analyzing set when analysis completes
          if (newStatus === 'completed' || newStatus === 'failed' || newStatus === 'error') {
            setAnalyzingSubmissions(prev => {
              const newSet = new Set(prev);
              newSet.delete(submissionId);
              return newSet;
            });
          }

          // Show status notifications
          if (newStatus === 'processing') {
            toast({
              title: "Analysis started",
              description: `Analysis is now in progress for ${updatedSubmission.company_name}`,
            });
          } else if (newStatus === 'completed') {
            toast({
              title: "Analysis completed",
              description: `Analysis successfully completed for ${updatedSubmission.company_name}`,
            });
          } else if (newStatus === 'failed' || newStatus === 'error') {
            toast({
              title: "Analysis failed",
              description: `Analysis failed for ${updatedSubmission.company_name}`,
              variant: "destructive",
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Submissions List - Direct subscription status:', status);
      });

    return () => {
      console.log('🧹 Submissions List - Cleaning up real-time subscriptions');
      window.removeEventListener('barcSubmissionAdded', handleSubmissionAdded as EventListener);
      window.removeEventListener('barcSubmissionUpdated', handleSubmissionUpdated as EventListener);
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const fetchSubmissions = async () => {
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
      
      // Get user's accessible reports and form slugs
      const [accessibleReports, userFormSlugs] = await Promise.all([
        getUserAccessibleReports(user.id),
        getUserOwnedFormSlugs(user.id)
      ]);
      
      console.log("User accessible reports:", accessibleReports.length);
      console.log("User owned form slugs:", userFormSlugs);
      
      // Fetch reports that are public submissions and not completed
      try {
        console.log("Fetching reports...");
        const { data: reportData, error: reportError } = await supabase
          .from('reports')
          .select('*')
          .eq('is_public_submission', true)
          .in('analysis_status', ['pending', 'failed'])
          .in('id', accessibleReports)
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
      
      // Fetch public form submissions - only for user's forms
      if (userFormSlugs.length > 0) {
        try {
          console.log("Fetching public form submissions for user's forms...");
          const { data: formData, error: formError } = await supabase
            .from('public_form_submissions')
            .select('*')
            .in('form_slug', userFormSlugs)
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
      } else {
        console.log("No user form slugs found, skipping public form submissions");
      }
      
      // Fetch BARC form submissions - only for user's forms
      if (userFormSlugs.length > 0) {
        try {
          console.log("Fetching BARC form submissions for user's forms...");
          const { data: barcData, error: barcError } = await supabase
            .from('barc_form_submissions')
            .select('*')
            .in('form_slug', userFormSlugs)
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
                from_email: submission.submitter_email,
                analysis_status: submission.analysis_status
              }));
              
              allSubmissions.push(...transformedBarc);
              console.log("Added BARC forms to submissions:", transformedBarc.length);
            }
          }
        } catch (err) {
          console.error("Error in BARC form submissions fetch:", err);
        }
      } else {
        console.log("No user form slugs found, skipping BARC form submissions");
      }
      
      // Fetch email submissions - only for this user
      try {
        console.log("Fetching email submissions...");
        const { data: emailData, error: emailError } = await supabase
          .from('email_submissions')
          .select('*')
          .or(`to_email.eq.${user.email}`)
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
  };

  useEffect(() => {
    fetchSubmissions();
  }, [toast, user]);

  const handleAnalyze = async (submission: PublicSubmission) => {
    console.log('PublicSubmissionsList handleAnalyze called with:', submission);
    
    // Prevent multiple simultaneous analyses of the same submission
    if (analyzingSubmissions.has(submission.id)) {
      toast({
        title: "Analysis in progress",
        description: "This submission is already being analyzed. Please wait for it to complete.",
        variant: "destructive",
      });
      return;
    }
    
    // Add to analyzing set immediately
    setAnalyzingSubmissions(prev => new Set(prev).add(submission.id));
    
    try {
      // Handle BARC form submissions
      if (submission.source === "barc_form") {
        console.log('Handling BARC form submission analysis');
        
        const loadingToast = toast({
          title: "Analyzing submission...",
          description: "This may take a few moments. Please wait...",
          id: `analysis-${submission.id}`,
        });
        
        console.log(`Calling BARC analysis for submission: ${submission.id}`);
        
        const result = await analyzeBarcSubmission(submission.id);
        
        console.log('BARC analysis result:', result);
        
        // Dismiss loading toast
        dismiss(`analysis-${submission.id}`);
        
        if (result && result.success && result.companyId) {
          toast({
            title: "Analysis completed successfully!",
            description: "Company has been created and analyzed.",
          });
          
          // Navigate directly to the company page
          console.log(`Navigating to company: ${result.companyId}`);
          navigate(`/company/${result.companyId}`);
        } else {
          throw new Error(result?.message || "Analysis completed but no result was returned");
        }
        
        return;
      }

      // Handle other submission types (existing logic)
      if (!submission.report_id) {
        toast({
          title: "No report to analyze",
          description: "This submission doesn't have an associated report",
          variant: "destructive",
        });
        return;
      }

      setIsAnalyzing(true);
      setCurrentSubmission(submission);

      console.log(`Starting analysis for report: ${submission.report_id}`);
      
      toast({
        title: "Analysis started",
        description: "This may take a few minutes depending on the size of the document",
      });

      const result = await analyzeReport(submission.report_id);
      
      console.log('Analysis result:', result);

      if (result && result.companyId) {
        toast({
          title: "Analysis complete",
          description: "The document has been analyzed successfully!",
        });
        
        // Navigate to the company page
        navigate(`/company/${result.companyId}`);
      } else {
        toast({
          title: "Analysis complete",
          description: "The document has been analyzed but no company was created",
        });
        
        // Refresh the page to show updated status
        window.location.reload();
      }
    } catch (error) {
      console.error("Analysis error:", error);
      
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      
      // Dismiss any loading toasts
      dismiss(`analysis-${submission.id}`);
      
      toast({
        title: "Analysis failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
      setCurrentSubmission(null);
      
      // Remove from analyzing set after a delay to prevent rapid re-clicks
      setTimeout(() => {
        setAnalyzingSubmissions(prev => {
          const newSet = new Set(prev);
          newSet.delete(submission.id);
          return newSet;
        });
      }, 2000);
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">New Applications</h1>
        <p className="text-muted-foreground">
          Review and analyze new applications from your submission forms
        </p>
      </div>

      {submissions.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-card/50">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No new applications</h3>
          <p className="mt-2 text-muted-foreground">
            New applications will appear here when they are submitted through your forms.
          </p>
        </div>
      ) : (
        <PublicSubmissionsTable 
          submissions={submissions} 
          onAnalyze={handleAnalyze}
          analyzingSubmissions={analyzingSubmissions}
          isIITBombay={isIITBombay}
        />
      )}

      <AnalysisModal
        isOpen={showModal}
        isAnalyzing={isAnalyzing}
        onClose={() => {
          setShowModal(false);
          setCurrentSubmission(null);
        }}
        submission={currentSubmission}
      />
    </div>
  );
}
