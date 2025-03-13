
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useCompanyDetails } from "@/hooks/useCompanies";

const AnalysisSummary = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { company, isLoading: companyLoading } = useCompanyDetails(
    companyId ? Number(companyId) : undefined
  );

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  const isLoading = authLoading || companyLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <Card className="mb-8">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
                ))}
              </div>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center">
                    <div className="h-4 bg-gray-200 rounded w-48 mr-2"></div>
                    <div className="h-2 bg-gray-200 rounded flex-1"></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (!company) {
    return <div className="container mx-auto px-4 py-8">Company not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate(`/company/${companyId}`)}
        className="mb-6"
      >
        <ChevronLeft className="mr-1" /> Back to {company.name}
      </Button>
      
      <h1 className="text-3xl font-bold tracking-tight mb-6">{company.name} - Analysis Summary</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Overall Performance</span>
            <span className="text-2xl">{company.overallScore}/5</span>
          </CardTitle>
          <Progress value={company.overallScore * 20} className="h-2 mt-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-medium mb-3">Key Strengths</h3>
            <ul className="list-disc pl-5 space-y-2">
              {company.assessmentPoints.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium mb-3">Section Overview</h3>
            <div className="space-y-4">
              {company.sections.map((section) => (
                <div key={section.id} className="flex items-center">
                  <span className="w-48 font-medium">{section.title}</span>
                  <Progress value={section.score * 20} className="flex-1 h-2" />
                  <span className="ml-4 w-12 text-right">{section.score}/5</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AnalysisSummary;
