
import { useQuery } from "@tanstack/react-query";
import { getSectionsByCompanyId } from "@/lib/api";
import { SectionCard } from "./SectionCard";
import { Section } from "@/lib/types";

interface SectionsListProps {
  companyId: string;
}

export function SectionsList({ companyId }: SectionsListProps) {
  const { data: sections, isLoading, error } = useQuery({
    queryKey: ['sections', companyId],
    queryFn: () => getSectionsByCompanyId(companyId),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loader"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-6 text-destructive">
        <h3 className="font-bold">Error loading sections</h3>
        <p>{(error as Error).message}</p>
      </div>
    );
  }

  if (!sections || sections.length === 0) {
    return (
      <div className="text-center p-6 text-muted-foreground">
        <p>No sections found for this company.</p>
      </div>
    );
  }

  // Group sections by metric type
  const groupedSections: Record<string, Section[]> = {};
  
  // Define the order of metrics
  const metricOrder = [
    'PROBLEM', 'MARKET', 'SOLUTION', 'PRODUCT', 
    'COMPETITIVE_LANDSCAPE', 'TRACTION', 'BUSINESS_MODEL', 
    'GTM_STRATEGY', 'TEAM', 'FINANCIALS', 'ASK'
  ];
  
  // Initialize groups with empty arrays to maintain order
  metricOrder.forEach(metric => {
    groupedSections[metric] = [];
  });
  
  // Group sections by metric type
  sections.forEach(section => {
    if (section.metric_type) {
      if (!groupedSections[section.metric_type]) {
        groupedSections[section.metric_type] = [];
      }
      groupedSections[section.metric_type].push(section);
    }
  });

  return (
    <div className="space-y-10">
      {metricOrder.map(metricType => {
        const metricsInGroup = groupedSections[metricType] || [];
        if (metricsInGroup.length === 0) return null;
        
        return (
          <div key={metricType} className="space-y-4">
            <h3 className="text-xl font-medium">{metricType.replace('_', ' ')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {metricsInGroup.map(section => (
                <SectionCard key={section.id} section={section} companyId={companyId} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
