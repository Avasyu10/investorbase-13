import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart2, Lightbulb, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface IITGuwahatiOverallAssessmentProps {
  submissionId: string;
  companyName: string;
}

interface Evaluation {
  overall_score: number;
  overall_summary: string;
  problem_score: number;
  problem_feedback: string;
  solution_score: number;
  solution_feedback: string;
  product_score: number;
  product_feedback: string;
  business_model_score: number;
  business_model_feedback: string;
  finances_score: number;
  finances_feedback: string;
  patents_legalities_score: number;
  patents_legalities_feedback: string;
  future_goals_score: number;
  future_goals_feedback: string;
}

export function IITGuwahatiOverallAssessment({ 
  submissionId,
  companyName
}: IITGuwahatiOverallAssessmentProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const fetchEvaluation = async () => {
    try {
      const { data, error } = await supabase
        .from('iitguwahati_evaluations')
        .select('*')
        .eq('submission_id', submissionId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching evaluation:', error);
      } else if (data) {
        setEvaluation(data);
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
        setEvaluation(data.evaluation);
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

  // Score is already 0-100
  const displayScore = evaluation?.overall_score || 0;
  const progressPercentage = displayScore;

  // Generate assessment points from evaluation sections
  const generateAssessmentPoints = (): string[] => {
    if (!evaluation) return [];
    
    const points: string[] = [];
    
    if (evaluation.overall_summary) {
      points.push(evaluation.overall_summary);
    }
    
    // Add insights based on scores
    if (evaluation.problem_score >= 70) {
      points.push("Strong problem identification and market understanding demonstrate clear customer pain point awareness.");
    } else if (evaluation.problem_score >= 50) {
      points.push("Problem definition shows promise but requires more market validation and customer research.");
    }
    
    if (evaluation.solution_score >= 70) {
      points.push("The solution approach demonstrates innovation and clear differentiation from existing alternatives.");
    } else if (evaluation.solution_score >= 50) {
      points.push("Solution shows potential but competitive positioning needs strengthening.");
    }
    
    if (evaluation.business_model_score >= 70) {
      points.push("Business model presents clear revenue opportunities with scalable unit economics.");
    } else if (evaluation.business_model_score >= 50) {
      points.push("Revenue model needs refinement and validation against market benchmarks.");
    }
    
    if (evaluation.finances_score >= 70) {
      points.push("Financial metrics and traction indicators show strong commercial viability.");
    } else if (evaluation.finances_score >= 50) {
      points.push("Financial projections require further validation and market traction evidence.");
    }
    
    if (evaluation.future_goals_score >= 70) {
      points.push("Clear roadmap and vision alignment support long-term growth potential.");
    } else if (evaluation.future_goals_score >= 50) {
      points.push("Future goals would benefit from more concrete milestone definitions.");
    }

    return points.slice(0, 7); // Max 7 points
  };

  const displayPoints = generateAssessmentPoints();

  // Section breakdown data from evaluation
  const sectionBreakdownData = evaluation ? [
    { name: "Problem", score: evaluation.problem_score || 0 },
    { name: "Solution", score: evaluation.solution_score || 0 },
    { name: "Product", score: evaluation.product_score || 0 },
    { name: "Business Model", score: evaluation.business_model_score || 0 },
    { name: "Finances", score: evaluation.finances_score || 0 },
    { name: "Patents & IP", score: evaluation.patents_legalities_score || 0 },
    { name: "Future Goals", score: evaluation.future_goals_score || 0 },
  ] : [];

  const chartConfig = {
    score: {
      label: "Score",
      color: "hsl(var(--chart-1))",
    },
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-blue-500";
    if (score >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 75) return "High Potential";
    if (score >= 50) return "Medium Potential";
    return "Low Potential";
  };

  if (isLoading) {
    return (
      <Card className="shadow-card border-0 mb-6 bg-gradient-to-br from-secondary/30 via-secondary/20 to-background">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!evaluation) {
    return (
      <Card className="shadow-card border-0 mb-6 bg-gradient-to-br from-secondary/30 via-secondary/20 to-background">
        <CardHeader className="border-b pb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl font-semibold">Overall Assessment</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">AI Evaluation Available</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Run AI-powered evaluation to get a comprehensive score and assessment of this startup across 7 key criteria.
            </p>
            <Button 
              onClick={runEvaluation} 
              disabled={isEvaluating}
              size="lg"
              className="flex items-center gap-2"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Run AI Evaluation
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card border-0 mb-6 bg-gradient-to-br from-secondary/30 via-secondary/20 to-background">
      <CardHeader className="border-b pb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl font-semibold">Overall Assessment</CardTitle>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span className={`text-xl font-bold ${getScoreColor(displayScore)}`}>
                {displayScore}
              </span>
              <span className="text-sm text-muted-foreground">/100</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-5">
        <div className="mb-6">
          <Progress 
            value={progressPercentage} 
            className="h-2" 
          />
        </div>
        
        <div className="space-y-1">
          {displayPoints.map((point, index) => (
            <div 
              key={index} 
              className="flex items-start gap-3 p-1.5 rounded-lg border-0"
            >
              <Lightbulb className="h-5 w-5 mt-0.5 text-amber-500 shrink-0" />
              <span className="text-sm leading-relaxed">{point}</span>
            </div>
          ))}
        </div>
        
        <div className="flex justify-end mt-6">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="link" 
                className="text-amber-500 hover:text-amber-400 flex items-center gap-1 px-0"
              >
                View Full Analysis <ExternalLink className="h-4 w-4 ml-1" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-primary" />
                  Full Analysis Report - {companyName}
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[75vh] pr-4">
                <div className="space-y-8">
                  {/* Score Overview */}
                  <div className="bg-secondary/20 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Score Overview</h3>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className={`text-3xl font-bold ${getScoreColor(displayScore)}`}>
                          {displayScore}
                        </div>
                        <div className="text-sm text-muted-foreground">out of 100</div>
                      </div>
                      <div className={`text-sm font-medium ${getScoreColor(displayScore)}`}>
                        {getScoreLabel(displayScore)}
                      </div>
                    </div>
                    <Progress value={progressPercentage} className="h-3" />
                  </div>

                  {/* Section Performance Chart */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <BarChart2 className="h-5 w-5 text-primary" />
                      Section Performance Analysis
                    </h3>
                    <div className="bg-card border rounded-lg p-6">
                      <ChartContainer config={chartConfig} className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={sectionBreakdownData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <XAxis 
                              dataKey="name" 
                              angle={-45}
                              textAnchor="end"
                              height={80}
                              fontSize={12}
                            />
                            <YAxis domain={[0, 100]} />
                            <ChartTooltip 
                              content={<ChartTooltipContent />}
                              formatter={(value) => [`${value}/100`, "Score"]}
                            />
                            <Bar 
                              dataKey="score" 
                              fill="hsl(var(--primary))"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  </div>

                  {/* Comprehensive Score Breakdown */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Comprehensive Score Breakdown</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sectionBreakdownData.map((section, index) => (
                        <div key={index} className="bg-card border rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">{section.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {section.score}/100
                            </span>
                          </div>
                          <Progress value={section.score} className="h-2" />
                          <div className="mt-2 text-xs text-muted-foreground">
                            {section.score >= 75 ? "High Potential" : 
                             section.score >= 50 ? "Medium Potential" : 
                             "Low Potential"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  {evaluation.overall_summary && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-amber-500" />
                        Executive Summary
                      </h3>
                      <div className="bg-card border rounded-lg p-4">
                        <p className="text-sm leading-relaxed">{evaluation.overall_summary}</p>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
