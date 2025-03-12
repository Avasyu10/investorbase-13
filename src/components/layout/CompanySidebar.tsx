
import { Link, useParams } from "react-router-dom";
import { Building, LineChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getCompanies } from "@/lib/api";

export function CompanySidebar() {
  const { id: companyId } = useParams<{ id: string }>();
  
  const { data: companies, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: getCompanies,
  });

  if (isLoading) {
    return (
      <div className="h-screen w-64 border-r bg-background flex flex-col p-4">
        <div className="flex items-center space-x-2 mb-6">
          <Building className="h-5 w-5" />
          <span className="font-semibold">Companies</span>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!companies || companies.length === 0) {
    return (
      <div className="h-screen w-64 border-r bg-background flex flex-col p-4">
        <div className="flex items-center space-x-2 mb-6">
          <Building className="h-5 w-5" />
          <span className="font-semibold">Companies</span>
        </div>
        <p className="text-sm text-muted-foreground">No companies found</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-64 border-r bg-background flex flex-col p-4">
      <div className="flex items-center space-x-2 mb-6">
        <Building className="h-5 w-5" />
        <span className="font-semibold">Companies</span>
      </div>
      <nav className="space-y-1">
        {companies.map((company) => (
          <Link
            key={company.id}
            to={`/companies/${company.id}`}
            className={cn(
              "flex items-center text-sm px-3 py-2 rounded-md transition-colors",
              companyId === company.id 
                ? "bg-accent text-accent-foreground" 
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <LineChart className="h-4 w-4 mr-2" />
            <span className="truncate">{company.name}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
