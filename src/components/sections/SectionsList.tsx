
import { useQuery } from "@tanstack/react-query";
import { getSectionsByCompanyId } from "@/lib/api";
import { SectionCard } from "./SectionCard";
import { Section } from "@/lib/types";

interface SectionsListProps {
  companyId: string;
}

// Define the order for the metrics
const metricOrder = [
  'PROBLEM', 'MARKET', 'SOLUTION',
  'PRODUCT', 'COMPETITIVE_LANDSCAPE', 'TRACTION',
  'BUSINESS_MODEL', 'GTM_STRATEGY', 'TEAM',
  'FINANCIALS', 'ASK'
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

  // Sort sections according to the predefined metric order
  const sortedSections = [...sections].sort((a, b) => {
    const aIndex = a.metric_type ? metricOrder.indexOf(a.metric_type) : 999;
    const bIndex = b.metric_type ? metricOrder.indexOf(b.metric_type) : 999;
    return aIndex - bIndex;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sortedSections.map((section) => (
        <SectionCard key={section.id} section={section} companyId={companyId} />
      ))}
    </div>
  );
}
