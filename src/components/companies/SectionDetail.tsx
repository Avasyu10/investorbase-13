
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, Menu, X, CheckCircle, XCircle } from "lucide-react";
import { useCompanyDetails, useSectionDetails } from "@/hooks/useCompanies";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SECTION_TYPES } from "@/lib/constants";

// Default strengths and weaknesses by section type
const DEFAULT_STRENGTHS = {
  [SECTION_TYPES.PROBLEM]: [
    "Clear identification of target audience pain points",
    "Problem has significant economic impact",
    "Issue affects a large addressable market",
    "Problem is persistent and not easily solved by existing solutions",
    "Strong evidence from market research supporting the problem statement"
  ],
  [SECTION_TYPES.MARKET]: [
    "Large total addressable market with clear growth potential",
    "Well-defined customer segments with specific needs",
    "Market has strong growth forecasts from trusted sources",
    "Limited regulatory barriers to entry",
    "Clear market trends supporting the business opportunity"
  ],
  [SECTION_TYPES.SOLUTION]: [
    "Innovative approach with clear differentiation",
    "Strong alignment with identified customer needs",
    "Solution solves the core problem effectively",
    "Potential for intellectual property protection",
    "Scalable solution architecture"
  ],
  [SECTION_TYPES.COMPETITIVE_LANDSCAPE]: [
    "Comprehensive competitor analysis with clear positioning",
    "Identified sustainable competitive advantages",
    "Deep understanding of market leaders' strengths and weaknesses",
    "Clear differentiation from existing solutions",
    "Awareness of potential new market entrants"
  ],
  [SECTION_TYPES.TRACTION]: [
    "Strong user growth metrics compared to industry standards",
    "Impressive customer retention and engagement statistics",
    "Promising conversion metrics throughout the funnel",
    "Positive customer testimonials and case studies",
    "Clear evidence of product-market fit"
  ],
  [SECTION_TYPES.BUSINESS_MODEL]: [
    "Clear and sustainable revenue streams",
    "Compelling unit economics with strong margins",
    "Multiple monetization opportunities identified",
    "Competitive and well-researched pricing strategy",
    "Clear path to profitability"
  ],
  [SECTION_TYPES.GTM_STRATEGY]: [
    "Well-defined customer acquisition channels with proof of effectiveness",
    "Reasonable customer acquisition costs relative to LTV",
    "Strategic partnership approach to accelerate growth",
    "Clear go-to-market milestones with measurable KPIs",
    "Appropriate sales approach for target market segments"
  ],
  [SECTION_TYPES.TEAM]: [
    "Strong relevant industry experience among founders",
    "Complementary skill sets within the leadership team",
    "Proven execution capabilities from past ventures",
    "Ability to attract key talent in competitive areas",
    "Strong advisory board with industry connections"
  ],
  [SECTION_TYPES.FINANCIALS]: [
    "Realistic financial projections based on market benchmarks",
    "Clear understanding of unit economics and cost structures",
    "Well-planned cash flow management strategy",
    "Appropriate capital allocation priorities",
    "Reasonable valuation expectations"
  ],
  [SECTION_TYPES.ASK]: [
    "Clear funding requirements aligned with growth milestones",
    "Well-articulated use of funds with specific allocations",
    "Strategic approach to investor relationships",
    "Reasonable valuation expectations with supporting rationale",
    "Clear exit strategy for investors"
  ]
};

