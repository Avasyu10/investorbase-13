
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, Building2, GraduationCap } from "lucide-react";
import { CompaniesTable } from "./CompaniesTable";
import { useAuth } from "@/hooks/useAuth";
import { useCompanies } from "@/hooks/useCompanies";

export function IITBombayCompaniesList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const { companies, isLoading, error } = useCompanies(1, 50, 'created_at', 'desc', searchTerm);

  const handleCompanyClick = (companyId: string) => {
    navigate(`/company/${companyId}`);
  };

  // Calculate rating-based stats
  const totalProspects = companies.length;
  const highPotential = companies.filter(c => c.overall_score > 70).length;
  const mediumPotential = companies.filter(c => c.overall_score >= 50 && c.overall_score <= 70).length;
  const badPotential = companies.filter(c => c.overall_score < 50).length;

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
            <h1 className="text-2xl font-bold tracking-tight">IIT Bombay Prospects</h1>
          </div>
          <p className="text-muted-foreground">
            Enhanced prospect tracking and management for IIT Bombay alumni network
          </p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <Button 
            onClick={() => navigate("/upload")} 
            variant="outline"
          >
            Upload Deck
          </Button>
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
        <CompaniesTable companies={companies} onCompanyClick={handleCompanyClick} />
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
