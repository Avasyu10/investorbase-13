import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart2, Sparkles } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface StartupSectionMetricsProps {
  submissionId: string;
}

interface SectionGroup {
  title: string;
  type: string;
  score: number;
  description: string;
  items: string[];
  summary?: string;
  isLoadingSummary?: boolean;
}

export function StartupSectionMetrics({ submissionId }: StartupSectionMetricsProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [sectionGroups, setSectionGroups] = useState<SectionGroup[]>([]);

  // Fetch evaluation data and group into sections
  useEffect(() => {
    const fetchEvaluation = async () => {
      try {
        // First get the startup submission to get the startup name
        const { data: submission, error: submissionError } = await supabase
          .from('startup_submissions')
          .select('startup_name')
          .eq('id', submissionId)
          .single();

        if (submissionError) {
          console.error('Error fetching submission:', submissionError);
          setIsLoading(false);
          return;
        }

        // Try to find evaluation by submission_id OR startup_name
        const { data: evaluations, error } = await supabase
          .from('submission_evaluations')
          .select('*')
          .or(`startup_submission_id.eq.${submissionId},startup_name.eq.${submission.startup_name}`)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching evaluation:', error);
          setIsLoading(false);
          return;
        }

        // Use the first (most recent) evaluation found
        const data = evaluations && evaluations.length > 0 ? evaluations[0] : null;

        if (data) {
          // Helper function for stricter scoring (exponential scaling makes it harder to get high scores)
          const calculateStrictScore = (scores: number[], maxIndividual: number = 5): number => {
            const validScores = scores.map(s => Math.min(maxIndividual, s || 0));
            const avg = validScores.reduce((a, b) => a + b, 0) / validScores.length;
            // Exponential scaling: score^1.5 to make higher scores harder to achieve
            const strictScore = Math.pow(avg / maxIndividual, 1.5) * 100;
            return Math.min(100, Math.round(strictScore));
          };

          // Group scores into logical sections like in companies page
          const groups: SectionGroup[] = [
            {
              title: 'Problem & Solution',
              type: 'PROBLEM',
              score: calculateStrictScore([data.existence_score, data.severity_score, data.frequency_score, data.unmet_need_score]),
              description: 'Problem validation and solution fit',
              items: [
                `Problem Existence: ${Math.min(5, data.existence_score || 0)}/5`,
                `Severity: ${Math.min(5, data.severity_score || 0)}/5`,
                `Frequency: ${Math.min(5, data.frequency_score || 0)}/5`,
                `Unmet Need: ${Math.min(5, data.unmet_need_score || 0)}/5`
              ].filter(item => !item.includes('0/5'))
            },
            {
              title: 'Target Customers',
              type: 'TRACTION',
              score: calculateStrictScore([data.first_customers_score, data.accessibility_score, data.acquisition_approach_score, data.pain_recognition_score]),
              description: 'Customer validation and market access',
              items: [
                `First Customers: ${Math.min(5, data.first_customers_score || 0)}/5`,
                `Accessibility: ${Math.min(5, data.accessibility_score || 0)}/5`,
                `Acquisition Approach: ${Math.min(5, data.acquisition_approach_score || 0)}/5`,
                `Pain Recognition: ${Math.min(5, data.pain_recognition_score || 0)}/5`
              ].filter(item => !item.includes('0/5'))
            },
            {
              title: 'Competitors',
              type: 'COMPETITIVE_LANDSCAPE',
              score: calculateStrictScore([data.direct_competitors_score, data.substitutes_score, data.differentiation_vs_players_score, data.dynamics_score]),
              description: 'Competitive landscape and differentiation',
              items: [
                `Direct Competitors: ${Math.min(5, data.direct_competitors_score || 0)}/5`,
                `Substitutes: ${Math.min(5, data.substitutes_score || 0)}/5`,
                `Differentiation: ${Math.min(5, data.differentiation_vs_players_score || 0)}/5`,
                `Market Dynamics: ${Math.min(5, data.dynamics_score || 0)}/5`
              ].filter(item => !item.includes('0/5'))
            },
            {
              title: 'Revenue Model',
              type: 'BUSINESS_MODEL',
              score: calculateStrictScore([data.usp_clarity_score, data.usp_differentiation_strength_score, data.usp_defensibility_score, data.usp_alignment_score]),
              description: 'Business model and revenue strategy',
              items: [
                `USP Clarity: ${Math.min(5, data.usp_clarity_score || 0)}/5`,
                `USP Strength: ${Math.min(5, data.usp_differentiation_strength_score || 0)}/5`,
                `Defensibility: ${Math.min(5, data.usp_defensibility_score || 0)}/5`,
                `Market Alignment: ${Math.min(5, data.usp_alignment_score || 0)}/5`
              ].filter(item => !item.includes('0/5'))
            },
            {
              title: 'USP',
              type: 'USP',
              score: calculateStrictScore([data.direct_fit_score, data.differentiation_score, data.feasibility_score, data.effectiveness_score]),
              description: 'Unique selling proposition and differentiation',
              items: [
                `Direct Fit: ${Math.min(5, data.direct_fit_score || 0)}/5`,
                `Differentiation: ${Math.min(5, data.differentiation_score || 0)}/5`,
                `Feasibility: ${Math.min(5, data.feasibility_score || 0)}/5`,
                `Effectiveness: ${Math.min(5, data.effectiveness_score || 0)}/5`
              ].filter(item => !item.includes('0/5'))
            },
            {
              title: 'Prototype',
              type: 'TEAM',
              score: calculateStrictScore([
                data.tech_vision_ambition_score, 
                data.tech_coherence_score, 
                data.tech_alignment_score, 
                data.tech_realism_score, 
                data.tech_feasibility_score, 
                data.tech_components_score, 
                data.tech_complexity_awareness_score, 
                data.tech_roadmap_score
              ]),
              description: 'Technical execution and prototype development',
              items: [
                `Tech Vision: ${Math.min(5, data.tech_vision_ambition_score || 0)}/5`,
                `Tech Coherence: ${Math.min(5, data.tech_coherence_score || 0)}/5`,
                `Tech Alignment: ${Math.min(5, data.tech_alignment_score || 0)}/5`,
                `Tech Realism: ${Math.min(5, data.tech_realism_score || 0)}/5`,
                `Tech Feasibility: ${Math.min(5, data.tech_feasibility_score || 0)}/5`,
                `Tech Components: ${Math.min(5, data.tech_components_score || 0)}/5`,
                `Complexity Awareness: ${Math.min(5, data.tech_complexity_awareness_score || 0)}/5`,
                `Tech Roadmap: ${Math.min(5, data.tech_roadmap_score || 0)}/5`
              ].filter(item => !item.includes('0/5'))
            }
          ].filter(group => group.score > 0);

          setSectionGroups(groups);
          
          // Fetch summaries for all sections
          groups.forEach(group => {
            fetchSummaryForSection(group.type, group.title);
          });
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvaluation();
  }, [submissionId]);

  const fetchSummaryForSection = async (sectionType: string, sectionTitle: string) => {
    try {
      // Mark section as loading
      setSectionGroups(prev => prev.map(group => 
        group.type === sectionType 
          ? { ...group, isLoadingSummary: true }
          : group
      ));

      const { data, error } = await supabase.functions.invoke('generate-startup-section-summary', {
        body: { 
          submissionId, 
          sectionName: sectionTitle,
          forceRefresh: false 
        }
      });

      if (error) {
        console.error('Error generating summary for', sectionType, error);
        
        // Update with error state
        setSectionGroups(prev => prev.map(group => 
          group.type === sectionType 
            ? { ...group, isLoadingSummary: false, summary: 'Unable to generate summary at this time.' }
            : group
        ));
        return;
      }

      if (data?.success) {
        // Update with the summary
        setSectionGroups(prev => prev.map(group => 
          group.type === sectionType 
            ? { ...group, isLoadingSummary: false, summary: data.summary }
            : group
        ));
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
      setSectionGroups(prev => prev.map(group => 
        group.type === sectionType 
          ? { ...group, isLoadingSummary: false, summary: 'Unable to generate summary.' }
          : group
      ));
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

  const formatSummary = (text: string) => {
    if (!text) return null;
    
    // Split by bullet points or numbered lists and take first 2-3 points
    const lines = text.split('\n').filter(line => line.trim());
    const summaryLines = lines.slice(0, 2); // Show only 2 bullet points
    
    return summaryLines.map((line, index) => {
      const trimmedLine = line.trim();
      // Remove bullet or number prefix
      const cleanLine = trimmedLine.replace(/^[-•*]\s|^\d+\.\s/, '');
      return (
        <li key={index} className="text-foreground leading-relaxed">
          {cleanLine}
        </li>
      );
    });
  };

  if (isLoading) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold mt-12 mb-6 flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-primary" />
          Section Metrics
        </h2>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (sectionGroups.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold mt-12 mb-6 flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-primary" />
          Section Metrics
        </h2>
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>No Analysis Sections Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              There are no detailed analysis sections available for this startup submission.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mt-12 mb-6 flex items-center gap-2">
        <BarChart2 className="h-5 w-5 text-primary" />
        Section Metrics
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sectionGroups.map((section) => {
          const scoreRounded = Math.round(section.score);
          
          return (
            <Card
              key={section.type}
              onClick={() => navigate(`/startup-section/${submissionId}/${section.type}`)}
              className="cursor-pointer hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:shadow-xl h-full flex flex-col bg-card"
            >
              <CardHeader className="pb-2 flex-shrink-0">
                <div className="flex items-start justify-between mb-2">
                  <CardTitle className="text-base font-semibold">{section.title}</CardTitle>
                  <Badge 
                    variant={getScoreBadgeVariant(section.score)} 
                    className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                  >
                    {scoreRounded}/100
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
                {/* AI Summary Section - More prominent */}
                {section.isLoadingSummary ? (
                  <div className="flex items-center gap-2 py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Generating insights...</span>
                  </div>
                ) : section.summary ? (
                  <ul className="space-y-2 text-sm leading-relaxed">
                    {formatSummary(section.summary)}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground italic py-2">No analysis available</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
