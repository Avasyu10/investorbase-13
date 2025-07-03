
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle } from "lucide-react";
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

  // Check if section is addressed (has content or description)
  const isSectionAddressed = (section: Section) => {
    return !!(section.description || section.strengths?.length || section.weaknesses?.length);
  };

  return (
    <div className="space-y-3">
      {sections.map((section) => {
        const isAddressed = isSectionAddressed(section);
        
        return (
          <Card 
            key={section.id}
            className="border-l-4 border-l-primary/20"
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-3">
                  {isAddressed ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300" />
                  )}
                  <span>{formatSectionTitle(section.title, section.section_type)}</span>
                </div>
                <Badge 
                  variant={isAddressed ? "default" : "outline"}
                  className="text-xs"
                >
                  {isAddressed ? "Addressed" : "Not Found"}
                </Badge>
              </CardTitle>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
};
