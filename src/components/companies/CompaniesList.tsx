
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// Dummy data for companies and their scores
const COMPANIES_DATA = [
  { id: 1, name: "TechFusion", score: 4.2 },
  { id: 2, name: "GreenEnergy Solutions", score: 3.8 },
  { id: 3, name: "MedTech Innovations", score: 4.5 },
  { id: 4, name: "FinanceFlow", score: 3.6 },
  { id: 5, name: "RetailRevolution", score: 4.0 },
  { id: 6, name: "AIVentures", score: 4.7 },
  { id: 7, name: "CloudNine Systems", score: 3.9 },
  { id: 8, name: "EcoTrends", score: 3.5 },
];

export function CompaniesList() {
  const navigate = useNavigate();
  const [companies] = useState(COMPANIES_DATA);

  const handleCompanyClick = (companyId: number) => {
    navigate(`/company/${companyId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
        <p className="text-muted-foreground mt-1">
          Select a company to view detailed metrics
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies.map((company) => (
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
