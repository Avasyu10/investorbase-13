
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
        case 'differentiation':
          return 'Differentiation';
        default:
          break;
      }
    }
    
    // Use the title from the section directly if it's already formatted
    if (title && title.includes('&')) {
      return title; // Already formatted titles like "Problem & Solution"
    }
    
    // Fallback to formatting for older sections
    return title
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Check if section is addressed (has content or description that indicates it's present)
  const isSectionAddressed = (section: Section) => {
    // Check if description indicates the section is addressed
    if (section.description) {
      const description = section.description.toLowerCase();
      // Look for positive indicators that the section is present/addressed
      const addressedIndicators = [
        'addressed', 'covered', 'included', 'present', 'discussed', 
        'mentioned', 'detailed', 'explained', 'outlined', 'provided'
      ];
      
      const notAddressedIndicators = [
        'not addressed', 'not covered', 'not included', 'missing', 
        'absent', 'lacking', 'not present', 'not discussed'
      ];
      
      // Check for negative indicators first (more specific)
      const hasNegativeIndicator = notAddressedIndicators.some(indicator => 
        description.includes(indicator)
      );
      
      if (hasNegativeIndicator) {
        return false;
      }
      
      // Check for positive indicators
      const hasPositiveIndicator = addressedIndicators.some(indicator => 
        description.includes(indicator)
      );
      
      if (hasPositiveIndicator) {
        return true;
      }
    }
    
    // Fallback: check if there's any meaningful content
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
