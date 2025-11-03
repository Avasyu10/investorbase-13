import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart2, RefreshCw } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StartupSectionMetricsProps {
  submissionId: string;
  evaluation: any;
}

interface SectionData {
  name: string;
  score: number;
  maxScore: number;
  feedback: string;
}

export function StartupSectionMetrics({ submissionId, evaluation }: StartupSectionMetricsProps) {
  const [loadingSections, setLoadingSections] = useState<Set<string>>(new Set());
  const [sectionSummaries, setSectionSummaries] = useState<Record<string, string>>({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Define sections based on all evaluation metrics
  const sections: SectionData[] = [
    {
      name: 'Problem Clarity',
      score: evaluation?.problem_clarity_score || 0,
      maxScore: 20,
      feedback: evaluation?.problem_clarity_feedback || ''
    },
    {
      name: 'Market Understanding',
      score: evaluation?.market_understanding_score || 0,
      maxScore: 20,
      feedback: evaluation?.market_understanding_feedback || ''
    },
    {
      name: 'Solution Quality',
      score: evaluation?.solution_quality_score || 0,
      maxScore: 20,
      feedback: evaluation?.solution_quality_feedback || ''
    },
    {
      name: 'Team Capability',
      score: evaluation?.team_capability_score || 0,
      maxScore: 20,
      feedback: evaluation?.team_capability_feedback || ''
    },
    {
      name: 'Traction',
      score: evaluation?.traction_score || 0,
      maxScore: 20,
      feedback: evaluation?.traction_feedback || ''
    }
  ];

  // Load existing summaries from database on component mount
  useEffect(() => {
    const loadExistingSummaries = async () => {
      try {
        const { data, error } = await supabase
          .from('startup_section_summaries')
          .select('section_name, summary')
          .eq('submission_id', submissionId);

        if (error) {
          console.error('Error loading summaries:', error);
          return;
        }

        if (data && data.length > 0) {
          const summariesMap: Record<string, string> = {};
          data.forEach(item => {
            summariesMap[item.section_name] = item.summary;
          });
          setSectionSummaries(summariesMap);
          console.log(`Loaded ${data.length} existing summaries from database`);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadExistingSummaries();
  }, [submissionId]);

  const generateSummary = async (sectionName: string, forceRefresh = false) => {
    if (loadingSections.has(sectionName)) {
      return;
    }

    // If not forcing refresh and summary exists, don't regenerate
    if (!forceRefresh && sectionSummaries[sectionName]) {
      return;
    }

    setLoadingSections(prev => new Set(prev).add(sectionName));

    try {
      const { data, error } = await supabase.functions.invoke('generate-startup-section-summary', {
        body: {
          submissionId,
          sectionName,
          forceRefresh
        }
      });

      if (error) {
        console.error('Error generating summary:', error);
        toast.error('Failed to generate summary', {
          description: error.message || 'Please try again later'
        });
        return;
      }

      if (data?.summary) {
        setSectionSummaries(prev => ({
          ...prev,
          [sectionName]: data.summary
        }));
        
        if (forceRefresh) {
          toast.success('Summary refreshed successfully');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to generate summary');
    } finally {
      setLoadingSections(prev => {
        const next = new Set(prev);
        next.delete(sectionName);
        return next;
      });
    }
  };

  const getScoreColor = (score: number, maxScore: number): string => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    if (percentage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getBadgeVariant = (score: number, maxScore: number): "default" | "destructive" | "secondary" => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 60) return 'default';
    if (percentage >= 40) return 'secondary';
    return 'destructive';
  };

  const parseSummaryIntoBullets = (summary: string): string[] => {
    // Split by bullet points or numbered lists
    const bullets = summary
      .split(/\n[•\-\*\d+\.]\s*/)
      .map(b => b.trim())
      .filter(b => b.length > 0);
    
    return bullets.length > 0 ? bullets : [summary];
  };

  if (!evaluation) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-primary" />
          Section Metrics
        </h2>
        <Card className="border-0 shadow-card">
          <CardContent className="p-6 text-center text-muted-foreground">
            No evaluation data available yet.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isInitialLoading) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-primary" />
          Section Metrics
        </h2>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <BarChart2 className="h-5 w-5 text-primary" />
        Section Metrics
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map((section) => {
          const isLoading = loadingSections.has(section.name);
          const summary = sectionSummaries[section.name];
          const bullets = summary ? parseSummaryIntoBullets(summary) : [];

          return (
            <Card
              key={section.name}
              className="border-0 shadow-card hover:shadow-lg transition-shadow bg-slate-900"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg font-semibold text-white">
                    {section.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {summary && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          generateSummary(section.name, true);
                        }}
                        disabled={isLoading}
                        className="h-7 w-7 p-0 hover:bg-slate-700"
                        title="Refresh summary"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
                      </Button>
                    )}
                    <Badge 
                      variant={getBadgeVariant(section.score, section.maxScore)}
                      className="ml-2 shrink-0"
                    >
                      {section.score}/{section.maxScore}
                    </Badge>
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full mt-3">
                  <div
                    className={`h-full rounded-full transition-all ${getScoreColor(section.score, section.maxScore)}`}
                    style={{ width: `${(section.score / section.maxScore) * 100}%` }}
                  />
                </div>
              </CardHeader>
              
              <CardContent className="text-sm">
                {isLoading ? (
                  <div className="flex items-center justify-center py-4 text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Generating insights...
                  </div>
                ) : summary ? (
                  <ul className="space-y-2 text-slate-300">
                    {bullets.map((bullet, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-400 mt-1 shrink-0">•</span>
                        <span className="leading-relaxed">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center">
                    <p className="text-slate-400 italic mb-3">
                      No AI insights generated yet
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateSummary(section.name)}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 border-0"
                    >
                      Generate Insights
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
