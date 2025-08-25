
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, Building2, Download } from "lucide-react";
import { CompaniesTable } from "./CompaniesTable";
import { useAuth } from "@/hooks/useAuth";
import { useCompanies, clearReportCache } from "@/hooks/useCompanies";
import { useDeleteCompany } from "@/hooks/useDeleteCompany";
import { useCsvDownload } from "@/hooks/useCsvDownload";
import { toast } from "@/hooks/use-toast";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export function IITBombayCompaniesList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20; // Show 20 companies per page
  
  const { deleteCompany } = useDeleteCompany();
  const { downloadEurekaDataAsCsv } = useCsvDownload();
  const {
    companies,
    totalCount,
    potentialStats,
    isLoading,
    error
  } = useCompanies(currentPage, pageSize, sortBy, sortOrder, searchTerm);
  
  // Clear cache on component mount to ensure fresh data
  useEffect(() => {
    clearReportCache();
  }, []);
  
  const handleCompanyClick = (companyId: string) => {
    navigate(`/company/${companyId}`);
  };
  
  const handleDeleteCompany = async (companyId: string) => {
    await deleteCompany(companyId);
  };

  const handleSortChange = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDownloadCsv = async () => {
    try {
      toast({
        title: "Download Started",
        description: "Fetching all Eureka data. This may take a moment..."
      });
      
      const totalRecords = await downloadEurekaDataAsCsv('eureka-prospects.csv');
      
      toast({
        title: "CSV Downloaded",
        description: `Successfully downloaded ${totalRecords} Eureka prospects records.`
      });
    } catch (error: any) {
      console.error('Download failed:', error);
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download CSV file. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Use the potential stats from the hook instead of calculating from visible companies
  const highPotential = potentialStats?.highPotential || 0;
  const mediumPotential = potentialStats?.mediumPotential || 0;
  const badPotential = potentialStats?.badPotential || 0;
  
  if (isLoading) {
    return <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>;
  }
  
  if (!user) {
    return <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12 border rounded-lg bg-card/50">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">Authentication Required</h3>
          <p className="mt-2 text-muted-foreground">
            Please sign in to view your prospects
          </p>
          <Button onClick={() => navigate("/")} className="mt-6">
            Go to Sign In
          </Button>
        </div>
      </div>;
  }
  
  if (error) {
    return <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12 border rounded-lg bg-card/50">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">Failed to Load Companies</h3>
          <p className="mt-2 text-muted-foreground">
            {error.message || 'There was an error loading your prospects. Please try again.'}
          </p>
          <Button onClick={() => window.location.reload()} className="mt-6">
            Try Again
          </Button>
        </div>
      </div>;
  }
  
  return <div className="container mx-auto px-4 py-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold tracking-tight">Eureka Prospects</h1>
          </div>
          <p className="text-muted-foreground">
            Application tracking, analysis and Management for Eureka
          </p>
        </div>
        <Button onClick={handleDownloadCsv} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Download CSV
        </Button>
      </div>

      {/* Enhanced stats section for IIT Bombay users - now showing totals across all companies */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-lg p-4 border">
          <div className="text-2xl font-bold text-primary">{totalCount}</div>
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
        <div className="space-y-4">
          <CompaniesTable 
            companies={companies} 
            onCompanyClick={handleCompanyClick} 
            onDeleteCompany={handleDeleteCompany} 
            onSortChange={handleSortChange}
            currentSort={{ field: sortBy, order: sortOrder }}
            isIITBombay={true} 
          />
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {startItem} to {endItem} of {totalCount} companies
              </div>
              
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {/* Show page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => handlePageChange(pageNum)}
                          isActive={currentPage === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-card/50">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No prospects found</h3>
          <p className="mt-2 text-muted-foreground">
            No prospects available at the moment.
          </p>
        </div>
      )}
    </div>;
}
