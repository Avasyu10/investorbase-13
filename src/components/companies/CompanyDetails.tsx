
import { useParams, useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { SectionCard } from "./SectionCard";
import { ScoreAssessment } from "./ScoreAssessment";
import { useCompanyDetails } from "@/hooks/useCompanies";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, BarChart2 } from "lucide-react";

export function CompanyDetails() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { company, isLoading } = useCompanyDetails(companyId);

  const handleSectionClick = (sectionId: number | string) => {
    navigate(`/company/${companyId}/section/${sectionId}`);
  };

  const navigateToReport = () => {
    if (company?.reportId) {
      navigate(`/reports/${company.reportId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-secondary rounded w-1/3"></div>
          <div className="h-6 bg-secondary rounded w-1/2"></div>
          
          <Card className="mb-8 border-0 shadow-subtle">
            <CardContent className="p-6">
              <div className="h-6 bg-secondary rounded w-1/2 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-secondary rounded w-full"></div>
                <div className="h-4 bg-secondary rounded w-full"></div>
                <div className="h-4 bg-secondary rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
          
          <div className="h-6 bg-secondary rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-40 bg-secondary rounded shadow-subtle"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Company not found</p>
      </div>
    );
  }

  const formattedScore = company.overallScore ? parseFloat(company.overallScore.toFixed(1)) : 0;

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return "score-excellent";
    if (score >= 3.5) return "score-good";
    if (score >= 2.5) return "score-average";
    if (score >= 1.5) return "score-poor";
    return "score-critical";
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 animate-fade-in">
      <div className="mb-7 sm:mb-9">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{company.name}</h1>
          </div>
          <div className="flex items-center gap-4 mt-2 sm:mt-0">
            {company.reportId && (
              <Button 
                onClick={navigateToReport} 
                variant="outline" 
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                View Report
              </Button>
            )}
            <div className="flex items-center">
              <span className="text-xl sm:text-2xl font-bold text-primary mr-3">
                {formattedScore}
              </span>
              <span className="text-sm text-muted-foreground">/5</span>
            </div>
          </div>
        </div>
        
        <div className="mb-5">
          <Progress 
            value={company.overallScore * 20} 
            className={`h-2 ${getScoreColor(company.overallScore)}`} 
          />
        </div>

        <ScoreAssessment company={company} />
      </div>
      
      <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-5 flex items-center gap-2">
        <BarChart2 className="h-5 w-5 text-primary" />
        Section Metrics
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {company.sections.map((section) => (
          <SectionCard 
            key={section.id} 
            section={section} 
            onClick={() => handleSectionClick(section.id)} 
          />
        ))}
      </div>
    </div>
  );
}
