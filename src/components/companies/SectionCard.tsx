import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { Section } from "@/lib/api/apiContract";
import { useProfile } from "@/hooks/useProfile";

interface SectionCardProps {
  section: Section;
  onClick: () => void;
  isVCAndBits?: boolean;
}

export const SectionCard = ({
  section,
  onClick,
  isVCAndBits = false
}: SectionCardProps) => {
  const { isIITBombayUser } = useProfile();
  
  const rawScore = parseFloat(section.score.toString());
  let displayScore: number;
  let progressValue: number;
  
  if (isIITBombayUser) {
    displayScore = rawScore;
    progressValue = rawScore;
  } else {
    displayScore = rawScore > 5 ? rawScore : rawScore * 20;
    progressValue = displayScore;
  }

  const getScoreColor = (score: number) => {
    if (isIITBombayUser) {
      if (score >= 80) return "text-emerald-600";
      if (score >= 60) return "text-blue-600";
      if (score >= 40) return "text-slate-600";
      if (score >= 20) return "text-orange-600";
      return "text-red-600";
    } else {
      if (score >= 80) return "text-emerald-600";
      if (score >= 60) return "text-blue-600";
      if (score >= 40) return "text-amber-600";
      if (score >= 20) return "text-orange-600";
      return "text-red-600";
    }
  };

  const getScoreBadgeVariant = (score: number) => {
    if (isIITBombayUser) {
      if (score >= 80) return "green";
      if (score >= 60) return "secondary";
      if (score >= 40) return "outline";
      return "destructive";
    } else {
      if (score >= 80) return "default";
      if (score >= 60) return "secondary";
      if (score >= 40) return "outline";
      return "destructive";
    }
  };

  const getProgressColor = (score: number) => {
    if (isIITBombayUser) {
      if (score >= 80) return "bg-emerald-500";
      if (score >= 60) return "bg-blue-500";
      if (score >= 40) return "bg-slate-500";
      if (score >= 20) return "bg-orange-500";
      return "bg-red-500";
    } else {
      if (score >= 80) return "bg-emerald-500";
      if (score >= 60) return "bg-blue-500";
      if (score >= 40) return "bg-amber-500";
      if (score >= 20) return "bg-orange-500";
      return "bg-red-500";
    }
  };

  const formatSectionTitle = (sectionType: string, title: string) => {
    if (isVCAndBits) {
      const vcAndBitsTitleMappings: {
        [key: string]: string;
      } = {
        'PROBLEM': 'Problem Clarity & Founder Insight',
        'TEAM': 'Founder Capability & Market Fit',
        'MARKET': 'Market Opportunity & Entry Strategy',
        'TRACTION': 'Early Proof or Demand Signals',
        'COMPETITIVE_LANDSCAPE': 'Differentiation & Competitive Edge'
      };
      if (vcAndBitsTitleMappings[sectionType]) {
        return vcAndBitsTitleMappings[sectionType];
      }
    }

    const iitBombayTitleMappings: {
      [key: string]: string;
    } = {
      'problem_solution_fit': 'Problem & Solution',
      'target_customers': 'Target Customers',
      'competitors': 'Competitors',
      'revenue_model': 'Revenue Model',
      'usp': 'USP',
      'differentiation': 'USP',
      'prototype': 'Prototype'
    };

    const vcTitleMappings: {
      [key: string]: string;
    } = {
      'PROBLEM': 'Problem Statement',
      'MARKET': 'Market Size',
      'SOLUTION': 'Solution',
      'TRACTION': 'Traction',
      'COMPETITIVE_LANDSCAPE': 'Competitor',
      'BUSINESS_MODEL': 'Business Model',
      'TEAM': 'Team',
      'FINANCIALS': 'Financials',
      'ASK': 'Ask'
    };

    if (sectionType && iitBombayTitleMappings[sectionType]) {
      return iitBombayTitleMappings[sectionType];
    }

    if (vcTitleMappings[sectionType]) {
      return vcTitleMappings[sectionType];
    }

    if (title && title !== sectionType) {
      if (title.toLowerCase().includes('differentiation')) {
        return 'USP';
      }
      return title;
    }

    return sectionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Logic to split the description into sentences/bullet points
  // This is a common approach if 'description' is a single string but needs to be displayed as points.
  // It's still ideal for the data to come pre-formatted as an array of strings.
  const descriptionPoints = section.description
    ? section.description.split(/(?<=\.)\s+(?=[A-Z])/) // Splits by period followed by space and uppercase letter
    : [];

  return (
    <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 border-0 shadow-subtle hover:scale-105 h-full flex flex-col" onClick={onClick}>
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="truncate">{formatSectionTitle(section.section_type || section.type, section.title)}</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant={getScoreBadgeVariant(displayScore)} className="text-xs">
              {Math.round(displayScore)}/100
            </Badge>
          </div>
        </CardTitle>
        <div className="relative">
          <Progress value={progressValue} className="h-2" />
          <div 
            className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor(displayScore)}`}
            style={{ width: `${progressValue}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex-1 flex flex-col overflow-hidden">
        {/* Render as bullet points */}
        {descriptionPoints.length > 0 ? (
          <ul className="text-sm text-muted-foreground mb-4 space-y-1">
            {descriptionPoints.map((point, index) => (
              <li key={index} className="leading-relaxed">
                {point.trim() + (point.trim().endsWith('.') ? '' : '.')} {/* Ensure each point ends with a period */}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground mb-4">
            No description available.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
