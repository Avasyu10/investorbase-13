
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
import { ListFilter, Grid, Table as TableIcon } from "lucide-react";
import { useCompanies } from "@/hooks/useCompanies";
import { CompanyListItem } from "@/lib/api/apiContract";
import { Button } from "@/components/ui/button";
import { CompaniesTable } from "./CompaniesTable";

type SortOption = "name" | "score" | "date";
type ViewMode = "grid" | "table";

export function CompaniesList() {
  const navigate = useNavigate();
  const { companies, isLoading } = useCompanies();
  const [sortBy, setSortBy] = useState<SortOption>("score");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [sortedCompanies, setSortedCompanies] = useState<CompanyListItem[]>([]);

  // Fixed the infinite update loop by properly handling dependencies
  useEffect(() => {
    if (!companies) {
      setSortedCompanies([]);
      return;
    }
    
    const sorted = [...companies].sort((a, b) => {
      if (sortBy === "name") {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      } 
      
      if (sortBy === "score") {
        const scoreA = a.overallScore || 0;
        const scoreB = b.overallScore || 0;
        return scoreB - scoreA;
      }
      
      try {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      } catch (error) {
        console.error("Date sorting error:", error, a.createdAt, b.createdAt);
        return 0;
      }
    });
    
    setSortedCompanies(sorted);
  }, [companies, sortBy]); // Only depend on companies and sortBy

  const handleCompanyClick = (companyId: number) => {
    navigate(`/company/${companyId}`);
  };

  const getTableSortField = (option: SortOption): 'name' | 'overallScore' | 'createdAt' => {
    switch (option) {
      case 'name': return 'name';
      case 'score': return 'overallScore';
      case 'date': return 'createdAt';
      default: return 'overallScore';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
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

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Companies</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select a company to view detailed metrics
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
            onValueChange={(value) => setSortBy(value as SortOption)}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <ListFilter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort by Name</SelectItem>
              <SelectItem value="score">Sort by Score</SelectItem>
              <SelectItem value="date">Sort by Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {sortedCompanies.length > 0 ? (
            sortedCompanies.map((company) => (
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
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Added: {new Date(company.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-1 sm:col-span-3 text-center py-8 sm:py-12">
              <p className="text-muted-foreground">No companies found</p>
            </div>
          )}
        </div>
      ) : (
        <CompaniesTable 
          companies={sortedCompanies} 
          onCompanyClick={handleCompanyClick} 
        />
      )}
    </div>
  );
}