const DEFAULT_WEAKNESSES = {
  [SECTION_TYPES.PROBLEM]: [
    "Needs more quantitative evidence of problem impact",
    "Further segmentation of problem by customer type would strengthen the case",
    "Additional validation from potential customers needed",
    "Consider addressing seasonal or cyclical aspects of the problem",
    "Analysis of why existing solutions have failed to address the problem"
  ],
  [SECTION_TYPES.MARKET]: [
    "More detailed analysis of market segmentation needed",
    "Further assessment of market entry barriers",
    "Additional research on customer willingness to pay",
    "More competitive analysis of market saturation",
    "Deeper analysis of market cycles and seasonal variations"
  ],
  [SECTION_TYPES.SOLUTION]: [
    "Technical implementation challenges need more detailed assessment",
    "Additional differentiation from indirect competitors recommended",
    "Further scalability considerations should be addressed",
    "More detailed roadmap for product evolution needed",
    "Deeper analysis of potential regulatory hurdles"
  ],
  [SECTION_TYPES.COMPETITIVE_LANDSCAPE]: [
    "More proactive monitoring of emerging competitors needed",
    "Deeper analysis of potential market entrants from adjacent industries",
    "Strengthened response strategy to competitive threats",
    "More detailed analysis of indirect competitors",
    "Assessment of competitive pricing pressures"
  ],
  [SECTION_TYPES.TRACTION]: [
    "Customer retention metrics need improvement",
    "Expand early customer testimonials for more credibility",
    "More evidence needed for sustainable product-market fit",
    "Cohort analysis would strengthen growth claims",
    "Additional metrics on customer satisfaction and NPS"
  ],
  [SECTION_TYPES.BUSINESS_MODEL]: [
    "Further validation of pricing model with target customers",
    "Strengthened analysis of long-term sustainability",
    "More consideration of additional revenue diversification",
    "Further analysis of pricing sensitivity in target markets",
    "More detailed channel economics and distribution costs"
  ],
  [SECTION_TYPES.GTM_STRATEGY]: [
    "Refine channel economics for primary acquisition methods",
    "Strengthen partnership strategy with clear benefits analysis",
    "Develop more detailed marketing plan with specific KPIs",
    "Address potential scaling challenges in GTM approach",
    "Consider regional expansion strategy and localization needs"
  ],
  [SECTION_TYPES.TEAM]: [
    "Consider strengthening advisory board with specific expertise",
    "Address key skill gaps in technical or domain leadership",
    "Develop clearer organizational scaling plan",
    "More details needed on talent acquisition strategy",
    "Consider succession planning for key leadership roles"
  ],
  [SECTION_TYPES.FINANCIALS]: [
    "Refine cash flow projections with more conservative scenarios",
    "Strengthen unit economics analysis with market benchmarks",
    "Develop more detailed milestone-based budgeting",
    "More detailed breakdown of operating expenses needed",
    "Consider sensitivity analysis for key financial assumptions"
  ],
  [SECTION_TYPES.ASK]: [
    "Provide more detailed breakdown of capital allocation",
    "Strengthen alignment between funding and key milestones",
    "Refine valuation justification with comparable analysis",
    "More detailed timeline for achieving key metrics post-funding",
    "Clearer articulation of investor role beyond capital"
  ]
};

