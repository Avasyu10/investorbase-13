import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart2, Sparkles, RefreshCw } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from 'react-markdown';

interface IITGuwahatiSectionMetricsProps {
  submissionId: string;
}

interface SectionGroup {
  title: string;
  type: string;
  score: number;
  feedback: string;
}

export function IITGuwahatiSectionMetrics({ submissionId }: IITGuwahatiSectionMetricsProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [sectionGroups, setSectionGroups] = useState<SectionGroup[]>([]);
  const [hasEvaluation, setHasEvaluation] = useState(false);

  const fetchEvaluation = async () => {
    try {
      const { data: evaluation, error } = await supabase
        .from('iitguwahati_evaluations')
        .select('*')
        .eq('submission_id', submissionId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching evaluation:', error);
        setIsLoading(false);
        return;
      }

      if (evaluation) {
        setHasEvaluation(true);
        const groups: SectionGroup[] = [
          {
            title: 'The Problem',
            type: 'PROBLEM',
            score: evaluation.problem_score || 0,
            feedback: evaluation.problem_feedback || '',
          },
          {
            title: 'The Solution',
            type: 'SOLUTION',
            score: evaluation.solution_score || 0,
            feedback: evaluation.solution_feedback || '',
          },
          {
            title: 'The Product',
            type: 'PRODUCT',
            score: evaluation.product_score || 0,
            feedback: evaluation.product_feedback || '',
          },
          {
            title: 'Business Model',
            type: 'BUSINESS_MODEL',
            score: evaluation.business_model_score || 0,
            feedback: evaluation.business_model_feedback || '',
          },
          {
            title: 'Finances',
            type: 'FINANCES',
            score: evaluation.finances_score || 0,
            feedback: evaluation.finances_feedback || '',
          },
          {
            title: 'Patents & Legalities',
            type: 'PATENTS',
            score: evaluation.patents_legalities_score || 0,
            feedback: evaluation.patents_legalities_feedback || '',
          },
          {
            title: 'Future Goals',
            type: 'FUTURE_GOALS',
            score: evaluation.future_goals_score || 0,
            feedback: evaluation.future_goals_feedback || '',
          },
        ];
        setSectionGroups(groups);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvaluation();
  }, [submissionId]);

  const runEvaluation = async () => {
    setIsEvaluating(true);
    try {
      const { data, error } = await supabase.functions.invoke('evaluate-iitguwahati-submission', {
        body: { submissionId }
      });

      if (error) {
        console.error('Evaluation error:', error);
        toast({
          title: "Evaluation Failed",
          description: error.message || "Could not complete the evaluation",
          variant: "destructive",
        });
        return;
      }

      if (data?.success) {
        toast({
          title: "Evaluation Complete",
          description: data.cached ? "Using cached evaluation" : "AI evaluation completed successfully",
        });
        await fetchEvaluation();
      }
    } catch (error) {
      console.error('Error running evaluation:', error);
      toast({
        title: "Error",
        description: "Failed to run evaluation",
        variant: "destructive",
      });
    } finally {
      setIsEvaluating(false);
    }
  };

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
      <div className="mb-8">
        <h2 className="text-2xl font-bold mt-12 mb-6 flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-primary" />
          Pitch Deck Evaluation
        </h2>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!hasEvaluation) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold mt-12 mb-6 flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-primary" />
          Pitch Deck Evaluation
        </h2>
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              AI Evaluation Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Run AI-powered evaluation to get detailed scores and feedback on this submission across 7 criteria.
            </p>
            <Button 
              onClick={runEvaluation} 
              disabled={isEvaluating}
              className="flex items-center gap-2"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Evaluating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Run AI Evaluation
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mt-12 mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-primary" />
          Pitch Deck Evaluation
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={runEvaluation}
          disabled={isEvaluating}
          className="flex items-center gap-2"
        >
          {isEvaluating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Re-evaluate
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sectionGroups.map((section) => (
          <Card
            key={section.type}
            className="hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:shadow-xl h-full flex flex-col bg-card"
          >
            <CardHeader className="pb-2 flex-shrink-0">
              <div className="flex items-start justify-between mb-2">
                <CardTitle className="text-base font-semibold">{section.title}</CardTitle>
                <Badge 
                  variant={getScoreBadgeVariant(section.score)} 
                  className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                >
                  {section.score}/100
                </Badge>
              </div>
              <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`absolute top-0 left-0 h-full rounded-full transition-all ${getProgressColor(section.score)}`}
                  style={{ width: `${section.score}%` }}
                />
              </div>
            </CardHeader>
            <CardContent className="pt-3 flex-1 flex flex-col overflow-hidden">
              {section.feedback ? (
                <ReactMarkdown
                  className="text-sm"
                  components={{
                    p: ({ children }) => <p className="text-foreground leading-relaxed mb-2">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    ul: ({ children }) => <ul className="space-y-1">{children}</ul>,
                    li: ({ children }) => (
                      <li className="text-foreground leading-relaxed flex items-start gap-2 text-sm">
                        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                        <span>{children}</span>
                      </li>
                    ),
                  }}
                >
                  {formatFeedback(section.feedback)}
                </ReactMarkdown>
              ) : (
                <p className="text-sm text-muted-foreground italic">No feedback available</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
