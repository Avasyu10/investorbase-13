import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react"; // Only Star is needed for score, removed others
import { Section } from "@/lib/api/apiContract";

interface SectionCardProps {
  section: Section;
  onClick: () => void;
  // Add props to determine user type
  isVCAndBits?: boolean;
}

export const SectionCard = ({ section, onClick, isVCAndBits = false }: SectionCardProps) => {
  // Always use 100-point scale
  const rawScore = parseFloat(section.score.toString());
  const displayScore = rawScore > 5 ? rawScore : rawScore * 20; // Convert 5-point to 100-point if needed
  const progressValue = displayScore;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-amber-600";
    if (score >= 20) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    if (score >= 40) return "outline";
    return "destructive";
  };

  const formatSectionTitle = (sectionType: string, title: string) => {
    // Special handling for VC & BITS users - specific section name mappings
    if (isVCAndBits) {
      const vcAndBitsTitleMappings: { [key: string]: string } = {
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
    const iitBombayTitleMappings: { [key: string]: string } = {
      'problem_solution_fit': 'Problem & Solution',
      'target_customers': 'Target Customers',
      'competitors': 'Competitors',
      'revenue_model': 'Revenue Model',
      'usp': 'USP',
      'differentiation': 'USP', // Map old 'differentiation' to 'USP'
      'prototype': 'Prototype'
    };

    // Custom VC section title mappings based on section type
    const vcTitleMappings: { [key: string]: string } = {
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

  // Prepare description points by splitting after a period and filtering
  const descriptionPoints = section.description
    ? section.description
        .split(/(?<=\.)\s+/) // Split after a period followed by one or more spaces (positive lookbehind)
        .map(point => point.trim()) // Trim whitespace from each point
        .filter(point => point.length > 0) // Remove any empty strings
    : [];

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all duration-200 border-0 shadow-subtle hover:scale-105 h-full flex flex-col"
      onClick={onClick}
    >
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="truncate">{formatSectionTitle(section.section_type || section.type, section.title)}</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Star className="h-4 w-4 text-yellow-500" />
            <Badge variant={getScoreBadgeVariant(displayScore)} className="text-xs">
              {Math.round(displayScore)}/100
            </Badge>
          </div>
        </CardTitle>
        <Progress value={progressValue} className="h-2" />
      </CardHeader>
      <CardContent className="pt-0 flex-1 flex flex-col overflow-hidden">
        {/* Show description points if available */}
        <div className="space-y-3 flex-1 overflow-hidden">
          {descriptionPoints.length > 0 ? (
            <div className="flex items-start gap-2">
              {/* You can add an icon here if you like, e.g., a 'FileText' or 'Info' icon */}
              {/* <FileText className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" /> */}
              <div className="text-xs flex-1 min-w-0">
                <span className="font-medium text-gray-700">Description:</span>
                <ul className="list-disc list-inside text-gray-600 mt-1 space-y-0.5 pl-4">
                  {/* Display up to 3 points for brevity in the card view */}
                  {descriptionPoints.slice(0, 3).map((point, idx) => (
                    <li key={idx} className="line-clamp-1 break-words">{point}</li>
                  ))}
                  {descriptionPoints.length > 3 && (
                    <div className="text-gray-500 text-xs">+{descriptionPoints.length - 3} more</div>
                  )}
                </ul>
              </div>
            </div>
          ) : (
            // Fallback if description is empty or doesn't parse into points
            <p className="text-sm text-muted-foreground line-clamp-2 flex-shrink-0">
              No description available.
            </p>
          )}
        </div>

        {/* Removed strengths and weaknesses sections as per your request */}

      </CardContent>
    </Card>
  );
};
