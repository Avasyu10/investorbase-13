
import { useState, useMemo } from "react";
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
import { ListFilter } from "lucide-react";
import { useCompanies } from "@/hooks/useCompanies";
import { CompanyListItem } from "@/lib/api/apiContract";

type SortOption = "name" | "score";

export function CompaniesList() {
  const navigate = useNavigate();
  const { companies, isLoading } = useCompanies();
  const [sortBy, setSortBy] = useState<SortOption>("name");

  // Sort companies based on the selected option
  const sortedCompanies = useMemo(() => {
    if (!companies) return [];
    
    return [...companies].sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      } else {
        return b.score - a.score; // Sort by score descending
      }
    });
  }, [companies, sortBy]);

  const handleCompanyClick = (companyId: number) => {
    navigate(`/company/${companyId}`);
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
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
          <p className="text-muted-foreground mt-1">
            Select a company to view detailed metrics
          </p>
        </div>
        
        <div className="mt-4 md:mt-0">
          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as SortOption)}
          >
            <SelectTrigger className="w-[180px]">
              <ListFilter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort by name</SelectItem>
              <SelectItem value="score">Sort by score</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedCompanies.length > 0 ? (
          sortedCompanies.map((company) => (
            <Card 
              key={company.id} 
              className="cursor-pointer transition-all hover:shadow-md"
              onClick={() => handleCompanyClick(company.id)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">{company.name}</CardTitle>
                <CardDescription>Overall Score: {company.score}/5</CardDescription>
              </CardHeader>
              <CardContent>
                <Progress 
                  value={company.score * 20} 
                  className="h-2 mb-2" 
                />
                <p className="text-sm text-muted-foreground">
                  Click to view detailed metrics
                </p>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-3 text-center py-12">
            <p className="text-muted-foreground">No companies found</p>
          </div>
        )}
      </div>
    </div>
  );
}
