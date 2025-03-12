
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
export interface SectionData {
  id: string;
  type: SectionType;
  title: string;
  score: number;
  description: string;
}

// Company data interface
export interface CompanyData {
  id: number;
  name: string;
  overallScore: number;
  sections: SectionData[];
}

// Dummy company data with sections
export const COMPANIES_DETAILED_DATA: Record<number, CompanyData> = {
  1: {
    id: 1,
    name: "TechFusion",
    overallScore: 4.2,
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
  3: {
    id: 3,
    name: "MedTech Innovations",
    overallScore: 4.5,
    sections: [
      { id: "sec1", type: "PROBLEM", title: "Problem", score: 4.8, description: "Critical healthcare challenge with substantial evidence" },
      { id: "sec2", type: "MARKET", title: "Market", score: 4.6, description: "Large healthcare market with strong growth trends" },
      { id: "sec3", type: "SOLUTION", title: "Solution", score: 4.7, description: "Innovative medical solution with patented technology" },
      { id: "sec4", type: "PRODUCT", title: "Product", score: 4.4, description: "Advanced medical device with clinical validation" },
      { id: "sec5", type: "COMPETITIVE_LANDSCAPE", title: "Competitive Landscape", score: 4.2, description: "Few direct competitors with high barriers to entry" },
      { id: "sec6", type: "TRACTION", title: "Traction", score: 4.1, description: "Strong traction with healthcare providers and initial sales" },
      { id: "sec7", type: "BUSINESS_MODEL", title: "Business Model", score: 4.5, description: "High-margin recurring revenue model" },
      { id: "sec8", type: "GTM_STRATEGY", title: "GTM Strategy", score: 4.3, description: "Strong healthcare channel partnerships" },
      { id: "sec9", type: "TEAM", title: "Team", score: 4.8, description: "Seasoned healthcare executives with strong domain expertise" },
      { id: "sec10", type: "FINANCIALS", title: "Financials", score: 4.4, description: "Detailed financial model with conservative growth assumptions" },
      { id: "sec11", type: "ASK", title: "Ask", score: 4.6, description: "Strategic funding request aligned with regulatory milestones" }
    ]
  },
  // Add more companies with similar structure...
  4: {
    id: 4,
    name: "FinanceFlow",
    overallScore: 3.6,
    sections: [
      { id: "sec1", type: "PROBLEM", title: "Problem", score: 3.8, description: "Financial inclusion challenges identified" },
      { id: "sec2", type: "MARKET", title: "Market", score: 4.0, description: "Growing fintech market with regulatory complexities" },
      { id: "sec3", type: "SOLUTION", title: "Solution", score: 3.7, description: "Digital banking solution for underserved markets" },
      { id: "sec4", type: "PRODUCT", title: "Product", score: 3.5, description: "Mobile banking platform with core functionality" },
      { id: "sec5", type: "COMPETITIVE_LANDSCAPE", title: "Competitive Landscape", score: 3.2, description: "Highly competitive market with large incumbents" },
      { id: "sec6", type: "TRACTION", title: "Traction", score: 3.4, description: "Growing user base with moderate engagement" },
      { id: "sec7", type: "BUSINESS_MODEL", title: "Business Model", score: 3.8, description: "Transaction-based revenue model" },
      { id: "sec8", type: "GTM_STRATEGY", title: "GTM Strategy", score: 3.5, description: "Direct-to-consumer strategy with digital marketing" },
      { id: "sec9", type: "TEAM", title: "Team", score: 3.9, description: "Mixed team of finance and technology professionals" },
      { id: "sec10", type: "FINANCIALS", title: "Financials", score: 3.6, description: "Path to profitability with reasonable assumptions" },
      { id: "sec11", type: "ASK", title: "Ask", score: 3.7, description: "Growth capital request for marketing and expansion" }
    ]
  }
};