export function SectionDetail() {
  const { companyId, sectionId } = useParams<{ companyId: string, sectionId: string }>();
  const { company } = useCompanyDetails(companyId);
  const { section, isLoading } = useSectionDetails(companyId, sectionId);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)]">
        <div className="w-64 border-r bg-background/95 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
          <div className="p-4 border-b">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="px-4 py-3 border-b">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 p-6">
          <Card className="shadow-sm animate-pulse">
            <CardHeader className="pb-4 border-b">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!company || !section) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Section details not found</p>
      </div>
    );
  }

  // Function to highlight numbers in text
  const highlightNumbers = (text: string) => {
    // This regex matches:
    // - Numbers with optional decimal points (e.g., 12, 12.34)
    // - Numbers with % sign (e.g., 12%, 12.34%)
    // - Dollar amounts (e.g., $12, $12.34)
    // - Numbers with K, M, B, T suffixes (e.g., 12K, $12M)
    return text.replace(/(\d+(?:\.\d+)?%?|\$\d+(?:\.\d+)?[KMBTkmbt]?|\d+(?:\.\d+)?[KMBTkmbt])/g, 
      (match) => `<span class="font-medium ${getScoreColor(section.score)}">${match}</span>`);
  };

  // Get color based on score
  const getScoreColor = (score: number) => {
    if (score >= 4.5) return "text-emerald-600";
    if (score >= 3.5) return "text-blue-600";
    if (score >= 2.5) return "text-amber-600";
    if (score >= 1.5) return "text-orange-600";
    return "text-red-600";
  };

  // Get at least 5 strengths for the section
  const getEnhancedStrengths = (): string[] => {
    let strengths = section.strengths || [];
    const sectionType = section.type as keyof typeof DEFAULT_STRENGTHS;
    
    // If we have less than 4 strengths, add some default ones
    if (strengths.length < 4 && DEFAULT_STRENGTHS[sectionType]) {
      // Filter out any default strengths that are already present
      const existingStrengthsLower = strengths.map(s => s.toLowerCase());
      const additionalStrengths = DEFAULT_STRENGTHS[sectionType].filter(
        s => !existingStrengthsLower.some(existing => existing.includes(s.toLowerCase()))
      );
      
      // Add additional strengths until we reach 5 or run out of defaults
      let i = 0;
      while (strengths.length < 5 && i < additionalStrengths.length) {
        strengths.push(additionalStrengths[i]);
        i++;
      }
    }
    
    return strengths;
  };

  // Get at least 5 weaknesses for the section
  const getEnhancedWeaknesses = (): string[] => {
    let weaknesses = section.weaknesses || [];
    const sectionType = section.type as keyof typeof DEFAULT_WEAKNESSES;
    
    // If we have less than 4 weaknesses, add some default ones
    if (weaknesses.length < 4 && DEFAULT_WEAKNESSES[sectionType]) {
      // Filter out any default weaknesses that are already present
      const existingWeaknessesLower = weaknesses.map(w => w.toLowerCase());
      const additionalWeaknesses = DEFAULT_WEAKNESSES[sectionType].filter(
        w => !existingWeaknessesLower.some(existing => existing.includes(w.toLowerCase()))
      );
      
      // Add additional weaknesses until we reach 5 or run out of defaults
      let i = 0;
      while (weaknesses.length < 5 && i < additionalWeaknesses.length) {
        weaknesses.push(additionalWeaknesses[i]);
        i++;
      }
    }
    
    return weaknesses;
  };

  const enhancedStrengths = getEnhancedStrengths();
  const enhancedWeaknesses = getEnhancedWeaknesses();

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)]">
      <Button 
        variant="outline" 
        size="icon"
        className="fixed bottom-4 right-4 z-50 lg:hidden shadow-md rounded-full h-12 w-12"
        onClick={toggleSidebar}
      >
        {sidebarOpen ? <X /> : <Menu />}
      </Button>

      <div 
        className={`fixed lg:relative lg:flex w-64 border-r bg-background/95 h-[calc(100vh-4rem)] top-16 z-40 transition-all duration-300 ease-in-out transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } overflow-y-auto`}
      >
        <div className="p-4 border-b">
          <h3 className="font-medium">{company.name}</h3>
          <p className="text-sm text-muted-foreground">Sections</p>
        </div>
        <nav className="flex flex-col w-full">
          {company.sections.map((s) => (
            <Link
              key={s.id}
              to={`/company/${companyId}/section/${s.id}`}
              className={`flex items-center px-4 py-3 text-sm hover:bg-muted transition-colors ${
                Number(s.id) === Number(sectionId) ? "bg-muted font-medium" : ""
              }`}
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setSidebarOpen(false);
                }
              }}
            >
              <span className="flex-1">{s.title}</span>
              {Number(s.id) === Number(sectionId) && <ChevronRight className="h-4 w-4" />}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex-1 p-3 sm:p-6 w-full">
        <Card className="shadow-sm">
          <CardHeader className="pb-4 border-b bg-muted/30">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-xl sm:text-2xl">{section.title}</CardTitle>
              <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                <span className="font-medium text-sm sm:text-base">Score: {section.score}/5</span>
                <div className="w-24 sm:w-32">
                  <Progress 
                    value={section.score * 20} 
                    className={`h-2.5 ${section.score >= 4 ? 'bg-green-100' : section.score >= 2.5 ? 'bg-amber-100' : 'bg-red-100'}`}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 sm:pt-8">
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-muted/30 border">
                <h3 className="text-lg font-medium mb-3">Summary</h3>
                <p 
                  className="text-sm sm:text-base leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: highlightNumbers(section.description) }}
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-4 rounded-lg border border-green-200 bg-green-50">
                  <h4 className="flex items-center gap-2 font-medium text-green-700 mb-3">
                    <CheckCircle className="h-5 w-5" />
                    <span>Key Strengths</span>
                  </h4>
                  <ul className="space-y-3 text-sm sm:text-base">
                    {enhancedStrengths.length > 0 ? (
                      enhancedStrengths.map((strength, idx) => (
                        <li 
                          key={idx} 
                          className="pl-4 border-l-2 border-green-300"
                          dangerouslySetInnerHTML={{ __html: highlightNumbers(strength) }}
                        />
                      ))
                    ) : (
                      <li className="pl-4 border-l-2 border-green-300 text-muted-foreground">No strengths data available</li>
                    )}
                  </ul>
                </div>
                
                <div className="p-4 rounded-lg border border-amber-200 bg-amber-50">
                  <h4 className="flex items-center gap-2 font-medium text-amber-700 mb-3">
                    <XCircle className="h-5 w-5" />
                    <span>Areas for Improvement</span>
                  </h4>
                  <ul className="space-y-3 text-sm sm:text-base">
                    {enhancedWeaknesses.length > 0 ? (
                      enhancedWeaknesses.map((weakness, idx) => (
                        <li 
                          key={idx} 
                          className="pl-4 border-l-2 border-amber-300"
                          dangerouslySetInnerHTML={{ __html: highlightNumbers(weakness) }}
                        />
                      ))
                    ) : (
                      <li className="pl-4 border-l-2 border-amber-300 text-muted-foreground">No weaknesses data available</li>
                    )}
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
