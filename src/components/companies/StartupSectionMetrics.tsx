import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart2 } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { Progress } from "@/components/ui/progress";

interface StartupSectionMetricsProps {
  submissionId: string;
}

interface SectionGroup {
  title: string;
  type: string;
  score: number;
  description: string;
  items: string[];
}

export function StartupSectionMetrics({ submissionId }: StartupSectionMetricsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [sectionGroups, setSectionGroups] = useState<SectionGroup[]>([]);

  // Fetch evaluation data and group into sections
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
          setIsLoading(false);
          return;
        }

        if (data) {
          // Group scores into logical sections like in companies page
          const groups: SectionGroup[] = [
            {
              title: 'Problem Statement',
              type: 'PROBLEM',
              score: ((data.existence_score + data.severity_score + data.frequency_score + data.unmet_need_score) / 4) * 20 || 0,
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
              score: ((data.direct_fit_score + data.differentiation_score + data.feasibility_score + data.effectiveness_score) / 4) * 20 || 0,
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
              score: ((data.market_size_score + data.growth_trajectory_score + data.timing_readiness_score + data.external_catalysts_score) / 4) * 20 || 0,
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
              score: ((data.first_customers_score + data.accessibility_score + data.acquisition_approach_score + data.pain_recognition_score) / 4) * 20 || 0,
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
              score: ((data.direct_competitors_score + data.substitutes_score + data.differentiation_vs_players_score + data.dynamics_score) / 4) * 20 || 0,
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
              score: ((data.usp_clarity_score + data.usp_differentiation_strength_score + data.usp_defensibility_score + data.usp_alignment_score) / 4) * 20 || 0,
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
              score: ((data.tech_vision_ambition_score + data.tech_coherence_score + data.tech_alignment_score + data.tech_realism_score + data.tech_feasibility_score + data.tech_components_score + data.tech_complexity_awareness_score + data.tech_roadmap_score) / 8) * 20 || 0,
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
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvaluation();
  }, [submissionId]);

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
                <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                  {section.items.map((item, index) => (
                    <li key={index} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
