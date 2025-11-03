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
          // Group scores into logical sections like in companies page
          const groups: SectionGroup[] = [
            {
              title: 'Problem Statement',
              type: 'PROBLEM',
              score: Math.min(100, ((data.existence_score + data.severity_score + data.frequency_score + data.unmet_need_score) / 4) * 20 || 0),
              description: 'Problem validation and market need assessment',
              items: [
                `Problem Existence: ${data.existence_score}/5`,
                `Severity: ${data.severity_score}/5`,
                `Frequency: ${data.frequency_score}/5`,
                `Unmet Need: ${data.unmet_need_score}/5`
              ].filter(item => !item.includes('0/5'))
            },
            {
              title: 'Solution',
              type: 'SOLUTION',
              score: Math.min(100, ((data.direct_fit_score + data.differentiation_score + data.feasibility_score + data.effectiveness_score) / 4) * 20 || 0),
              description: 'Solution fit and effectiveness evaluation',
              items: [
                `Direct Fit: ${data.direct_fit_score}/5`,
                `Differentiation: ${data.differentiation_score}/5`,
                `Feasibility: ${data.feasibility_score}/5`,
                `Effectiveness: ${data.effectiveness_score}/5`
              ].filter(item => !item.includes('0/5'))
            },
            {
              title: 'Market Size',
              type: 'MARKET',
              score: Math.min(100, ((data.market_size_score + data.growth_trajectory_score + data.timing_readiness_score + data.external_catalysts_score) / 4) * 20 || 0),
              description: 'Market opportunity and growth potential',
              items: [
                `Market Size: ${data.market_size_score}/5`,
                `Growth Trajectory: ${data.growth_trajectory_score}/5`,
                `Market Timing: ${data.timing_readiness_score}/5`,
                `External Catalysts: ${data.external_catalysts_score}/5`
              ].filter(item => !item.includes('0/5'))
            },
            {
              title: 'Traction',
              type: 'TRACTION',
              score: Math.min(100, ((data.first_customers_score + data.accessibility_score + data.acquisition_approach_score + data.pain_recognition_score) / 4) * 20 || 0),
              description: 'Customer acquisition and market access',
              items: [
                `First Customers: ${data.first_customers_score}/5`,
                `Accessibility: ${data.accessibility_score}/5`,
                `Acquisition Approach: ${data.acquisition_approach_score}/5`,
                `Pain Recognition: ${data.pain_recognition_score}/5`
              ].filter(item => !item.includes('0/5'))
            },
            {
              title: 'Competitor',
              type: 'COMPETITIVE_LANDSCAPE',
              score: Math.min(100, ((data.direct_competitors_score + data.substitutes_score + data.differentiation_vs_players_score + data.dynamics_score) / 4) * 20 || 0),
              description: 'Competitive landscape and differentiation',
              items: [
                `Direct Competitors: ${data.direct_competitors_score}/5`,
                `Substitutes: ${data.substitutes_score}/5`,
                `Differentiation: ${data.differentiation_vs_players_score}/5`,
                `Market Dynamics: ${data.dynamics_score}/5`
              ].filter(item => !item.includes('0/5'))
            },
            {
              title: 'Business Model',
              type: 'BUSINESS_MODEL',
              score: Math.min(100, ((data.usp_clarity_score + data.usp_differentiation_strength_score + data.usp_defensibility_score + data.usp_alignment_score) / 4) * 20 || 0),
              description: 'Unique value proposition and competitive advantage',
              items: [
                `USP Clarity: ${data.usp_clarity_score}/5`,
                `USP Strength: ${data.usp_differentiation_strength_score}/5`,
                `Defensibility: ${data.usp_defensibility_score}/5`,
                `Market Alignment: ${data.usp_alignment_score}/5`
              ].filter(item => !item.includes('0/5'))
            },
            {
              title: 'Team',
              type: 'TEAM',
              score: Math.min(100, ((data.tech_vision_ambition_score + data.tech_coherence_score + data.tech_alignment_score + data.tech_realism_score + data.tech_feasibility_score + data.tech_components_score + data.tech_complexity_awareness_score + data.tech_roadmap_score) / 8) * 20 || 0),
              description: 'Technical execution and team capability',
              items: [
                `Tech Vision: ${data.tech_vision_ambition_score}/5`,
                `Tech Coherence: ${data.tech_coherence_score}/5`,
                `Tech Alignment: ${data.tech_alignment_score}/5`,
                `Tech Realism: ${data.tech_realism_score}/5`,
                `Tech Feasibility: ${data.tech_feasibility_score}/5`,
                `Tech Components: ${data.tech_components_score}/5`,
                `Complexity Awareness: ${data.tech_complexity_awareness_score}/5`,
                `Tech Roadmap: ${data.tech_roadmap_score}/5`
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
    const summaryLines = lines.slice(0, 3);
    
    return summaryLines.map((line, index) => {
      const trimmedLine = line.trim();
      // Remove bullet or number prefix
      const cleanLine = trimmedLine.replace(/^[-•*]\s|^\d+\.\s/, '');
      return (
        <li key={index} className="text-sm text-muted-foreground leading-relaxed">
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sectionGroups.map((section) => {
          const scoreRounded = Math.round(section.score);
          
          return (
            <Card
              key={section.type}
              onClick={() => navigate(`/startup-section/${submissionId}/${section.type}`)}
              className="cursor-pointer hover:shadow-lg transition-all duration-200 border-0 shadow-subtle hover:scale-105 h-full flex flex-col"
            >
              <CardHeader className="pb-3 flex-shrink-0">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="truncate">{section.title}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={getScoreBadgeVariant(section.score)} className="text-xs">
                      {scoreRounded}/100
                    </Badge>
                  </div>
                </CardTitle>
                <div className="relative">
                  <Progress value={section.score} className="h-2" />
                  <div 
                    className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor(section.score)}`}
                    style={{ width: `${section.score}%` }}
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex-1 flex flex-col overflow-hidden">
                <p className="text-sm text-muted-foreground mb-3 font-semibold">
                  {section.description}
                </p>
                
                {/* AI Summary Section */}
                <div className="mb-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span className="text-xs font-semibold text-foreground">AI Analysis</span>
                  </div>
                  
                  {section.isLoadingSummary ? (
                    <div className="flex items-center gap-2 py-2">
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Generating insights...</span>
                    </div>
                  ) : section.summary ? (
                    <ul className="space-y-1.5 list-disc pl-4">
                      {formatSummary(section.summary)}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No analysis available</p>
                  )}
                </div>

                {/* Component Scores */}
                <div className="text-xs text-muted-foreground">
                  <p className="font-semibold mb-1">Component Scores:</p>
                  <ul className="space-y-0.5 list-disc pl-4">
                    {section.items.slice(0, 3).map((item, index) => (
                      <li key={index} className="leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
