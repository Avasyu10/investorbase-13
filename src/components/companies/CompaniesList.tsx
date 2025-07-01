
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Building2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { CompaniesTable } from "./CompaniesTable";
import { useAuth } from "@/hooks/useAuth";
import { useCompanies } from "@/hooks/useCompanies";
import { useDeleteCompany } from "@/hooks/useDeleteCompany";

export function CompaniesList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

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
          <h1 className="text-2xl font-bold tracking-tight mb-2">Prospects</h1>
          <p className="text-muted-foreground">
            Track and manage your investment prospects
          </p>
        </div>
      </div>

      {/* Search and filter controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search companies..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={pageSize === 50 ? "default" : "outline"}
            size="sm"
            onClick={() => handlePageSizeChange(50)}
          >
            50 per page
          </Button>
          <Button
            variant={pageSize === 100 ? "default" : "outline"}
            size="sm"
            onClick={() => handlePageSizeChange(100)}
          >
            100 per page
          </Button>
          <Button
            variant={pageSize === totalCount ? "default" : "outline"}
            size="sm"
            onClick={() => handlePageSizeChange(totalCount)}
          >
            Show All
          </Button>
        </div>
      </div>

      {companies.length > 0 ? (
        <>
          {/* Pagination info and controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
            <div className="text-sm text-muted-foreground">
              Showing {startRecord} to {endRecord} of {totalCount} prospects
              {searchTerm && ` (filtered by "${searchTerm}")`}
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
            isIITBombay={false} 
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
            {searchTerm ? `No prospects found matching "${searchTerm}"` : "Upload your first pitch deck to start analyzing prospects."}
          </p>
          {searchTerm ? (
            <Button 
              onClick={() => setSearchTerm("")} 
              className="mt-4"
              variant="outline"
            >
              Clear Search
            </Button>
          ) : (
            <Button 
              onClick={() => navigate("/upload")} 
              className="mt-6"
            >
              Upload Your First Deck
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
