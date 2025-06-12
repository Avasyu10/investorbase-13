
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, Building2 } from "lucide-react";
import { CompaniesTable } from "./CompaniesTable";
import { OverallAssessment } from "./OverallAssessment";
import { useAuth } from "@/hooks/useAuth";
import { useCompanies } from "@/hooks/useCompanies";

export function CompaniesList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  // Use the useCompanies hook which has proper RLS handling
  const { companies, isLoading, error } = useCompanies(1, 50, 'created_at', 'desc', searchTerm);

  const handleCompanyClick = (companyId: number) => {
    navigate(`/company/${companyId}`);
  };

  // Calculate summary statistics for OverallAssessment
  const averageScore = companies.length > 0 
    ? companies.reduce((sum, company) => sum + company.overallScore, 0) / companies.length
    : 0;

  const assessmentPoints = companies.length > 0 ? [
    `You have ${companies.length} prospect${companies.length === 1 ? '' : 's'} in your pipeline with an average score of ${Math.round(averageScore)}/100.`,
    `${companies.filter(c => c.overallScore >= 80).length} prospect${companies.filter(c => c.overallScore >= 80).length === 1 ? ' is' : 's are'} in the high-potential category (80+ score).`,
    `${companies.filter(c => c.overallScore >= 60 && c.overallScore < 80).length} prospect${companies.filter(c => c.overallScore >= 60 && c.overallScore < 80).length === 1 ? ' shows' : 's show'} moderate potential (60-79 score).`,
    `${companies.filter(c => c.source === 'email').length} prospect${companies.filter(c => c.source === 'email').length === 1 ? ' was' : 's were'} received via email submissions.`,
    `Most recent prospect was added ${companies.length > 0 ? new Date(companies[0].createdAt).toLocaleDateString() : 'N/A'}.`,
    "Continue reviewing prospects to identify the most promising investment opportunities for your fund."
  ] : [];

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

      {companies.length > 0 ? (
        <div className="space-y-6">
          <OverallAssessment 
            score={averageScore}
            assessmentPoints={assessmentPoints}
          />
          <CompaniesTable companies={companies} onCompanyClick={handleCompanyClick} />
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-card/50">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No prospects found</h3>
          <p className="mt-2 text-muted-foreground">
            Upload your first pitch deck to start analyzing prospects.
          </p>
          <Button 
            onClick={() => navigate("/upload")} 
            className="mt-6"
          >
            Upload Your First Deck
          </Button>
        </div>
      )}
    </div>
  );
}
