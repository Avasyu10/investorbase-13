
import { useState, useEffect } from "react";
import { PublicSubmissionsTable } from "./PublicSubmissionsTable";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { Loader2, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export function PublicSubmissionsList() {
  const { user } = useAuth();
  const { isIITBombay } = useProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [analyzingSubmissions, setAnalyzingSubmissions] = useState<Set<string>>(new Set());

  // Fetch public form submissions
  const { data: submissions = [], isLoading, error, refetch } = useQuery({
    queryKey: ['public-submissions', user?.id, isIITBombay],
    queryFn: async (): Promise<PublicSubmission[]> => {
      if (!user) return [];

      console.log('Fetching submissions for user:', user.id, 'isIITBombay:', isIITBombay);
      
      try {
        const allSubmissions: PublicSubmission[] = [];

        // For IIT Bombay users, only fetch BARC form submissions
        if (isIITBombay) {
          const { data: barcSubmissions, error: barcError } = await supabase
            .from('barc_form_submissions')
            .select(`
              id,
              company_name,
              form_slug,
              created_at,
              submitter_email,
              analysis_status,
              report_id,
              executive_summary,
              company_type
            `)
            .order('created_at', { ascending: false });

          if (barcError) {
            console.error('Error fetching BARC submissions:', barcError);
            throw barcError;
          }

          if (barcSubmissions) {
            const mappedBarcSubmissions: PublicSubmission[] = barcSubmissions.map(submission => ({
              id: submission.id,
              title: submission.company_name || 'Untitled',
              description: submission.executive_summary,
              company_stage: submission.company_type,
              industry: null,
              website_url: null,
              created_at: submission.created_at,
              form_slug: submission.form_slug,
              pdf_url: null,
              report_id: submission.report_id,
              source: "barc_form" as const,
              submitter_email: submission.submitter_email,
              analysis_status: submission.analysis_status
            }));

            allSubmissions.push(...mappedBarcSubmissions);
          }
        } else {
          // For non-IIT Bombay users, fetch all types EXCEPT BARC forms
          
          // 1. Fetch public form submissions (but exclude BARC forms)
          const { data: publicSubmissions, error: publicError } = await supabase
            .from('public_form_submissions')
            .select(`
              id,
              title,
              description,
              company_stage,
              industry,
              website_url,
              created_at,
              form_slug,
              pdf_url,
              report_id,
              submitter_email
            `)
            .order('created_at', { ascending: false });

          if (publicError) {
            console.error('Error fetching public submissions:', publicError);
            throw publicError;
          }

          if (publicSubmissions) {
            const mappedPublicSubmissions: PublicSubmission[] = publicSubmissions.map(submission => ({
              id: submission.id,
              title: submission.title || 'Untitled',
              description: submission.description,
              company_stage: submission.company_stage,
              industry: submission.industry,
              website_url: submission.website_url,
              created_at: submission.created_at,
              form_slug: submission.form_slug,
              pdf_url: submission.pdf_url,
              report_id: submission.report_id,
              source: "public_form" as const,
              submitter_email: submission.submitter_email
            }));

            allSubmissions.push(...mappedPublicSubmissions);
          }

          // 2. Fetch email pitch submissions
          const { data: emailPitchSubmissions, error: emailPitchError } = await supabase
            .from('email_pitch_submissions')
            .select(`
              id,
              company_name,
              sender_email,
              sender_name,
              created_at,
              report_id,
              analysis_status
            `)
            .order('created_at', { ascending: false });

          if (emailPitchError) {
            console.error('Error fetching email pitch submissions:', emailPitchError);
            throw emailPitchError;
          }

          if (emailPitchSubmissions) {
            const mappedEmailPitchSubmissions: PublicSubmission[] = emailPitchSubmissions.map(submission => ({
              id: submission.id,
              title: submission.company_name || 'Email Pitch',
              description: null,
              company_stage: null,
              industry: null,
              website_url: null,
              created_at: submission.created_at,
              form_slug: 'email-pitch',
              pdf_url: null,
              report_id: submission.report_id,
              source: "email_pitch" as const,
              from_email: submission.sender_email,
              submitter_email: submission.sender_email,
              analysis_status: submission.analysis_status
            }));

            allSubmissions.push(...mappedEmailPitchSubmissions);
          }

          // 3. Fetch email submissions (legacy)
          const { data: emailSubmissions, error: emailError } = await supabase
            .from('email_submissions')
            .select(`
              id,
              subject,
              from_email,
              created_at,
              report_id
            `)
            .order('created_at', { ascending: false });

          if (emailError) {
            console.error('Error fetching email submissions:', emailError);
            throw emailError;
          }

          if (emailSubmissions) {
            const mappedEmailSubmissions: PublicSubmission[] = emailSubmissions.map(submission => ({
              id: submission.id,
              title: submission.subject || 'Email Submission',
              description: null,
              company_stage: null,
              industry: null,
              website_url: null,
              created_at: submission.created_at,
              form_slug: 'email',
              pdf_url: null,
              report_id: submission.report_id,
              source: "email" as const,
              from_email: submission.from_email,
              submitter_email: submission.from_email
            }));

            allSubmissions.push(...mappedEmailSubmissions);
          }
        }

        // Remove duplicates based on ID (just in case)
        const uniqueSubmissions = Array.from(
          new Map(allSubmissions.map(item => [item.id, item])).values()
        );

        // Sort by created_at descending
        uniqueSubmissions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        console.log(`Found ${uniqueSubmissions.length} unique submissions`);
        return uniqueSubmissions;

      } catch (error) {
        console.error('Error in submissions query:', error);
        throw error;
      }
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Listen for real-time updates
  useEffect(() => {
    const handleBarcStatusChange = (event: CustomEvent) => {
      console.log('📊 BARC status change received in PublicSubmissionsList:', event.detail);
      refetch();
    };

    const handleBarcNewSubmission = (event: CustomEvent) => {
      console.log('🆕 New BARC submission received in PublicSubmissionsList:', event.detail);
      refetch();
    };

    window.addEventListener('barcStatusChange', handleBarcStatusChange as EventListener);
    window.addEventListener('barcNewSubmission', handleBarcNewSubmission as EventListener);

    return () => {
      window.removeEventListener('barcStatusChange', handleBarcStatusChange as EventListener);
      window.removeEventListener('barcNewSubmission', handleBarcNewSubmission as EventListener);
    };
  }, [refetch]);

  const handleAnalyze = async (submission: PublicSubmission) => {
    console.log('Analyzing submission:', submission.id, 'Source:', submission.source);
    
    if (submission.source === "barc_form") {
      // Handle BARC form analysis
      setAnalyzingSubmissions(prev => new Set([...prev, submission.id]));
      
      try {
        const { error } = await supabase.functions.invoke('analyze-barc-submission', {
          body: { submissionId: submission.id }
        });

        if (error) {
          console.error('Error analyzing BARC submission:', error);
          toast({
            title: "Analysis Failed",
            description: `Failed to analyze submission: ${error.message}`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Analysis Started",
            description: "BARC form analysis has been started. You'll be notified when it's complete.",
          });
        }
      } catch (error) {
        console.error('Error in BARC analysis:', error);
        toast({
          title: "Analysis Failed",
          description: "An unexpected error occurred while starting the analysis.",
          variant: "destructive",
        });
      } finally {
        setAnalyzingSubmissions(prev => {
          const newSet = new Set(prev);
          newSet.delete(submission.id);
          return newSet;
        });
      }
    } else {
      // Handle other submission types (public form, email, etc.)
      if (!submission.report_id) {
        toast({
          title: "Cannot Analyze",
          description: "This submission doesn't have an associated report to analyze.",
          variant: "destructive",
        });
        return;
      }

      setAnalyzingSubmissions(prev => new Set([...prev, submission.id]));
      
      try {
        const { error } = await supabase.functions.invoke('analyze-public-pdf', {
          body: { reportId: submission.report_id }
        });

        if (error) {
          console.error('Error analyzing submission:', error);
          toast({
            title: "Analysis Failed",
            description: `Failed to analyze submission: ${error.message}`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Analysis Started",
            description: "PDF analysis has been started. You'll be notified when it's complete.",
          });
          
          // Refetch data after a short delay
          setTimeout(() => {
            refetch();
            queryClient.invalidateQueries({ queryKey: ['companies'] });
          }, 2000);
        }
      } catch (error) {
        console.error('Error in analysis:', error);
        toast({
          title: "Analysis Failed",
          description: "An unexpected error occurred while starting the analysis.",
          variant: "destructive",
        });
      } finally {
        setAnalyzingSubmissions(prev => {
          const newSet = new Set(prev);
          newSet.delete(submission.id);
          return newSet;
        });
      }
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <p className="text-muted-foreground">Please sign in to view submissions.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading submissions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <p className="text-destructive">Error loading submissions: {(error as Error).message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {isIITBombay ? "Eureka Applications" : "New Applications"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {submissions.length > 0 ? (
          <PublicSubmissionsTable 
            submissions={submissions} 
            onAnalyze={handleAnalyze}
            analyzingSubmissions={analyzingSubmissions}
            isIITBombay={isIITBombay}
          />
        ) : (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No submissions found</h3>
            <p className="mt-2 text-muted-foreground">
              {isIITBombay 
                ? "No Eureka applications have been submitted yet." 
                : "No new applications have been submitted yet."
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
