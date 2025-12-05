import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, RefreshCw } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from 'react-markdown';

interface SectionData {
  score: number;
  feedback: string;
  fromCache: boolean;
}

export default function IITGuwahatiSectionDetail() {
  const { submissionId, sectionType } = useParams<{ submissionId: string; sectionType: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [sectionData, setSectionData] = useState<SectionData | null>(null);
  const [sectionInfo, setSectionInfo] = useState<{ title: string; description: string } | null>(null);

  const sectionTypeMap: Record<string, { title: string; description: string; scoreField: string; feedbackField: string }> = {
    'PROBLEM': { 
      title: 'The Problem', 
      description: 'Problem identification and market need validation',
      scoreField: 'problem_score',
      feedbackField: 'problem_feedback'
    },
    'SOLUTION': { 
      title: 'The Solution', 
      description: 'Solution effectiveness and innovation',
      scoreField: 'solution_score',
      feedbackField: 'solution_feedback'
    },
    'PRODUCT': { 
      title: 'The Product', 
      description: 'Product development and market fit',
      scoreField: 'product_score',
      feedbackField: 'product_feedback'
    },
    'BUSINESS_MODEL': { 
      title: 'Business Model', 
      description: 'Revenue strategy and business viability',
      scoreField: 'business_model_score',
      feedbackField: 'business_model_feedback'
    },
    'FINANCES': { 
      title: 'Finances', 
      description: 'Financial planning and funding requirements',
      scoreField: 'finances_score',
      feedbackField: 'finances_feedback'
    },
    'PATENTS': { 
      title: 'Patents & Legalities', 
      description: 'Intellectual property and legal considerations',
      scoreField: 'patents_legalities_score',
      feedbackField: 'patents_legalities_feedback'
    },
    'FUTURE_GOALS': { 
      title: 'Future Goals', 
      description: 'Growth roadmap and long-term vision',
      scoreField: 'future_goals_score',
      feedbackField: 'future_goals_feedback'
    },
  };

  const fetchSectionData = async () => {
    if (!submissionId || !sectionType) return;

    try {
      const sectionConfig = sectionTypeMap[sectionType];
      if (!sectionConfig) {
        throw new Error('Invalid section type');
      }

      const { data: evaluation, error } = await supabase
        .from('iitguwahati_evaluations')
        .select('*')
        .eq('submission_id', submissionId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching evaluation:', error);
        throw error;
      }

      if (evaluation) {
        const score = (evaluation as any)[sectionConfig.scoreField] || 0;
        const feedback = (evaluation as any)[sectionConfig.feedbackField] || '';
        
        setSectionData({
          score,
          feedback,
          fromCache: true
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load section data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const regenerateEvaluation = async () => {
    if (!submissionId) return;
    
    setIsRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('evaluate-iitguwahati-submission', {
        body: { submissionId, forceRefresh: true }
      });

      if (error) {
        console.error('Regeneration error:', error);
        toast({
          title: "Regeneration Failed",
          description: error.message || "Could not regenerate the evaluation",
          variant: "destructive",
        });
        return;
      }

      if (data?.success) {
        toast({
          title: "Evaluation Regenerated",
          description: "AI evaluation completed successfully",
        });
        await fetchSectionData();
      }
    } catch (error) {
      console.error('Error regenerating evaluation:', error);
      toast({
        title: "Error",
        description: "Failed to regenerate evaluation",
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  useEffect(() => {
    if (sectionType) {
      const config = sectionTypeMap[sectionType];
      if (config) {
        setSectionInfo({ title: config.title, description: config.description });
      }
    }
    fetchSectionData();
  }, [submissionId, sectionType]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-amber-600";
    if (score >= 20) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "outline" | "destructive" => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    if (score >= 40) return "outline";
    return "destructive";
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 60) return "bg-blue-500";
    if (score >= 40) return "bg-amber-500";
    if (score >= 20) return "bg-orange-500";
    return "bg-red-500";
  };

  const formatFeedback = (feedback: string): string => {
    if (!feedback) return '';
    
    // Try to parse as JSON array
    try {
      const parsed = JSON.parse(feedback);
      if (Array.isArray(parsed)) {
        return parsed.map(item => `• ${item}`).join('\n\n');
      }
    } catch {
      // Not JSON, return as-is
    }
    
    return feedback;
  };

  if (isLoading) {
    return (
      <div className="w-full px-6 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Section Metrics
        </Button>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!sectionInfo) {
    return (
      <div className="w-full px-6 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Section Metrics
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Section Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The requested section could not be found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-8">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Section Metrics
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{sectionInfo.title}</h1>
        <p className="text-muted-foreground">{sectionInfo.description}</p>
      </div>

      {sectionData && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Score Overview</CardTitle>
                <Badge 
                  variant={getScoreBadgeVariant(sectionData.score)} 
                  className="text-lg px-4 py-1 bg-amber-400 text-slate-950 hover:bg-amber-400"
                >
                  {sectionData.score}/100
                </Badge>
              </div>
              <div className="relative mt-4">
                <Progress value={sectionData.score} className="h-3" />
                <div 
                  className={`absolute top-0 left-0 h-3 rounded-full transition-all ${getProgressColor(sectionData.score)}`}
                  style={{ width: `${sectionData.score}%` }}
                />
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">AI Analysis</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={regenerateEvaluation}
                  disabled={isRegenerating}
                >
                  {isRegenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Regenerate
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ReactMarkdown
                className="prose prose-sm max-w-none dark:prose-invert"
                components={{
                  p: ({ children }) => <p className="text-base leading-relaxed mb-3">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                  ul: ({ children }) => <ul className="space-y-2 ml-4">{children}</ul>,
                  ol: ({ children }) => <ol className="space-y-2 ml-4">{children}</ol>,
                  li: ({ children }) => (
                    <li className="text-base leading-relaxed flex items-start gap-2">
                      <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                      <span>{children}</span>
                    </li>
                  ),
                }}
              >
                {formatFeedback(sectionData.feedback)}
              </ReactMarkdown>
              
              {sectionData.fromCache && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground italic">
                    This analysis was retrieved from cache. Click "Regenerate" for a fresh analysis.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!sectionData && !isLoading && (
        <Card>
          <CardHeader>
            <CardTitle>No Analysis Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">No analysis has been generated for this section yet.</p>
            <Button onClick={regenerateEvaluation} disabled={isRegenerating}>
              {isRegenerating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Generate Analysis
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
