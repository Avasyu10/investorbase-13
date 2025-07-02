
import { useState, useEffect } from "react";
import { CompaniesTable } from "./CompaniesTable";
import { useCompanies } from "@/hooks/useCompanies";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface CompaniesListProps {
  isGeneralUser?: boolean;
}

export function CompaniesList({ isGeneralUser = false }: CompaniesListProps) {
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const navigate = useNavigate();
  
  const { data: companies, isLoading, error, refetch } = useCompanies({
    sortBy,
    sortOrder
  });

  const handleCompanyClick = (companyId: string) => {
    navigate(`/company/${companyId}`);
  };

  const handleSortChange = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  const handleDeleteCompany = () => {
    // Refresh the companies list after deletion
    refetch();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load companies. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <CompaniesTable
      companies={companies || []}
      onCompanyClick={handleCompanyClick}
      onDeleteCompany={handleDeleteCompany}
      onSortChange={handleSortChange}
      currentSort={{ field: sortBy, order: sortOrder }}
      isGeneralUser={isGeneralUser}
    />
  );
}
