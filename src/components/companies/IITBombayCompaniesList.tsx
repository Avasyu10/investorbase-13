
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, Building2, GraduationCap, ChevronLeft, ChevronRight } from "lucide-react";
import { CompaniesTable } from "./CompaniesTable";
import { useAuth } from "@/hooks/useAuth";
import { useCompanies } from "@/hooks/useCompanies";
import { useDeleteCompany } from "@/hooks/useDeleteCompany";

export function IITBombayCompaniesList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const { deleteCompany } = useDeleteCompany();

  const { companies, totalCount, isLoading, error } = useCompanies(currentPage, pageSize, 'created_at', 'desc', searchTerm);

  const handleCompanyClick = (companyId: string) => {
    navigate(`/company/${companyId}`);
  };

  const handleDeleteCompany = async (companyId: string) => {
    await deleteCompany(companyId);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    const totalPages = Math.ceil(totalCount / pageSize);
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Calculate rating-based stats
  const totalProspects = totalCount; // Use the actual total count from the database
  const highPotential = companies.filter(c => c.overall_score > 70).length;
  const mediumPotential = companies.filter(c => c.overall_score >= 50 && c.overall_score <= 70).length;
  const badPotential = companies.filter(c => c.overall_score < 50).length;

  // Calculate pagination info
  const totalPages = Math.ceil(totalCount / pageSize);
  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalCount);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12 border rounded-lg bg-card/50">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">Authentication Required</h3>
          <p className="mt-2 text-muted-foreground">
            Please sign in to view your prospects
          </p>
          <Button 
            onClick={() => navigate("/")} 
            className="mt-6"
          >
            Go to Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12 border rounded-lg bg-card/50">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">Failed to Load Companies</h3>
          <p className="mt-2 text-muted-foreground">
            {error.message || 'There was an error loading your prospects. Please try again.'}
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-6"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Eureka Prospects</h1>
          </div>
          <p className="text-muted-foreground">
            Application tracking, analysis and Management for Eureka
          </p>
        </div>
      </div>

      {/* Enhanced stats section for IIT Bombay users */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-lg p-4 border">
          <div className="text-2xl font-bold text-primary">{totalProspects}</div>
          <div className="text-sm text-muted-foreground">Total Prospects</div>
        </div>
        <div className="bg-card rounded-lg p-4 border">
          <div className="text-2xl font-bold text-green-600">{highPotential}</div>
          <div className="text-sm text-muted-foreground">High Potential</div>
        </div>
        <div className="bg-card rounded-lg p-4 border">
          <div className="text-2xl font-bold text-yellow-600">{mediumPotential}</div>
          <div className="text-sm text-muted-foreground">Medium Potential</div>
        </div>
        <div className="bg-card rounded-lg p-4 border">
          <div className="text-2xl font-bold text-red-600">{badPotential}</div>
          <div className="text-sm text-muted-foreground">Bad Potential</div>
        </div>
      </div>

      {companies.length > 0 ? (
        <>
          {/* Pagination info and controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
            <div className="text-sm text-muted-foreground">
              Showing {startRecord} to {endRecord} of {totalCount} prospects
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <span className="px-3 py-1 text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <CompaniesTable 
            companies={companies} 
            onCompanyClick={handleCompanyClick} 
            onDeleteCompany={handleDeleteCompany}
            isIITBombay={true} 
          />

          {/* Bottom pagination controls for better UX */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <span className="px-3 py-1 text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-card/50">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No prospects found</h3>
          <p className="mt-2 text-muted-foreground">
            No prospects available at the moment.
          </p>
        </div>
      )}
    </div>
  );
}
