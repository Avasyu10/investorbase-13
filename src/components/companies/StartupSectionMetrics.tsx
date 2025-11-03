import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart2 } from "lucide-react";
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

  // Define sections based on evaluation data
  const sections: SectionData[] = [
    {
      name: 'Problem & Solution',
      score: evaluation?.problem_clarity_score || 0,
      maxScore: 20,
      feedback: evaluation?.problem_clarity_feedback || ''
    },
    {
      name: 'Target Customers',
      score: evaluation?.market_understanding_score || 0,
      maxScore: 20,
      feedback: evaluation?.market_understanding_feedback || ''
    },
    {
      name: 'Competitors',
      score: Math.floor((evaluation?.market_understanding_score || 0) * 0.5),
      maxScore: 10,
      feedback: evaluation?.market_understanding_feedback || ''
    },
    {
      name: 'Revenue Model',
      score: Math.floor((evaluation?.solution_quality_score || 0) * 0.5),
      maxScore: 10,
      feedback: evaluation?.solution_quality_feedback || ''
    },
    {
      name: 'USP',
      score: Math.floor((evaluation?.solution_quality_score || 0) * 0.5),
      maxScore: 10,
      feedback: evaluation?.solution_quality_feedback || ''
    },
    {
      name: 'Prototype',
      score: evaluation?.traction_score || 0,
      maxScore: 20,
      feedback: evaluation?.traction_feedback || ''
    }
  ];

  const generateSummary = async (sectionName: string) => {
    if (loadingSections.has(sectionName) || sectionSummaries[sectionName]) {
      return;
    }

    setLoadingSections(prev => new Set(prev).add(sectionName));

    try {
      const { data, error } = await supabase.functions.invoke('generate-startup-section-summary', {
        body: {
          submissionId,
          sectionName
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
              className="border-0 shadow-card hover:shadow-lg transition-shadow cursor-pointer bg-slate-900"
              onClick={() => !isLoading && !summary && generateSummary(section.name)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg font-semibold text-white">
                    {section.name}
                  </CardTitle>
                  <Badge 
                    variant={getBadgeVariant(section.score, section.maxScore)}
                    className="ml-2 shrink-0"
                  >
                    {section.score}/{section.maxScore}
                  </Badge>
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
                  <p className="text-slate-400 italic">
                    Click to generate AI-powered insights for this section
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
