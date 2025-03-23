
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { ListFilter, Grid, Table as TableIcon, AlertTriangle } from "lucide-react";
import { useCompanies } from "@/hooks/useCompanies";
import { CompanyListItem } from "@/lib/api/apiContract";
import { Button } from "@/components/ui/button";
import { CompaniesTable } from "./CompaniesTable";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis
} from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";

type SortOption = "name" | "score" | "date" | "source";
type ViewMode = "grid" | "table";

const getSortField = (option: SortOption): string => {
  switch (option) {
    case 'name': return 'name';
    case 'score': return 'overall_score';
    case 'date': return 'created_at';
    case 'source': return 'source';
    default: return 'created_at';
  }
};

const getSortOrder = (option: SortOption): 'asc' | 'desc' => {
  return option === 'name' || option === 'source' ? 'asc' : 'desc';
};

// Helper to get source info with appropriate styling
const getSourceInfo = (source: string | undefined) => {
  if (source === 'public_url') {
    return {
      label: "Public URL",
      className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    };
  }
  
  if (source === 'email') {
    return {
      label: "Email",
      className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
    };
  }
  
  // Default to Dashboard (gold color)
  return {
    label: "Dashboard",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
  };
};

export function CompaniesList() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const pageSize = 20;
  const { toast } = useToast();
  
  const { companies, totalCount, isLoading, error } = useCompanies(
    currentPage, 
    pageSize, 
    getSortField(sortBy),
    getSortOrder(sortBy)
  );

  useEffect(() => {
    if (error) {
      console.error("Error fetching companies:", error);
      toast({
        title: "Error fetching companies",
        description: "There was a problem loading your companies. Please try again.",
        variant: "destructive"
      });
    }
  }, [error, toast]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const handleCompanyClick = (companyId: number) => {
    navigate(`/company/${companyId}`);
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    
    pages.push(1);
    
    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);
    
    if (startPage > 2) {
      pages.push(-1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    if (endPage < totalPages - 1) {
      pages.push(-2);
    }
    
    if (totalPages > 1) {
      pages.push(totalPages);
    }
    
    return pages;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Prospects</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-2 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center h-64">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Prospects</h2>
          <p className="text-muted-foreground mb-4">There was a problem fetching your prospect data.</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  console.log(`Rendering ${companies.length} companies, total: ${totalCount}`);

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Prospects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select a prospect to view detailed metrics
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-2">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode("grid")}
              className={viewMode === "grid" ? "bg-muted" : ""}
            >
              <Grid className="h-4 w-4 mr-1" />
              Grid
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode("table")}
              className={viewMode === "table" ? "bg-muted" : ""}
            >
              <TableIcon className="h-4 w-4 mr-1" />
              Table
            </Button>
          </div>
          
          <Select
            value={sortBy}
            onValueChange={(value) => {
              setSortBy(value as SortOption);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <ListFilter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort by Name</SelectItem>
              <SelectItem value="score">Sort by Score</SelectItem>
              <SelectItem value="date">Sort by Date</SelectItem>
              <SelectItem value="source">Sort by Source</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {companies.length > 0 ? (
        <>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {companies.map((company) => {
                const sourceInfo = getSourceInfo(company.source);
                return (
                  <Card 
                    key={company.id} 
                    className="cursor-pointer transition-all hover:shadow-md"
                    onClick={() => handleCompanyClick(company.id)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg sm:text-xl">{company.name}</CardTitle>
                      <CardDescription>Overall Score: {company.overallScore}/5</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Progress 
                        value={company.overallScore * 20} 
                        className="h-2 mb-2" 
                      />
                      <div className="flex flex-col gap-1.5">
                        <Badge 
                          variant="outline" 
                          className={`w-fit text-xs font-medium ${sourceInfo.className}`}
                        >
                          {sourceInfo.label}
                        </Badge>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Added: {new Date(company.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <CompaniesTable 
              companies={companies} 
              onCompanyClick={handleCompanyClick} 
            />
          )}
          
          {totalPages > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  />
                </PaginationItem>
                
                {getPageNumbers().map((pageNum, index) => (
                  <PaginationItem key={index}>
                    {pageNum === -1 || pageNum === -2 ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        isActive={pageNum === currentPage}
                        onClick={() => goToPage(pageNum)}
                      >
                        {pageNum}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      ) : (
        <div className="text-center py-16 border rounded-lg bg-muted/20">
          <h3 className="text-lg font-medium mb-2">No prospects found</h3>
          <p className="text-muted-foreground mb-6">
            You don't have any prospects yet or your search returned no results.
          </p>
          <Button onClick={() => navigate("/upload")}>
            Upload New Pitch Deck
          </Button>
        </div>
      )}
    </div>
  );
}
