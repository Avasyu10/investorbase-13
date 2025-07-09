
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Circle } from "lucide-react";
import { Section } from "@/lib/api/apiContract";

interface SectionChecklistProps {
  sections: Section[];
}

export const SectionChecklist = ({ sections }: SectionChecklistProps) => {
  const formatSectionTitle = (title: string, sectionType?: string) => {
    // Handle Eureka form specific section types
    if (sectionType) {
      switch (sectionType) {
        case 'problem_solution_fit':
          return 'Problem & Solution';
        case 'target_customers':
          return 'Target Customers';
        case 'competitors':
          return 'Competitors';
        case 'revenue_model':
          return 'Revenue Model';
        case 'usp':
          return 'USP';
        case 'differentiation': // Map old 'differentiation' to 'USP'
          return 'USP';
        case 'prototype':
          return 'Prototype';
        default:
          break;
      }
    }

    // Use the title from the section directly if it's already formatted
    if (title && title.includes('&')) {
      return title; // Already formatted titles like "Problem & Solution"
    }

    // Handle "Differentiation" in title and map to "USP"
    if (title && title.toLowerCase().includes('differentiation')) {
      return 'USP';
    }

    // Fallback to formatting for older sections (e.g., "GTM_STRATEGY" -> "Gtm Strategy")
    // This part should handle cases where titles like "Go-to-Market Strategy" are already correctly formatted in JSON
    // and only fallback if they are like "GO_TO_MARKET_STRATEGY".
    // Given your provided titles are already well-formatted, this part might not be strictly needed for those,
    // but it's good for robustness.
    const formattedTitle = title
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Ensure only first letter is capitalized
      .join(' ');

    // For specific titles that might have unique casing or formatting not covered by split/map
    if (title === "Go-to-Market Strategy") return "Go-to-Market Strategy";
    if (title === "Founder & Team Background") return "Founder & Team Background";
    if (title === "Financial Overview & Projections") return "Financial Overview & Projections";
    if (title === "Competitive Landscape") return "Competitive Landscape";
    if (title === "The Ask & Next Steps") return "The Ask & Next Steps";
    if (title === "Market Opportunity") return "Market Opportunity";
    if (title === "Business Model") return "Business Model";
    if (title === "Solution (Product)") return "Solution (Product)";
    if (title === "Traction & Milestones") return "Traction & Milestones";
    if (title === "Problem Statement") return "Problem Statement";

    return formattedTitle; // Return the formatted title if no specific match
  };

  // Get section status - prioritize the status field from analysis result
  const getSectionStatus = (section: Section) => {
    // Primary source: The explicit status field from the analysis.
    // This is the most reliable source for status.
    if (section.status) {
      return section.status;
    }

    // Fallback to legacy logic only if no explicit status is provided in `section.status`.
    // This part tries to infer the status based on content.

    const hasDescription = section.description && section.description.trim().length > 0;
    const hasStrengths = section.strengths && section.strengths.length > 0;
    const hasWeaknesses = section.weaknesses && section.weaknesses.length > 0;

    // If there's absolutely no content, it's "Not Addressed"
    if (!hasDescription && !hasStrengths && !hasWeaknesses) {
      return 'Not Addressed';
    }

    // If there is some content, but it's not detailed enough to be "Addressed"
    // We define "detailed enough" as a description over 50 characters OR having both strengths and weaknesses.
    const isDetailed = (hasDescription && section.description!.trim().length > 50) || (hasStrengths && hasWeaknesses);

    if (isDetailed) {
      return 'Addressed';
    } else {
      // If content exists but isn't detailed enough, it "Needs Improvement"
      return 'Needs Improvement';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Addressed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'Needs Improvement':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'Not Addressed':
      default:
        return <Circle className="h-5 w-5 text-gray-300" />;
    }
  };

  // Fix the badge variant to use only allowed types
  const getStatusBadgeVariant = (status: string): "default" | "destructive" | "outline" | "secondary" | "green" | "gold" | "blue" => {
    return 'outline'; // Always return 'outline' to remove specific highlighting
  };

  // To remove highlight colors, return a single neutral color for all statuses.
  const getStatusColor = (status: string) => {
    return 'text-gray-700'; // Always return a neutral gray color
  };

  return (
    <div className="space-y-3">
      {sections.map((section, index) => { // Added index for key if section.id is not unique
        const status = getSectionStatus(section);

        return (
          <Card
            key={section.id || index} // Fallback to index if section.id is not present
            className="border-l-4 border-l-gray-200" // Use a neutral light gray border
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-3">
                  {getStatusIcon(status)}
                  {/* Using section.title directly here is best since your JSON titles are already formatted */}
                  <span>{section.title}</span>
                </div>
                <Badge
                  variant={getStatusBadgeVariant(status)}
                  className={`text-xs ${getStatusColor(status)}`}
                >
                  {status}
                </Badge>
              </CardTitle>
            </CardHeader>
            {section.description && (
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  {section.description}
                </p>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};
