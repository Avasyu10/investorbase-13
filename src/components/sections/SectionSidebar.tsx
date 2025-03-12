
import { useQuery } from "@tanstack/react-query";
import { getSectionsByCompanyId } from "@/lib/api";
import { Link, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";

interface SectionSidebarProps {
  companyId: string;
}

export function SectionSidebar({ companyId }: SectionSidebarProps) {
  const { sectionId } = useParams<{ sectionId: string }>();
  
  const { data: sections, isLoading } = useQuery({
    queryKey: ['sections', companyId],
    queryFn: () => getSectionsByCompanyId(companyId),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col space-y-2 p-4">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="h-8 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!sections || sections.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">No sections found</div>;
  }

  return (
    <div className="space-y-1 p-2">
      <h4 className="px-2 py-1 text-sm font-semibold">Sections</h4>
      <nav className="space-y-1">
        {sections.map((section) => (
          <Link
            key={section.id}
            to={`/companies/${companyId}/sections/${section.id}`}
            className={cn(
              "flex items-center justify-between px-2 py-2 text-sm rounded-md w-full",
              sectionId === section.id
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <span>{section.name}</span>
            <span className="font-medium">{section.score}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
