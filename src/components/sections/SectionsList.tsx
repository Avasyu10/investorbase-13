
import { useQuery } from "@tanstack/react-query";
import { getSectionsByCompanyId } from "@/lib/api";
import { SectionCard } from "./SectionCard";
import { Section, MetricType } from "@/lib/types";

interface SectionsListProps {
  companyId: string;
}

// Define the order of metric types for display
const metricTypeOrder: MetricType[] = [
  "PROBLEM",
  "MARKET",
  "SOLUTION",
  "PRODUCT",
  "COMPETITIVE LANDSCAPE",
  "TRACTION",
  "BUSINESS MODEL",
  "GTM STRATEGY",
  "TEAM",
  "FINANCIALS",
  "ASK"
];

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

  // Map sections to metric types
  const sectionsWithMetricTypes = sections.map((section: Section) => {
    // Use section name to determine metric type if not already specified
    const metricType = section.metric_type || 
      metricTypeOrder.find(type => 
        section.name.toUpperCase().includes(type) || 
        type.includes(section.name.toUpperCase())
      ) || "PRODUCT"; // Default to PRODUCT if no match
    
    return {
      ...section,
      metric_type: metricType
    };
  });

  // Sort sections by the predefined metric type order
  const sortedSections = [...sectionsWithMetricTypes].sort((a, b) => {
    const aIndex = metricTypeOrder.indexOf(a.metric_type as MetricType);
    const bIndex = metricTypeOrder.indexOf(b.metric_type as MetricType);
    return aIndex - bIndex;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sortedSections.map((section) => (
        <SectionCard 
          key={section.id} 
          section={section} 
          companyId={companyId} 
        />
      ))}
    </div>
  );
}
