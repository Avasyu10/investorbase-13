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

    // Fallback to formatting for older sections
    return title
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
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
        return <XCircle className="h-5 w-5 text-red-500" />; // XCircle for "Not Addressed"
      default:
        return <XCircle className="h-5 w-5 text-red-500" />; // Fallback to cross icon
    }
  };

  // CHANGED: Always return 'outline' for the badge variant
  const getStatusBadgeVariant = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    return 'outline'; // Ensure badges have a subtle, non-filled background
  };

  // CHANGED: Use specific, but still clear, text colors for the badge
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Addressed':
        return 'text-green-600'; // Green text
      case 'Needs Improvement':
        return 'text-yellow-600'; // Yellow text
      case 'Not Addressed':
        return 'text-red-600'; // Red text
      default:
        return 'text-gray-500'; // Grey text
    }
  };

  return (
    <div className="space-y-3">
      {sections.map((section, index) => {
        const status = getSectionStatus(section);

        return (
          <Card
            key={section.id || index}
            className="border-l-4 border-l-gray-200" // Kept neutral border
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-3">
                  {getStatusIcon(status)}
                  {/* Using section.title directly as titles are already formatted */}
                  <span>{section.title}</span>
                </div>
                <Badge
                  variant={getStatusBadgeVariant(status)} // Will now always be 'outline'
                  className={`text-xs ${getStatusColor(status)}`} // Color controlled by getStatusColor
                >
                  {status}
                </Badge>
              </CardTitle>
            </CardHeader>
            {/* REMOVED: The description part */}
            {/* {section.description && (
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  {section.description}
                </p>
              </CardContent>
            )} */}
          </Card>
        );
      })}
    </div>
  );
};
