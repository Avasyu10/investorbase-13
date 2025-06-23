
// Section ordering for consistent display
export const ORDERED_SECTIONS = [
  "COMPANY_OVERVIEW",
  "SECTION_METRICS", 
  "PROBLEM",
  "MARKET",
  "SOLUTION",
  "COMPETITIVE_LANDSCAPE",
  "TRACTION",
  "BUSINESS_MODEL",
  "GTM_STRATEGY",
  "TEAM",
  "FINANCIALS",
  "ASK",
  "SLIDE_NOTES",
  "GENERAL"
];

// Section type mappings for display
export const SECTION_TYPE_MAPPINGS = {
  "COMPANY_OVERVIEW": "Company Overview",
  "SECTION_METRICS": "Section Metrics",
  "PROBLEM": "Problem Statement",
  "MARKET": "Market Opportunity",
  "SOLUTION": "Solution (Product)",
  "COMPETITIVE_LANDSCAPE": "Competitive Landscape",
  "TRACTION": "Traction & Milestones",
  "BUSINESS_MODEL": "Business Model",
  "GTM_STRATEGY": "Go-to-Market Strategy",
  "TEAM": "Founder & Team Background",
  "FINANCIALS": "Financial Overview & Projections",
  "ASK": "The Ask & Next Steps",
  "SLIDE_NOTES": "Slide by Slide Notes",
  "GENERAL": "General Analysis"
};

// Section types enum
export const SECTION_TYPES = {
  COMPANY_OVERVIEW: "COMPANY_OVERVIEW",
  SECTION_METRICS: "SECTION_METRICS",
  PROBLEM: "PROBLEM",
  MARKET: "MARKET",
  SOLUTION: "SOLUTION",
  COMPETITIVE_LANDSCAPE: "COMPETITIVE_LANDSCAPE",
  TRACTION: "TRACTION",
  BUSINESS_MODEL: "BUSINESS_MODEL",
  GTM_STRATEGY: "GTM_STRATEGY",
  TEAM: "TEAM",
  FINANCIALS: "FINANCIALS",
  ASK: "ASK",
  SLIDE_NOTES: "SLIDE_NOTES",
  GENERAL: "GENERAL"
} as const;

// Section titles mapping
export const SECTION_TITLES = {
  [SECTION_TYPES.COMPANY_OVERVIEW]: "Company Overview",
  [SECTION_TYPES.SECTION_METRICS]: "Section Metrics",
  [SECTION_TYPES.PROBLEM]: "Problem Statement",
  [SECTION_TYPES.MARKET]: "Market Opportunity",
  [SECTION_TYPES.SOLUTION]: "Solution (Product)",
  [SECTION_TYPES.COMPETITIVE_LANDSCAPE]: "Competitive Landscape",
  [SECTION_TYPES.TRACTION]: "Traction & Milestones",
  [SECTION_TYPES.BUSINESS_MODEL]: "Business Model",
  [SECTION_TYPES.GTM_STRATEGY]: "Go-to-Market Strategy",
  [SECTION_TYPES.TEAM]: "Founder & Team Background",
  [SECTION_TYPES.FINANCIALS]: "Financial Overview & Projections",
  [SECTION_TYPES.ASK]: "The Ask & Next Steps",
  [SECTION_TYPES.SLIDE_NOTES]: "Slide by Slide Notes",
  [SECTION_TYPES.GENERAL]: "General Analysis"
};

// Area of interest options for profiles
export const AreaOfInterestOptions = [
  "FinTech",
  "HealthTech",
  "EdTech",
  "AgriTech",
  "E-commerce",
  "SaaS",
  "DeepTech",
  "CleanTech",
  "Consumer Tech",
  "Enterprise Software",
  "AI/ML",
  "Blockchain",
  "IoT",
  "Cybersecurity",
  "Gaming",
  "Media & Entertainment",
  "Real Estate Tech",
  "Transportation",
  "Food & Beverage",
  "Fashion & Lifestyle"
];
