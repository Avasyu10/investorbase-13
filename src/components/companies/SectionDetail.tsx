
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { COMPANIES_DETAILED_DATA, SectionData, CompanyData } from "@/lib/dummyData";
import { ChevronRight } from "lucide-react";

export function SectionDetail() {
  const { companyId, sectionId } = useParams<{ companyId: string, sectionId: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [section, setSection] = useState<SectionData | null>(null);

  useEffect(() => {
    // Simulate API call to fetch company and section details
    if (companyId && COMPANIES_DETAILED_DATA[Number(companyId)]) {
      const companyData = COMPANIES_DETAILED_DATA[Number(companyId)];
      setCompany(companyData);
      
      if (sectionId) {
        const sectionData = companyData.sections.find(s => s.id === sectionId) || null;
        setSection(sectionData);
      }
    }
  }, [companyId, sectionId]);

  if (!company || !section) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading section details...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar Navigation */}
      <div className="w-64 border-r bg-background/95 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
        <div className="p-4 border-b">
          <h3 className="font-medium">{company.name}</h3>
          <p className="text-sm text-muted-foreground">Sections</p>
        </div>
        <nav className="flex flex-col">
          {company.sections.map((s) => (
            <Link
              key={s.id}
              to={`/company/${companyId}/section/${s.id}`}
              className={`flex items-center px-4 py-3 text-sm hover:bg-muted transition-colors ${
                s.id === sectionId ? "bg-muted font-medium" : ""
              }`}
            >
              <span className="flex-1">{s.title}</span>
              {s.id === sectionId && <ChevronRight className="h-4 w-4" />}
            </Link>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-4 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">{section.title}</CardTitle>
              <div className="flex items-center space-x-4">
                <span className="font-medium">Score: {section.score}/5</span>
                <div className="w-32">
                  <Progress value={section.score * 20} className="h-2" />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Summary</h3>
                <p>{section.description}</p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Detailed Analysis</h3>
                <p className="mb-3">
                  {getSectionDetailedContent(section.type)}
                </p>
                
                <div className="mt-6 space-y-4">
                  <h4 className="font-medium">Key Strengths:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {getStrengths(section.type).map((strength, idx) => (
                      <li key={idx}>{strength}</li>
                    ))}
                  </ul>
                  
                  <h4 className="font-medium">Areas for Improvement:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {getWeaknesses(section.type).map((weakness, idx) => (
                      <li key={idx}>{weakness}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper functions to generate detailed content based on section type
function getSectionDetailedContent(sectionType: string): string {
  const contentMap: Record<string, string> = {
    PROBLEM: "The company has clearly identified a significant market pain point that affects a large number of potential customers. The problem statement is well articulated with supporting market research and customer validation. The problem's urgency and impact on customers are well documented.",
    MARKET: "The total addressable market is substantial with a clear growth trajectory. Market analysis shows strong potential for scaling with limited regulatory barriers. The company has identified specific market segments with the highest potential for early adoption.",
    SOLUTION: "The proposed solution directly addresses the identified problem with a unique approach. There is a clear value proposition that differentiates from existing alternatives. The solution has a strong potential for intellectual property protection.",
    PRODUCT: "The product has been developed with a clear roadmap and feature prioritization based on customer needs. The technology stack is appropriate and scalable. User experience has been given significant attention with multiple iterations based on user feedback.",
    COMPETITIVE_LANDSCAPE: "The competitive analysis is thorough, identifying both direct and indirect competitors. Key differentiators have been clearly articulated. The company has a sustainable advantage that would be difficult for competitors to replicate in the short term.",
    TRACTION: "The company has demonstrated consistent user growth and engagement. Key performance indicators show positive trends. Early customer testimonials and case studies support the value proposition claims.",
    BUSINESS_MODEL: "The revenue model is clear with multiple potential streams identified. Unit economics show a path to profitability. The pricing strategy is competitive and sustainable with room for adjustments based on market feedback.",
    GTM_STRATEGY: "The go-to-market strategy includes well-defined customer acquisition channels. Initial marketing experiments show promising customer acquisition costs. The sales cycle and approach are appropriate for the target market segments.",
    TEAM: "The founding team has complementary skills and relevant industry experience. Key positions have been filled with qualified individuals. The team has demonstrated the ability to execute and adapt to changing market conditions.",
    FINANCIALS: "Financial projections are realistic with conservative growth assumptions. Cash flow analysis shows a clear understanding of capital requirements. The company has a good handle on key financial metrics and unit economics.",
    ASK: "The funding request is appropriate for the current stage and planned milestones. Use of funds is clearly articulated with specific allocation to key development areas. The valuation expectations are reasonable based on comparable companies."
  };
  
  return contentMap[sectionType] || "Detailed analysis will be provided soon.";
}

function getStrengths(sectionType: string): string[] {
  const strengthsMap: Record<string, string[]> = {
    PROBLEM: [
      "Clear articulation of customer pain points",
      "Strong evidence from market research",
      "Problem affects a large addressable market",
      "Demonstrated urgency for solution"
    ],
    MARKET: [
      "Large total addressable market",
      "Clear growth trends in the target segments",
      "Limited regulatory barriers to entry",
      "Well-defined customer segments"
    ],
    SOLUTION: [
      "Innovative approach with clear differentiation",
      "Strong alignment with identified problem",
      "Potential for intellectual property protection",
      "Scalable solution architecture"
    ],
    PRODUCT: [
      "Well-developed feature set addressing core needs",
      "Intuitive user experience with positive feedback",
      "Scalable technology infrastructure",
      "Clear development roadmap based on priorities"
    ],
    COMPETITIVE_LANDSCAPE: [
      "Comprehensive competitor analysis",
      "Clear differentiation from existing solutions",
      "Sustainable competitive advantages identified",
      "Understanding of market positioning"
    ],
    TRACTION: [
      "Strong user growth metrics",
      "Positive engagement statistics",
      "Customer testimonials supporting value claims",
      "Promising conversion metrics"
    ],
    BUSINESS_MODEL: [
      "Clear revenue streams with demonstrated potential",
      "Sustainable unit economics",
      "Competitive pricing strategy",
      "Multiple monetization opportunities"
    ],
    GTM_STRATEGY: [
      "Well-defined customer acquisition channels",
      "Reasonable customer acquisition costs",
      "Appropriate sales approach for target market",
      "Clear milestones for market penetration"
    ],
    TEAM: [
      "Strong relevant industry experience",
      "Complementary skill sets among founders",
      "Demonstrated execution capabilities",
      "Ability to attract key talent"
    ],
    FINANCIALS: [
      "Realistic financial projections",
      "Clear understanding of unit economics",
      "Well-planned cash flow management",
      "Appropriate capital allocation strategy"
    ],
    ASK: [
      "Clear funding requirements tied to milestones",
      "Reasonable valuation expectations",
      "Well-articulated use of funds",
      "Strategic approach to investor relationships"
    ]
  };
  
  return strengthsMap[sectionType] || ["Strengths analysis will be provided soon."];
}

function getWeaknesses(sectionType: string): string[] {
  const weaknessesMap: Record<string, string[]> = {
    PROBLEM: [
      "Consider more quantitative evidence of problem impact",
      "Further segment problem by customer type",
      "Address potential market changes that could affect problem relevance"
    ],
    MARKET: [
      "More detailed analysis of market segmentation needed",
      "Further assessment of market entry barriers",
      "Additional research on customer willingness to pay"
    ],
    SOLUTION: [
      "Consider potential technical implementation challenges",
      "Further differentiate from indirect competitors",
      "Address scalability concerns more thoroughly"
    ],
    PRODUCT: [
      "Additional user testing recommended for core features",
      "Consider more detailed technical architecture documentation",
      "Strengthen security and compliance considerations"
    ],
    COMPETITIVE_LANDSCAPE: [
      "Monitor emerging competitors more proactively",
      "Deepen analysis of potential market entrants",
      "Strengthen response strategy to competitive threats"
    ],
    TRACTION: [
      "Improve customer retention metrics",
      "Expand early customer testimonials",
      "Strengthen evidence of product-market fit"
    ],
    BUSINESS_MODEL: [
      "Further validate pricing model with target customers",
      "Strengthen analysis of long-term sustainability",
      "Consider additional revenue diversification"
    ],
    GTM_STRATEGY: [
      "Refine channel economics for primary acquisition channels",
      "Strengthen partnership strategy",
      "Develop more detailed marketing plan with clear KPIs"
    ],
    TEAM: [
      "Consider strengthening advisory board",
      "Address key skill gaps in technical leadership",
      "Develop clearer organizational scaling plan"
    ],
    FINANCIALS: [
      "Refine cash flow projections with more conservative scenarios",
      "Strengthen unit economics analysis",
      "Develop more detailed milestone-based budgeting"
    ],
    ASK: [
      "Provide more detailed breakdown of capital allocation",
      "Strengthen alignment between funding and key milestones",
      "Refine valuation justification with more comparable evidence"
    ]
  };
  
  return weaknessesMap[sectionType] || ["Areas for improvement will be provided soon."];
}
