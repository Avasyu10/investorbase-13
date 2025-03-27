
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { ChevronLeft } from "lucide-react";
import { ErrorCard } from "@/components/ErrorCard";
import { supabase } from "@/integrations/supabase/client";
import { OverallAssessment } from "@/components/companies/OverallAssessment";
import { CompanyInfoCard } from "@/components/companies/CompanyInfoCard";
import { CompanyDetails as CompanyDetailsComponent } from "@/components/companies/CompanyDetails";
import { MarketResearch } from "@/components/companies/MarketResearch";
import { FundThesisAlignment } from "@/components/companies/FundThesisAlignment";

export default function CompanyDetails() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [company, setCompany] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { state: { from: '/companies' } });
    } else if (companyId && user) {
      fetchCompanyDetails();
    }
  }, [companyId, user, authLoading, navigate]);

  const fetchCompanyDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!companyId) {
        throw new Error("Company ID is required");
      }

      // Fetch company details
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select(`
          *,
          sections(*)
        `)
        .eq('id', companyId)
        .single();

      if (companyError) {
        throw companyError;
      }

      if (!companyData) {
        throw new Error("Company not found");
      }

      setCompany(companyData);
    } catch (error: any) {
      console.error("Error fetching company details:", error);
      setError(error.message || "Failed to load company details");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || (isLoading && !error)) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <ErrorCard
        title="Error Loading Company"
        message={error}
        actionText="Back to Companies"
        onAction={() => navigate('/companies')}
      />
    );
  }

  if (!company) return null;

  // Safely access company data
  const companyName = company.name || "Unknown Company";
  const overallScore = typeof company.overall_score === 'number' ? company.overall_score.toString() : "0";
  const assessmentPoints = Array.isArray(company.assessment_points) 
    ? company.assessment_points 
    : [];

  return (
    <div className="container mx-auto px-4 py-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start mb-6">
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/companies')}
            className="mb-2 flex items-center"
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Back to Companies
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{companyName}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <CompanyInfoCard 
            company={company}
            overallScore={overallScore}
          />
        </div>

        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 w-full mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Detailed Analysis</TabsTrigger>
              <TabsTrigger value="market-research">Market Research</TabsTrigger>
              <TabsTrigger value="thesis-alignment">Thesis Alignment</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-0">
              <OverallAssessment 
                company={company} 
                overallScore={overallScore}
                sections={company.sections || []}
              />
            </TabsContent>
            
            <TabsContent value="details" className="mt-0">
              <CompanyDetailsComponent 
                company={company}
                sections={company.sections || []}
              />
            </TabsContent>

            <TabsContent value="market-research" className="mt-0">
              <MarketResearch 
                companyId={companyId || ''} 
                assessmentPoints={assessmentPoints}
              />
            </TabsContent>

            <TabsContent value="thesis-alignment" className="mt-0">
              <FundThesisAlignment 
                companyId={companyId || ''}
                companyName={companyName}
                assessmentPoints={assessmentPoints}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
