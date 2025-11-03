import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart2, RefreshCw } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StartupSectionMetricsProps {
  submissionId: string;
}

interface SectionData {
  name: string;
  score: number;
  maxScore: number;
  feedback: string;
}

export function StartupSectionMetrics({ submissionId }: StartupSectionMetricsProps) {
  const [loadingSections, setLoadingSections] = useState<Set<string>>(new Set());
  const [sectionSummaries, setSectionSummaries] = useState<Record<string, string>>({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [sections, setSections] = useState<SectionData[]>([]);

  // Fetch evaluation data from submission_evaluations table
  useEffect(() => {
    const fetchEvaluation = async () => {
      try {
        const { data, error } = await supabase
          .from('submission_evaluations')
          .select('*')
          .eq('startup_submission_id', submissionId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching evaluation:', error);
          return;
        }

        if (data) {
          setEvaluation(data);
          
          // Build sections dynamically from ALL evaluation data
          const evaluationSections: SectionData[] = [
            // Problem Validation (max 5 each = 20)
            {
              name: 'Problem Existence',
              score: data.existence_score || 0,
              maxScore: 5,
              feedback: 'Does the problem really exist?'
            },
            {
              name: 'Problem Severity',
              score: data.severity_score || 0,
              maxScore: 5,
              feedback: 'How severe is the problem?'
            },
            {
              name: 'Problem Frequency',
              score: data.frequency_score || 0,
              maxScore: 5,
              feedback: 'How often does this problem occur?'
            },
            {
              name: 'Unmet Need',
              score: data.unmet_need_score || 0,
              maxScore: 5,
              feedback: 'Is there an unmet need in the market?'
            },
            // Solution Fit (max 5 each = 20)
            {
              name: 'Direct Solution Fit',
              score: data.direct_fit_score || 0,
              maxScore: 5,
              feedback: 'How well does the solution fit the problem?'
            },
            {
              name: 'Solution Differentiation',
              score: data.differentiation_score || 0,
              maxScore: 5,
              feedback: 'What makes this solution different?'
            },
            {
              name: 'Solution Feasibility',
              score: data.feasibility_score || 0,
              maxScore: 5,
              feedback: 'Is the solution feasible to build?'
            },
            {
              name: 'Solution Effectiveness',
              score: data.effectiveness_score || 0,
              maxScore: 5,
              feedback: 'How effective is the solution?'
            },
            // Market Opportunity (max 5 each = 20)
            {
              name: 'Market Size',
              score: data.market_size_score || 0,
              maxScore: 5,
              feedback: 'How large is the market opportunity?'
            },
            {
              name: 'Market Growth',
              score: data.growth_trajectory_score || 0,
              maxScore: 5,
              feedback: 'What is the market growth trajectory?'
            },
            {
              name: 'Market Timing',
              score: data.timing_readiness_score || 0,
              maxScore: 5,
              feedback: 'Is the timing right for this solution?'
            },
            {
              name: 'External Catalysts',
              score: data.external_catalysts_score || 0,
              maxScore: 5,
              feedback: 'Are there favorable external factors?'
            },
            // Customer Acquisition (max 5 each = 15)
            {
              name: 'First Customers',
              score: data.first_customers_score || 0,
              maxScore: 5,
              feedback: 'Who are the first customers?'
            },
            {
              name: 'Customer Accessibility',
              score: data.accessibility_score || 0,
              maxScore: 5,
              feedback: 'How accessible are the customers?'
            },
            {
              name: 'Acquisition Approach',
              score: data.acquisition_approach_score || 0,
              maxScore: 5,
              feedback: 'What is the customer acquisition strategy?'
            },
            {
              name: 'Pain Recognition',
              score: data.pain_recognition_score || 0,
              maxScore: 5,
              feedback: 'Do customers recognize their pain?'
            },
            // Competitive Landscape (max 5 each = 20)
            {
              name: 'Direct Competitors',
              score: data.direct_competitors_score || 0,
              maxScore: 5,
              feedback: 'Who are the direct competitors?'
            },
            {
              name: 'Substitutes',
              score: data.substitutes_score || 0,
              maxScore: 5,
              feedback: 'What substitute solutions exist?'
            },
            {
              name: 'Competitive Differentiation',
              score: data.differentiation_vs_players_score || 0,
              maxScore: 5,
              feedback: 'How do you differentiate from competitors?'
            },
            {
              name: 'Market Dynamics',
              score: data.dynamics_score || 0,
              maxScore: 5,
              feedback: 'Understanding of market dynamics'
            },
            // Unique Value Proposition (max 5 each = 20)
            {
              name: 'USP Clarity',
              score: data.usp_clarity_score || 0,
              maxScore: 5,
              feedback: 'How clear is your unique value proposition?'
            },
            {
              name: 'USP Strength',
              score: data.usp_differentiation_strength_score || 0,
              maxScore: 5,
              feedback: 'How strong is your differentiation?'
            },
            {
              name: 'USP Defensibility',
              score: data.usp_defensibility_score || 0,
              maxScore: 5,
              feedback: 'Can your USP be defended?'
            },
            {
              name: 'USP Alignment',
              score: data.usp_alignment_score || 0,
              maxScore: 5,
              feedback: 'Does USP align with market needs?'
            },
            // Technology & Execution (max 5 each = 35)
            {
              name: 'Tech Vision',
              score: data.tech_vision_ambition_score || 0,
              maxScore: 5,
              feedback: 'Vision and ambition of technology'
            },
            {
              name: 'Tech Coherence',
              score: data.tech_coherence_score || 0,
              maxScore: 5,
              feedback: 'Coherence of technical approach'
            },
            {
              name: 'Tech Alignment',
              score: data.tech_alignment_score || 0,
              maxScore: 5,
              feedback: 'Alignment of tech with business goals'
            },
            {
              name: 'Tech Realism',
              score: data.tech_realism_score || 0,
              maxScore: 5,
              feedback: 'Realism of technical claims'
            },
            {
              name: 'Tech Feasibility',
              score: data.tech_feasibility_score || 0,
              maxScore: 5,
              feedback: 'Technical feasibility assessment'
            },
            {
              name: 'Tech Components',
              score: data.tech_components_score || 0,
              maxScore: 5,
              feedback: 'Understanding of tech components'
            },
            {
              name: 'Tech Complexity',
              score: data.tech_complexity_awareness_score || 0,
              maxScore: 5,
              feedback: 'Awareness of technical complexity'
            },
            {
              name: 'Tech Roadmap',
              score: data.tech_roadmap_score || 0,
              maxScore: 5,
              feedback: 'Quality of technical roadmap'
            }
          ].filter(section => section.score > 0); // Only show sections with scores
          
          setSections(evaluationSections);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchEvaluation();
  }, [submissionId]);

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
