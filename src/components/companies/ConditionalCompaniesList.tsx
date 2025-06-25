
import { CompaniesList } from "./CompaniesList";
import { IITBombayCompaniesList } from "./IITBombayCompaniesList";
import { useProfile } from "@/hooks/useProfile";
import { useCompanies } from "@/hooks/useCompanies";
import { useNavigate } from "react-router-dom";
import { Loader2, Building2 } from "lucide-react";
import type { Company } from "@/types/company";

export function ConditionalCompaniesList() {
  const { profile, isLoading, error, isIITBombay } = useProfile();
  const navigate = useNavigate();
  
  // FIXED: Add companies data and handlers for IIT Bombay component
  const { companies, isLoading: companiesLoading } = useCompanies(1, 50, 'created_at', 'desc', '');

  const handleCompanyClick = (company: Company) => {
    navigate(`/company/${company.id}`);
  };

  if (isLoading || companiesLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12 border rounded-lg bg-card/50">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">Failed to Load Profile</h3>
          <p className="mt-2 text-muted-foreground">
            Unable to determine user permissions. Please try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  // Show IIT Bombay specific UI if user has is_iitbombay: true
  if (isIITBombay) {
    return <IITBombayCompaniesList companies={companies} onCompanyClick={handleCompanyClick} />;
  }

  // Show default UI for all other users
  return <CompaniesList />;
}
