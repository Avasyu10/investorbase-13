import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, FileText, Building, Star, Calendar } from "lucide-react";
import { BarcAnalysisModal } from "@/components/submissions/BarcAnalysisModal";
import { toast } from "sonner";
import { BarcSubmission, BarcAnalysisResult } from "@/types/barc-analysis";
import { analyzeBarcSubmission } from "@/lib/api/barc";
import { useNavigate } from "react-router-dom";

const BarcSubmissions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedSubmission, setSelectedSubmission] = useState<BarcSubmission | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [analyzingSubmissions, setAnalyzingSubmissions] = useState<Set<string>>(new Set());

  const { data: submissions, isLoading, refetch } = useQuery({
    queryKey: ['barc-submissions', user?.id],
    queryFn: async () => {
      if (!user) return [];

      console.log('Fetching BARC submissions for user:', user.id);

      const { data, error } = await supabase
        .from('barc_form_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching BARC submissions:', error);
        throw error;
      }
      
      console.log('BARC submissions fetched:', data?.length || 0);
      
      return (data || []).map(item => ({
        ...item,
        analysis_result: item.analysis_result ? item.analysis_result as unknown as BarcAnalysisResult : null
      })) as BarcSubmission[];
    },
    enabled: !!user,
    refetchInterval: 3000, // Increased polling frequency for better real-time feel
  });

  // Enhanced realtime subscription with automatic navigation
  useEffect(() => {
    if (!user) return;

    console.log('Setting up enhanced realtime subscription for BARC submissions page with auto-navigation');

    // Listen for custom events from the global realtime subscription
    const handleSubmissionAdded = (event: CustomEvent) => {
      console.log('🎯 Received barcSubmissionAdded event:', event.detail);
      refetch(); // Refresh the submissions list
    };

    const handleSubmissionUpdated = (event: CustomEvent) => {
      console.log('📊 Received barcSubmissionUpdated event:', event.detail);
      refetch(); // Refresh the submissions list
      
      // Handle auto-navigation when analysis completes
      const { submissionId, newStatus, companyId } = event.detail;
      
      if (newStatus === 'completed' && companyId) {
        console.log('🎉 Analysis completed in BARC submissions page, navigating to company...');
        
        // Navigate to company page after a short delay
        setTimeout(() => {
          navigate(`/company/${companyId}`);
        }, 2500); // Slightly longer delay to allow toast to be seen
      }
      
      // Remove from analyzing set if analysis completed
      if (newStatus === 'completed' || newStatus === 'failed' || newStatus === 'error') {
        setAnalyzingSubmissions(prev => {
          const newSet = new Set(prev);
          newSet.delete(submissionId);
          return newSet;
        });
      }
    };

    // Add event listeners for custom events
    window.addEventListener('barcSubmissionAdded', handleSubmissionAdded as EventListener);
    window.addEventListener('barcSubmissionUpdated', handleSubmissionUpdated as EventListener);

    // Also set up direct realtime subscription for this page
    const channel = supabase
      .channel('barc_submissions_page_realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'barc_form_submissions'
        },
        (payload) => {
          console.log('📊 Direct realtime BARC submission update:', payload);
          
          // Auto-refresh data
          refetch();
          
          const newStatus = payload.new.analysis_status;
          const submissionId = payload.new.id;
          const companyId = payload.new.company_id;
          
          // Handle auto-navigation for direct realtime updates too
          if (newStatus === 'completed' && companyId) {
            console.log('🎉 Analysis completed via direct realtime, navigating to company...');
            setTimeout(() => {
              navigate(`/company/${companyId}`);
            }, 2500);
          }
          
          // Remove from analyzing set when analysis completes
          if (newStatus === 'completed' || newStatus === 'failed' || newStatus === 'error') {
            setAnalyzingSubmissions(prev => {
              const newSet = new Set(prev);
              newSet.delete(submissionId);
              return newSet;
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🧹 Cleaning up BARC submissions page subscriptions');
      window.removeEventListener('barcSubmissionAdded', handleSubmissionAdded as EventListener);
      window.removeEventListener('barcSubmissionUpdated', handleSubmissionUpdated as EventListener);
      supabase.removeChannel(channel);
    };
  }, [user, refetch, navigate]);

  const triggerAnalysis = async (submissionId: string) => {
    if (analyzingSubmissions.has(submissionId)) {
      console.log('Analysis already in progress for submission:', submissionId);
      return;
    }

    const submission = submissions?.find(s => s.id === submissionId);
    if (submission?.analysis_status === 'processing' || submission?.analysis_status === 'completed') {
      console.log('Submission already processed or in progress:', submissionId);
      return;
    }

    try {
      console.log('Triggering analysis for submission:', submissionId);
      
      // Add to analyzing set to show loading state
      setAnalyzingSubmissions(prev => new Set(prev).add(submissionId));
      
      // Show initial loading message
      toast.loading("Starting analysis...", { 
        id: `analysis-${submissionId}`,
        description: "This may take a few moments. You will be automatically redirected when complete." 
      });
      
      // Trigger the analysis and wait for completion
      const result = await analyzeBarcSubmission(submissionId);
      
      // Dismiss loading toast
      toast.dismiss(`analysis-${submissionId}`);
      
      if (result?.success && result?.companyId) {
        toast.success("Analysis completed successfully!", {
          description: "Redirecting to company page..."
        });
        
        // Navigate directly to the company details page
        setTimeout(() => {
          navigate(`/company/${result.companyId}`);
        }, 2000);
      } else {
        throw new Error('Analysis failed - no company created');
      }

      // Refetch to get updated data
      refetch();
    } catch (error: any) {
      console.error('Analysis trigger error:', error);
      
      // Dismiss loading toast
      toast.dismiss(`analysis-${submissionId}`);
      
      if (error.message?.includes('already being analyzed') || error.message?.includes('already being processed')) {
        console.log('Submission is already being analyzed, this is expected');
        toast.info("Analysis is already in progress for this submission.");
      } else {
        toast.error(`Failed to complete analysis: ${error.message}`);
        
        // Reset status back to pending if there was a real error
        await supabase
          .from('barc_form_submissions')
          .update({ analysis_status: 'pending' })
          .eq('id', submissionId);
      }
    } finally {
      // Remove from analyzing set
      setAnalyzingSubmissions(prev => {
        const newSet = new Set(prev);
        newSet.delete(submissionId);
        return newSet;
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Analyzed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Pending</Badge>;
    }
  };

  const getRecommendationBadge = (recommendation: string) => {
    switch (recommendation) {
      case 'Accept':
        return <Badge className="bg-green-100 text-green-800">Accept</Badge>;
      case 'Consider':
        return <Badge className="bg-yellow-100 text-yellow-800">Consider</Badge>;
      case 'Reject':
        return <Badge className="bg-red-100 text-red-800">Reject</Badge>;
      default:
        return null;
    }
  };

  const getAnalysisResult = (submission: BarcSubmission): BarcAnalysisResult | null => {
    return submission.analysis_result || null;
  };

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>Loading BARC submissions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">BARC Form Submissions</h1>
        <p className="text-muted-foreground">
          Manage and analyze applications from your BARC forms. Analysis results will automatically open when complete.
        </p>
      </div>

      {submissions && submissions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No submissions yet</h3>
            <p className="text-muted-foreground text-center">
              BARC form submissions will appear here once applicants start submitting their applications.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {submissions?.map((submission) => {
            const analysisResult = getAnalysisResult(submission);
            const isAnalyzing = analyzingSubmissions.has(submission.id);
            
            return (
              <Card key={submission.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Building className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-xl">{submission.company_name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {submission.company_type} • {submission.company_registration_type}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(submission.analysis_status || 'pending')}
                      {analysisResult?.recommendation && 
                        getRecommendationBadge(analysisResult.recommendation)
                      }
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Submitted {new Date(submission.created_at).toLocaleDateString()}
                    </div>
                    {submission.submitter_email && (
                      <div>Contact: {submission.submitter_email}</div>
                    )}
                    {analysisResult?.overall_score && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        Score: {Math.round(analysisResult.overall_score)}/100
                      </div>
                    )}
                  </div>

                  <p className="text-sm line-clamp-3">
                    {submission.executive_summary}
                  </p>

                  <div className="flex items-center gap-2 pt-4">
                    {submission.analysis_status === 'completed' ? (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSubmission(submission);
                            setIsAnalysisModalOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Analysis
                        </Button>
                        {submission.company_id && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => navigate(`/company/${submission.company_id}`)}
                          >
                            <Building className="h-4 w-4 mr-2" />
                            View Company
                          </Button>
                        )}
                      </div>
                    ) : submission.analysis_status === 'processing' || isAnalyzing ? (
                      <Button variant="outline" size="sm" disabled>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing... (Auto-redirect when complete)
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => triggerAnalysis(submission.id)}
                        disabled={isAnalyzing}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Start Analysis
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <BarcAnalysisModal
        isOpen={isAnalysisModalOpen}
        onClose={() => {
          setIsAnalysisModalOpen(false);
          setSelectedSubmission(null);
        }}
        submission={selectedSubmission}
        onRefresh={refetch}
      />
    </div>
  );
};

export default BarcSubmissions;
