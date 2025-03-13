
import { useParams, useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { SectionCard } from "./SectionCard";
import { ScoreAssessment } from "./ScoreAssessment";
import { useCompanyDetails } from "@/hooks/useCompanies";
import { Card, CardContent } from "@/components/ui/card";
import { SectionBase } from "@/lib/api/apiContract";

export function CompanyDetails() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { company, isLoading } = useCompanyDetails(companyId ? Number(companyId) : undefined);

  const handleSectionClick = (sectionId: number) => {
    navigate(`/company/${companyId}/section/${sectionId}`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-6 bg-gray-200 rounded w-full mb-6"></div>
          
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
          
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-40 bg-gray-200 rounded"></div>
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

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 animate-fade-in">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{company.name}</h1>
        <div className="flex flex-col sm:flex-row sm:items-center mt-3 sm:mt-4 mb-4 sm:mb-6">
          <span className="text-xl sm:text-2xl font-bold mb-2 sm:mb-0 sm:mr-4">Overall Score: {company.overallScore}/5</span>
          <Progress 
            value={company.overallScore * 20} 
            className="h-2 sm:h-3 flex-1" 
          />
        </div>

        <ScoreAssessment company={company} />
      </div>
      
      <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">Section Metrics</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {company.sections.map((section) => (
          <SectionCard 
            key={section.id} 
            section={section as unknown as any} 
            onClick={() => handleSectionClick(section.id)} 
          />
        ))}
      </div>
    </div>
  );
}
