
import { useQuery } from "@tanstack/react-query";
import { getCompanies } from "@/lib/api";
import { CompanyCard } from "./CompanyCard";

export function CompaniesList() {
  const { data: companies, isLoading, error } = useQuery({
    queryKey: ['companies'],
    queryFn: getCompanies,
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
        <h3 className="font-bold">Error loading companies</h3>
        <p>{(error as Error).message}</p>
      </div>
    );
  }

  if (!companies || companies.length === 0) {
    return (
      <div className="text-center p-6 text-muted-foreground">
        <p>No companies found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {companies.map((company) => (
        <CompanyCard key={company.id} company={company} />
      ))}
    </div>
  );
}
