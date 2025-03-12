import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// Define the section types
export type SectionType = 
  | "PROBLEM" 
  | "MARKET" 
  | "SOLUTION" 
  | "PRODUCT" 
  | "COMPETITIVE_LANDSCAPE" 
  | "TRACTION" 
  | "BUSINESS_MODEL" 
  | "GTM_STRATEGY" 
  | "TEAM" 
  | "FINANCIALS" 
  | "ASK";

// Section data interface
interface SectionData {
  id: string;
  type: SectionType;
  title: string;
  score: number;
  description: string;
}

// Company data interface
interface CompanyData {
  id: number;
  name: string;
  overallScore: number;
  assessmentPoints: string[];
  sections: SectionData[];
}

// Dummy company data with sections
const COMPANIES_DETAILED_DATA: Record<number, CompanyData> = {
  1: {
    id: 1,
    name: "TechFusion",
    overallScore: 4.2,
    assessmentPoints: [
      "Strong product-market fit with innovative solution",
      "Experienced team with proven track record",
      "Clear path to profitability with sustainable business model",
      "Well-defined market strategy and competitive positioning"
    ],
    sections: [
      { id: "sec1", type: "PROBLEM", title: "Problem", score: 4.5, description: "Clear problem identification with market validation" },
      { id: "sec2", type: "MARKET", title: "Market", score: 4.2, description: "Large addressable market with growth potential" },
      { id: "sec3", type: "SOLUTION", title: "Solution", score: 4.7, description: "Innovative solution with clear differentiation" },
      { id: "sec4", type: "PRODUCT", title: "Product", score: 4.3, description: "Well-developed product with strong feature set" },
      { id: "sec5", type: "COMPETITIVE_LANDSCAPE", title: "Competitive Landscape", score: 3.9, description: "Several competitors but with clear differentiation" },
      { id: "sec6", type: "TRACTION", title: "Traction", score: 4.1, description: "Solid user growth and engagement metrics" },
      { id: "sec7", type: "BUSINESS_MODEL", title: "Business Model", score: 4.4, description: "Scalable business model with multiple revenue streams" },
      { id: "sec8", type: "GTM_STRATEGY", title: "GTM Strategy", score: 3.8, description: "Clear go-to-market strategy with initial execution" },
      { id: "sec9", type: "TEAM", title: "Team", score: 4.6, description: "Strong team with relevant experience and complementary skills" },
      { id: "sec10", type: "FINANCIALS", title: "Financials", score: 4.0, description: "Solid financial projections with reasonable assumptions" },
      { id: "sec11", type: "ASK", title: "Ask", score: 3.9, description: "Clear funding requirements and use of funds" }
    ]
  },
  2: {
    id: 2,
    name: "GreenEnergy Solutions",
    overallScore: 3.8,
    assessmentPoints: [
      "Promising technology with growing market potential",
      "Skilled technical team requiring business experience",
      "Early market validation with pilot projects"
    ],
    sections: [
      { id: "sec1", type: "PROBLEM", title: "Problem", score: 4.0, description: "Energy sustainability issues clearly outlined" },
      { id: "sec2", type: "MARKET", title: "Market", score: 4.2, description: "Growing renewable energy market with regulatory support" },
      { id: "sec3", type: "SOLUTION", title: "Solution", score: 3.8, description: "Novel renewable energy technology with some technical challenges" },
      { id: "sec4", type: "PRODUCT", title: "Product", score: 3.5, description: "Product still in development with promising prototypes" },
      { id: "sec5", type: "COMPETITIVE_LANDSCAPE", title: "Competitive Landscape", score: 3.6, description: "Competitive market with several established players" },
      { id: "sec6", type: "TRACTION", title: "Traction", score: 3.2, description: "Early traction with pilot projects" },
      { id: "sec7", type: "BUSINESS_MODEL", title: "Business Model", score: 3.9, description: "Service-based model with recurring revenue potential" },
      { id: "sec8", type: "GTM_STRATEGY", title: "GTM Strategy", score: 3.7, description: "B2B focus with clear customer acquisition strategy" },
      { id: "sec9", type: "TEAM", title: "Team", score: 4.1, description: "Strong technical team with some gaps in business experience" },
      { id: "sec10", type: "FINANCIALS", title: "Financials", score: 3.5, description: "Conservative financial projections with clear milestones" },
      { id: "sec11", type: "ASK", title: "Ask", score: 4.2, description: "Well-structured funding request with clear allocation plan" }
    ]
  },
};

// Section card component
function SectionCard({ section, onClick }: { section: SectionData, onClick: () => void }) {
  return (
    <Card 
      className="cursor-pointer transition-all hover:shadow-md"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{section.title}</CardTitle>
        <CardDescription>Score: {section.score}/5</CardDescription>
      </CardHeader>
      <CardContent>
        <Progress 
          value={section.score * 20} 
          className="h-2 mb-2" 
        />
        <p className="text-sm text-muted-foreground truncate">
          {section.description}
        </p>
      </CardContent>
    </Card>
  );
}

export function CompanyDetails() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<CompanyData | null>(null);

  useEffect(() => {
    // Simulate API call to fetch company details
    if (companyId && COMPANIES_DETAILED_DATA[Number(companyId)]) {
      setCompany(COMPANIES_DETAILED_DATA[Number(companyId)]);
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

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Overall Score Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2">
              {company.assessmentPoints.map((point, index) => (
                <li key={index} className="text-muted-foreground">{point}</li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Link 
              to={`/company/${company.id}/analysis`}
              className="text-sm text-primary hover:underline"
            >
              View Full Analysis Summary →
            </Link>
          </CardFooter>
        </Card>
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
