
import { useQuery } from "@tanstack/react-query";
import { getSectionsByCompanyId } from "@/lib/api";
import { SectionCard } from "./SectionCard";

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sections.map((section) => (
        <SectionCard key={section.id} section={section} companyId={companyId} />
      ))}
    </div>
  );
}
