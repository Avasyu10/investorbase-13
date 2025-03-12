
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
    name: "TechFusion AI",
    overallScore: 4.7,
    sections: [
      { id: "sec1", type: "PROBLEM", title: "Problem", score: 4.8, description: "Addressing inefficiencies in enterprise AI deployment with clear market validation and documented pain points" },
      { id: "sec2", type: "MARKET", title: "Market", score: 4.6, description: "Large addressable market ($50B+) in enterprise AI with 25% YoY growth" },
      { id: "sec3", type: "SOLUTION", title: "Solution", score: 4.9, description: "Proprietary AI orchestration platform with patent-pending technology" },
      { id: "sec4", type: "PRODUCT", title: "Product", score: 4.7, description: "Enterprise-ready platform with robust features and security compliance" },
      { id: "sec5", type: "COMPETITIVE_LANDSCAPE", title: "Competitive Landscape", score: 4.5, description: "Limited direct competition with significant barriers to entry" },
      { id: "sec6", type: "TRACTION", title: "Traction", score: 4.6, description: "20+ enterprise clients including Fortune 500 companies" },
      { id: "sec7", type: "BUSINESS_MODEL", title: "Business Model", score: 4.8, description: "High-margin SaaS model with 85% gross margins" },
      { id: "sec8", type: "GTM_STRATEGY", title: "GTM Strategy", score: 4.5, description: "Enterprise sales strategy with strong partnership channels" },
      { id: "sec9", type: "TEAM", title: "Team", score: 4.9, description: "Ex-Google AI leads with multiple successful exits" },
      { id: "sec10", type: "FINANCIALS", title: "Financials", score: 4.7, description: "$5M ARR with 200% YoY growth" },
      { id: "sec11", type: "ASK", title: "Ask", score: 4.6, description: "$20M Series A for market expansion and R&D" }
    ]
  },
  2: {
    id: 2,
    name: "GreenEnergy Solutions",
    overallScore: 4.2,
    sections: [
      { id: "sec1", type: "PROBLEM", title: "Problem", score: 4.5, description: "Industrial energy waste causing significant environmental impact and costs" },
      { id: "sec2", type: "MARKET", title: "Market", score: 4.3, description: "Growing renewable energy market with strong regulatory tailwinds" },
      { id: "sec3", type: "SOLUTION", title: "Solution", score: 4.4, description: "AI-powered energy optimization system for industrial facilities" },
      { id: "sec4", type: "PRODUCT", title: "Product", score: 4.1, description: "IoT-based monitoring system with predictive maintenance" },
      { id: "sec5", type: "COMPETITIVE_LANDSCAPE", title: "Competitive Landscape", score: 3.9, description: "Competitive market with clear technological differentiation" },
      { id: "sec6", type: "TRACTION", title: "Traction", score: 4.0, description: "10 pilot projects with 40% conversion rate" },
      { id: "sec7", type: "BUSINESS_MODEL", title: "Business Model", score: 4.2, description: "Hardware + SaaS model with recurring revenue" },
      { id: "sec8", type: "GTM_STRATEGY", title: "GTM Strategy", score: 4.1, description: "Direct sales to enterprises with channel partnerships" },
      { id: "sec9", type: "TEAM", title: "Team", score: 4.3, description: "Strong technical team with industry experience" },
      { id: "sec10", type: "FINANCIALS", title: "Financials", score: 4.0, description: "$2M ARR with clear path to profitability" },
      { id: "sec11", type: "ASK", title: "Ask", score: 4.2, description: "$15M Series A for scaling operations" }
    ]
  },
  3: {
    id: 3,
    name: "MedTech Innovations",
    overallScore: 4.8,
    sections: [
      { id: "sec1", type: "PROBLEM", title: "Problem", score: 4.9, description: "Critical diagnostic delays in rare disease identification" },
      { id: "sec2", type: "MARKET", title: "Market", score: 4.8, description: "$20B+ addressable market in medical diagnostics" },
      { id: "sec3", type: "SOLUTION", title: "Solution", score: 4.9, description: "AI-powered diagnostic platform with FDA approval" },
      { id: "sec4", type: "PRODUCT", title: "Product", score: 4.7, description: "HIPAA-compliant platform with clinical validation" },
      { id: "sec5", type: "COMPETITIVE_LANDSCAPE", title: "Competitive Landscape", score: 4.6, description: "First-mover advantage in specialized diagnostics" },
      { id: "sec6", type: "TRACTION", title: "Traction", score: 4.8, description: "Partnerships with 15 major hospitals" },
      { id: "sec7", type: "BUSINESS_MODEL", title: "Business Model", score: 4.7, description: "Per-diagnosis pricing with institutional subscriptions" },
      { id: "sec8", type: "GTM_STRATEGY", title: "GTM Strategy", score: 4.8, description: "B2B2C model through healthcare providers" },
      { id: "sec9", type: "TEAM", title: "Team", score: 4.9, description: "World-class medical and AI researchers" },
      { id: "sec10", type: "FINANCIALS", title: "Financials", score: 4.8, description: "$8M ARR with 150% YoY growth" },
      { id: "sec11", type: "ASK", title: "Ask", score: 4.7, description: "$30M Series B for global expansion" }
    ]
  },
  4: {
    id: 4,
    name: "FinanceFlow",
    overallScore: 3.9,
    sections: [
      { id: "sec1", type: "PROBLEM", title: "Problem", score: 4.1, description: "SME lending inefficiencies in emerging markets" },
      { id: "sec2", type: "MARKET", title: "Market", score: 4.0, description: "$100B+ opportunity in SME financing" },
      { id: "sec3", type: "SOLUTION", title: "Solution", score: 3.9, description: "AI-driven credit scoring and lending platform" },
      { id: "sec4", type: "PRODUCT", title: "Product", score: 3.8, description: "Digital lending platform with automated underwriting" },
      { id: "sec5", type: "COMPETITIVE_LANDSCAPE", title: "Competitive Landscape", score: 3.7, description: "Competitive market with regional focus" },
      { id: "sec6", type: "TRACTION", title: "Traction", score: 3.8, description: "$10M in loans processed" },
      { id: "sec7", type: "BUSINESS_MODEL", title: "Business Model", score: 4.0, description: "Fee-based model with interest revenue share" },
      { id: "sec8", type: "GTM_STRATEGY", title: "GTM Strategy", score: 3.9, description: "Partnership with local banks and NBFCs" },
      { id: "sec9", type: "TEAM", title: "Team", score: 4.1, description: "Experienced fintech entrepreneurs" },
      { id: "sec10", type: "FINANCIALS", title: "Financials", score: 3.8, description: "$1.5M ARR with positive unit economics" },
      { id: "sec11", type: "ASK", title: "Ask", score: 3.9, description: "$12M Series A for market expansion" }
    ]
  }
};

