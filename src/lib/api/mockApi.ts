
import { CompanyListItem, CompanyDetailed, SectionDetailed, SectionType } from './apiContract';
import { COMPANIES_DETAILED_DATA_WITH_ASSESSMENT } from '@/lib/companyData';

/**
 * Mock API data for development
 * This simulates a backend API response
 */

// Convert the existing dummy data to match the API contract
export const mockCompanies: CompanyListItem[] = Object.values(COMPANIES_DETAILED_DATA_WITH_ASSESSMENT).map(company => ({
  id: company.id,
  name: company.name,
  overallScore: company.overallScore,
  score: company.overallScore, // For UI compatibility
}));

// Mock detailed company data
export const mockCompanyDetails: Record<number, CompanyDetailed> = COMPANIES_DETAILED_DATA_WITH_ASSESSMENT;

// Mock section detailed data generator
export function getMockSectionDetails(companyId: number, sectionId: string): SectionDetailed | null {
  const company = mockCompanyDetails[companyId];
  if (!company) return null;

  const section = company.sections.find(s => s.id === sectionId);
  if (!section) return null;

  return {
    ...section,
    detailedContent: getSectionDetailedContent(section.type),
    strengths: getStrengths(section.type),
    weaknesses: getWeaknesses(section.type),
  };
}

// Helper functions to generate detailed content based on section type
function getSectionDetailedContent(sectionType: SectionType): string {
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

function getStrengths(sectionType: SectionType): string[] {
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

function getWeaknesses(sectionType: SectionType): string[] {
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
