
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { SectionCard } from "./SectionCard";
import { ScoreAssessment } from "./ScoreAssessment";
import { COMPANIES_DETAILED_DATA_WITH_ASSESSMENT } from "@/lib/companyData";

export function CompanyDetails() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);

  useEffect(() => {
    // Simulate API call to fetch company details
    if (companyId && COMPANIES_DETAILED_DATA_WITH_ASSESSMENT[Number(companyId)]) {
      setCompany(COMPANIES_DETAILED_DATA_WITH_ASSESSMENT[Number(companyId)]);
    }
  }, [companyId]);

  const handleSectionClick = (sectionId: string) => {
    navigate(`/company/${companyId}/section/${sectionId}`);
  };

  if (!company) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading company details...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
        <div className="flex items-center mt-4 mb-6">
          <span className="text-2xl font-bold mr-4">Overall Score: {company.overallScore}/5</span>
          <Progress 
            value={company.overallScore * 20} 
            className="h-3 flex-1" 
          />
        </div>

        <ScoreAssessment company={company} />
      </div>
      
      <h2 className="text-2xl font-semibold mb-4">Section Metrics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
