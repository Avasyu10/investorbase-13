
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

// Dummy data for companies and their scores
const COMPANIES_DATA = [
  { id: 1, name: "TechFusion AI", score: 4.7 },
  { id: 2, name: "GreenEnergy Solutions", score: 4.2 },
  { id: 3, name: "MedTech Innovations", score: 4.8 },
  { id: 4, name: "FinanceFlow", score: 3.9 },
  { id: 5, name: "RetailRevolution", score: 4.1 },
  { id: 6, name: "DataSense Analytics", score: 4.5 },
  { id: 7, name: "CloudScale Systems", score: 4.3 },
  { id: 8, name: "EcoTrends Manufacturing", score: 3.8 },
  { id: 9, name: "HealthAI Solutions", score: 4.6 },
  { id: 10, name: "CyberShield Security", score: 4.4 },
  { id: 11, name: "SmartHome Technologies", score: 4.0 },
  { id: 12, name: "BlockchainX Solutions", score: 3.7 }
];

type SortOption = "name" | "score";

export function CompaniesList() {
  const navigate = useNavigate();
  const [companiesData] = useState(COMPANIES_DATA);
  const [sortBy, setSortBy] = useState<SortOption>("name");

  // Sort companies based on the selected option
  const sortedCompanies = useMemo(() => {
    return [...companiesData].sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      } else {
        return b.score - a.score; // Sort by score descending
      }
    });
  }, [companiesData, sortBy]);

  const handleCompanyClick = (companyId: number) => {
    navigate(`/company/${companyId}`);
  };

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
        {sortedCompanies.map((company) => (
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
        ))}
      </div>
    </div>
  );
}
