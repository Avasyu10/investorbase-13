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

    // Fallback to formatting for older sections
    return title
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get section status - prioritize the status field from analysis result
  const getSectionStatus = (section: Section) => {
    // First check if there's a status field from the analysis - this is the primary source
    if (section.status) {
      // console.log(`Section ${section.title} has status from analysis:`, section.status); // Removed for cleaner console
      return section.status;
    }

    // console.log(`Section ${section.title} has no status field, falling back to legacy logic`); // Removed for cleaner console

    // Fallback to legacy logic only if no status is provided


    // Check content quality for "Needs Improvement" vs "Addressed"
    const hasDetailedContent = section.description && section.description.length > 50;
    const hasStrengthsAndWeaknesses = section.strengths && section.strengths.length > 0 && section.weaknesses && section.weaknesses.length > 0;

    if (hasDetailedContent || hasStrengthsAndWeaknesses) {
      return 'Addressed';
    } else {
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

  // MODIFIED: To remove highlight colors, return a single variant for all statuses.
  const getStatusBadgeVariant = (status: string) => {
    return 'outline'; // Always return 'outline' to remove specific highlighting
  };

  // MODIFIED: To remove highlight colors, return a single neutral color for all statuses.
  const getStatusColor = (status: string) => {
    return 'text-gray-700'; // Always return a neutral gray color
  };

  return (
    <div className="space-y-3">
      {sections.map((section) => {
        const status = getSectionStatus(section);
        // console.log(`Final status for section ${section.title}:`, status); // Removed for cleaner console

        return (
          <Card
            key={section.id}
            // MODIFIED: Removed the conditional border styling to remove highlight
            className="border-l-4 border-l-gray-200" // Use a neutral light gray border
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-3">
                  {getStatusIcon(status)}
                  <span>{formatSectionTitle(section.title, section.type)}</span> {/* Use section.type here */}
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
