import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react"; // Import XCircle for "Not Addressed"
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

    // For specific titles that might have unique casing or formatting not covered by split/map
    // Using a map for direct lookup is cleaner than multiple if statements
    const directTitlesMap: { [key: string]: string } = {
      "Problem Statement": "Problem Statement",
      "Founder & Team Background": "Founder & Team Background",
      "Financial Overview & Projections": "Financial Overview & Projections",
      "Go-to-Market Strategy": "Go-to-Market Strategy",
      "Competitive Landscape": "Competitive Landscape",
      "The Ask & Next Steps": "The Ask & Next Steps",
      "Market Opportunity": "Market Opportunity",
      "Business Model": "Business Model",
      "Solution (Product)": "Solution (Product)",
      "Traction & Milestones": "Traction & Milestones",
    };

    if (directTitlesMap[title]) {
      return directTitlesMap[title];
    }

    // Fallback to formatting for older sections (e.g., "GTM_STRATEGY" -> "Gtm Strategy")
    return title
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Ensure only first letter is capitalized
      .join(' ');
  };

  // Get section status - prioritize the status field from analysis result
  const getSectionStatus = (section: Section) => {
    // Primary source: The explicit status field from the analysis.
    if (section.status) {
      return section.status;
    }

    // Fallback to legacy logic only if no explicit status is provided in `section.status`.
    const hasDescription = section.description && section.description.trim().length > 0;
    const hasStrengths = section.strengths && section.strengths.length > 0;
    const hasWeaknesses = section.weaknesses && section.weaknesses.length > 0;

    // If there's absolutely no content, it's "Not Addressed"
    if (!hasDescription && !hasStrengths && !hasWeaknesses) {
      return 'Not Addressed';
    }

    // If there is some content, but it's not detailed enough to be "Addressed"
    const isDetailed = (hasDescription && section.description!.trim().length > 50) || (hasStrengths && hasWeaknesses);

    if (isDetailed) {
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
        return <XCircle className="h-5 w-5 text-red-500" />; // Changed to XCircle and red color
      default:
        return <XCircle className="h-5 w-5 text-red-500" />; // Fallback to cross icon as well
    }
  };

  // Updated to provide distinct but not "highlighted" badge variants
  const getStatusBadgeVariant = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case 'Addressed':
        return 'default'; // A slightly bolder 'default' variant
      case 'Needs Improvement':
        return 'secondary'; // Keep secondary for warning
      case 'Not Addressed':
        return 'destructive'; // Use 'destructive' for a clear "not addressed" signal
      default:
        return 'outline'; // Fallback
    }
  };

  // Updated to provide distinct but not "highlighted" text colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Addressed':
        return 'text-green-700'; // Darker green for addressed text
      case 'Needs Improvement':
        return 'text-yellow-700'; // Darker yellow for needs improvement text
      case 'Not Addressed':
        return 'text-red-700'; // Darker red for not addressed text
      default:
        return 'text-gray-700'; // Neutral gray fallback
    }
  };


  return (
    <div className="space-y-3">
      {sections.map((section, index) => {
        const status = getSectionStatus(section);

        return (
          <Card
            key={section.id || index}
            className="border-l-4 border-l-gray-200" // Kept neutral border as per previous request
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-3">
                  {getStatusIcon(status)}
                  {/* Using section.title directly as titles are already formatted */}
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
