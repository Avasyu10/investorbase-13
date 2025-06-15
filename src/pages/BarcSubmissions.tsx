import { useState } from "react";
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
    refetchInterval: 5000,
  });

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
        description: "This may take a few moments. Please wait..." 
      });
      
      // Trigger the analysis and wait for completion
      const result = await analyzeBarcSubmission(submissionId);
      
      // Dismiss loading toast
      toast.dismiss(`analysis-${submissionId}`);
      
      if (result?.success && result?.companyId) {
        toast.success("Analysis completed successfully!", {
          description: "Company has been created and analyzed."
        });
        
        // Navigate directly to the company details page
        navigate(`/company/${result.companyId}`);
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
          Manage and analyze applications from your BARC forms
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
                        Analyzing...
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
