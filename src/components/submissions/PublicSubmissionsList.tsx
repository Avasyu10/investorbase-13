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
import { useQueryClient } from "@tanstack/react-query";
import { useBarcRealtimeUpdates } from "@/hooks/useBarcRealtimeUpdates";
import { useSubmissionPolling } from "@/hooks/useSubmissionPolling";
import { toast } from "sonner";

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
  const [analyzingSubmissions, setAnalyzingSubmissions] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { toast: legacyToast, dismiss } = useToast();
  const { user } = useAuth();
  const { isIITBombay } = useProfile();
  const queryClient = useQueryClient();

  // Get BARC submissions that are being analyzed
  const barcAnalyzingIds = submissions
    .filter(sub => sub.source === 'barc_form' && sub.analysis_status === 'processing')
    .map(sub => sub.id);

  // Enhanced realtime updates
  useBarcRealtimeUpdates({
    onStatusChange: (submissionId, status, companyId) => {
      console.log(`🔄 Realtime status change: ${submissionId} -> ${status}`);
      
      // Update submissions immediately
      setSubmissions(prev => prev.map(sub => {
        if (sub.id === submissionId && sub.source === 'barc_form') {
          return { ...sub, analysis_status: status };
        }
        return sub;
      }));
      
      // Remove from analyzing set
      setAnalyzingSubmissions(prev => {
        const newSet = new Set(prev);
        newSet.delete(submissionId);
        return newSet;
      });

      // Show completion message
      if (status === 'completed') {
        const submission = submissions.find(s => s.id === submissionId);
        toast.success("✅ Analysis Complete!", {
          description: `Analysis completed for ${submission?.title || 'submission'}. Results are now available.`,
          duration: 4000
        });
      }
    },
    onNewSubmission: () => {
      console.log('🆕 New submission detected - refreshing list');
      fetchSubmissions();
    }
  });

  // Fallback polling for BARC submissions
  useSubmissionPolling({
    submissionIds: barcAnalyzingIds,
    config: { enabled: barcAnalyzingIds.length > 0 },
    onStatusChange: (submissionId, status, companyId) => {
      console.log(`🔍 Polling detected status change: ${submissionId} -> ${status}`);
      
      setSubmissions(prev => prev.map(sub => {
        if (sub.id === submissionId && sub.source === 'barc_form') {
          return { ...sub, analysis_status: status };
        }
        return sub;
      }));
      
      setAnalyzingSubmissions(prev => {
        const newSet = new Set(prev);
        newSet.delete(submissionId);
        return newSet;
      });
    }
  });

  // Enhanced realtime listener with immediate UI updates
  useEffect(() => {
    console.log('📡 Setting up enhanced realtime listeners for PublicSubmissionsList');
    
    const handleBarcStatusChange = (event: CustomEvent) => {
      const { submissionId, status } = event.detail;
      console.log(`🔄 PublicSubmissionsList - Real-time status update: ${submissionId} -> ${status}`);
      
      // Update submissions state immediately for instant UI feedback
      setSubmissions(prev => prev.map(sub => {
        if (sub.id === submissionId && sub.source === 'barc_form') {
          console.log(`🔄 Updating submission ${submissionId} status from ${sub.analysis_status} to ${status}`);
          return { ...sub, analysis_status: status };
        }
        return sub;
      }));
      
      // Remove from analyzing set if completed
      if (status === 'completed' || status === 'failed') {
        setAnalyzingSubmissions(prev => {
          const newSet = new Set(prev);
          newSet.delete(submissionId);
          return newSet;
        });
      }
    };

    const handleBarcNewSubmission = () => {
      console.log('🆕 New BARC submission - refreshing list');
      fetchSubmissions();
    };

    window.addEventListener('barcStatusChange', handleBarcStatusChange as EventListener);
    window.addEventListener('barcNewSubmission', handleBarcNewSubmission as EventListener);

    return () => {
      window.removeEventListener('barcStatusChange', handleBarcStatusChange as EventListener);
      window.removeEventListener('barcNewSubmission', handleBarcNewSubmission as EventListener);
    };
  }, []);

  // Sync with analysis manager state
  useEffect(() => {
    // Update submissions based on analysis manager state
    setSubmissions(prev => prev.map(sub => {
      if (sub.source === 'barc_form') {
        const analysisState = getAnalysisStatus(sub.id);
        if (analysisState && analysisState.status !== sub.analysis_status) {
          console.log(`🔄 Syncing submission ${sub.id} status to ${analysisState.status}`);
          return { ...sub, analysis_status: analysisState.status };
        }
      }
      return sub;
    }));
  }, [activeAnalyses, getAnalysisStatus]);

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
  }, [legacyToast, user]);

  const handleAnalyze = async (submission: PublicSubmission) => {
    console.log('🚀 Starting analysis for submission:', submission.id, 'Source:', submission.source);
    
    // Prevent multiple simultaneous analyses
    if (analyzingSubmissions.has(submission.id)) {
      toast.error("Analysis already in progress for this submission.");
      return;
    }
    
    try {
      // Handle BARC form submissions
      if (submission.source === "barc_form") {
        console.log('🚀 Starting BARC analysis for:', submission.id);
        
        // Add to analyzing set immediately
        setAnalyzingSubmissions(prev => new Set(prev).add(submission.id));
        
        // Update UI immediately to show processing
        setSubmissions(prev => prev.map(sub => 
          sub.id === submission.id 
            ? { ...sub, analysis_status: 'processing' }
            : sub
        ));
        
        toast.loading("🔄 Starting Analysis", {
          description: "Processing submission. You'll see live updates and be redirected when complete.",
          id: `analysis-${submission.id}`,
        });
        
        // Trigger analysis
        await analyzeBarcSubmission(submission.id);
        
        // Dismiss loading toast
        toast.dismiss(`analysis-${submission.id}`);
        
        console.log('🎯 BARC analysis triggered successfully');
        return;
      }

      // Handle other submission types
      if (!submission.report_id) {
        toast({
          title: "No report to analyze",
          description: "This submission doesn't have an associated report",
          variant: "destructive",
        });
        return;
      }

      // Add to analyzing set for non-BARC submissions
      setAnalyzingSubmissions(prev => new Set(prev).add(submission.id));
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
        
        navigate(`/company/${result.companyId}`);
      } else {
        toast({
          title: "Analysis complete",
          description: "The document has been analyzed but no company was created",
        });
        
        window.location.reload();
      }
    } catch (error) {
      console.error("Analysis error:", error);
      
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      
      // Clean up state on error
      if (submission.source === "barc_form") {
        setSubmissions(prev => prev.map(sub => 
          sub.id === submission.id 
            ? { ...sub, analysis_status: 'failed' }
            : sub
        ));
      }
      
      setAnalyzingSubmissions(prev => {
        const newSet = new Set(prev);
        newSet.delete(submission.id);
        return newSet;
      });
      
      toast.error("Analysis failed", {
        description: errorMessage,
      });
    }
  };

  // Enhanced combined analyzing state
  const getCombinedAnalyzingSubmissions = () => {
    const combined = new Set(analyzingSubmissions);
    
    // Add BARC submissions that are being analyzed
    submissions.forEach(sub => {
      if (sub.source === 'barc_form' && sub.analysis_status === 'processing') {
        combined.add(sub.id);
      }
    });
    
    return combined;
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
          analyzingSubmissions={getCombinedAnalyzingSubmissions()}
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
