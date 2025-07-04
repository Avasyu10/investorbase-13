import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, TrendingDown, FileText } from "lucide-react";
import { Section } from "@/lib/api/apiContract";

interface SectionCardProps {
  section: Section;
  onClick: () => void;
  // Add props to determine user type
  isVCAndBits?: boolean;
  isIITBombay?: boolean;
  eurekaAnalysisData?: any; // Analysis data from eureka_form_submissions
}

export const SectionCard = ({
  section,
  onClick,
  isVCAndBits = false,
  isIITBombay = false,
  eurekaAnalysisData
}: SectionCardProps) => {
  // For IIT Bombay users, use the original score without conversion
  const rawScore = parseFloat(section.score.toString());
  const displayScore = isIITBombay ? rawScore : (rawScore > 5 ? rawScore : rawScore * 20);
  const progressValue = isIITBombay ? (rawScore * 20) : displayScore; // Convert 5-point to 100-point for progress bar

  const getScoreColor = (score: number) => {
    if (isIITBombay) {
      // For IIT Bombay, use 5-point scale colors without yellow highlight
      if (score >= 4) return "text-emerald-600";
      if (score >= 3) return "text-blue-600";
      if (score >= 2) return "text-amber-600"; // Changed to amber for consistency with lower score
      if (score >= 1) return "text-orange-600";
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
    if (isIITBombay) {
      // For IIT Bombay, use 5-point scale without yellow/default variant for high scores
      if (score >= 4) return "secondary";
      if (score >= 3) return "secondary";
      if (score >= 2) return "outline";
      return "destructive";
    } else {
      if (score >= 80) return "default";
      if (score >= 60) return "secondary";
      if (score >= 40) return "outline";
      return "destructive";
    }
  };

  const formatSectionTitle = (sectionType: string, title: string) => {
    // Special handling for VC & BITS users - specific section name mappings
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

    // For IIT Bombay sections, use specific mappings based on section_type
    const iitBombayTitleMappings: {
      [key: string]: string;
    } = {
      'problem_solution_fit': 'Problem & Solution',
      'target_customers': 'Target Customers',
      'competitors': 'Competitors',
      'revenue_model': 'Revenue Model',
      'usp': 'USP',
      'differentiation': 'USP', // Map old 'differentiation' to 'USP'
      'prototype': 'Prototype'
    };

    // Custom VC section title mappings based on section type
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

    // Check if it's an IIT Bombay section first (these have section_type)
    if (sectionType && iitBombayTitleMappings[sectionType]) {
      return iitBombayTitleMappings[sectionType];
    }

    // Then check VC section mappings (these use the type field)
    if (vcTitleMappings[sectionType]) {
      return vcTitleMappings[sectionType];
    }

    // Use the title from database if available, but map "Differentiation" to "USP"
    if (title && title !== sectionType) {
      if (title.toLowerCase().includes('differentiation')) {
        return 'USP';
      }
      return title;
    }

    // Fallback to formatted section type
    return sectionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Get analysis text for IIT Bombay users from Eureka data - first sentence only
  const getAnalysisText = () => {
    if (!isIITBombay || !eurekaAnalysisData?.sections) return null;
    
    // Ensure section.section_type is used if available, otherwise fallback to section.type
    const sectionTypeKey = section.section_type || section.type; 
    
    // Convert the key to uppercase if it's from `section.type` which is often uppercase (e.g., 'PROBLEM')
    // but keep it as is if from `section.section_type` which is often lowercase (e.g., 'problem_solution_fit')
    const normalizedSectionTypeKey = sectionTypeKey.toUpperCase(); // Ensure it matches the case in eurekaAnalysisData.sections

    const sectionData = eurekaAnalysisData.sections[normalizedSectionTypeKey];
    
    if (sectionData?.analysis) {
      const analysisText = sectionData.analysis;
      // Extract the first sentence. Handle cases where there's no period or it's at the end.
      const firstPeriodIndex = analysisText.indexOf('.');
      if (firstPeriodIndex !== -1) {
        return analysisText.substring(0, firstPeriodIndex + 1);
      }
      return analysisText; // Return whole text if no period is found
    }
    
    return null;
  };

  const analysisText = getAnalysisText();

  return (
    <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 border-0 shadow-subtle hover:scale-105 h-full flex flex-col" onClick={onClick}>
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="truncate">{formatSectionTitle(section.section_type || section.type, section.title)}</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant={getScoreBadgeVariant(displayScore)} className="text-xs">
              {isIITBombay ? `${Math.round(displayScore)}/5` : `${Math.round(displayScore)}/100`}
            </Badge>
          </div>
        </CardTitle>
        <Progress value={progressValue} className="h-2" />
      </CardHeader>
      <CardContent className="pt-0 flex-1 flex flex-col overflow-hidden">
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-shrink-0">
          {section.description || "No description available"}
        </p>
        
        {/* Conditional rendering based on user type */}
        {isIITBombay && analysisText ? (
          // Display only Analysis for IIT Bombay users
          <div className="space-y-3 flex-1 overflow-hidden">
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs flex-1 min-w-0">
                <span className="font-medium text-blue-700">Analysis:</span>
                <div className="text-blue-600 mt-1">
                  {/* line-clamp-3 here will ensure it still shows only 3 lines even if the first sentence is long */}
                  <div className="line-clamp-3 break-words">{analysisText}</div> 
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Display strengths and weaknesses for non-IIT Bombay users (original logic)
          <div className="space-y-3 flex-1 overflow-hidden">
            {section.strengths && section.strengths.length > 0 && (
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs flex-1 min-w-0">
                  <span className="font-medium text-green-700">Strengths:</span>
                  <div className="text-green-600 mt-1 space-y-0.5">
                    {section.strengths.slice(0, 2).map((strength, idx) => (
                      <div key={idx} className="line-clamp-1 break-words">• {strength}</div>
                    ))}
                    {section.strengths.length > 2 && (
                      <div className="text-green-500 text-xs">+{section.strengths.length - 2} more</div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {section.weaknesses && section.weaknesses.length > 0 && (
              <div className="flex items-start gap-2">
                <TrendingDown className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs flex-1 min-w-0">
                  <span className="font-medium text-red-700">Weaknesses:</span>
                  <div className="text-red-600 mt-1 space-y-0.5">
                    {section.weaknesses.slice(0, 2).map((weakness, idx) => (
                      <div key={idx} className="line-clamp-1 break-words">• {weakness}</div>
                    ))}
                    {section.weaknesses.length > 2 && (
                      <div className="text-red-500 text-xs">+{section.weaknesses.length - 2} more</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
