
// Define the expected section types for analysis
export const SECTION_TYPES = {
  PROBLEM: "PROBLEM",
  MARKET: "MARKET",
  SOLUTION: "SOLUTION",
  COMPETITIVE_LANDSCAPE: "COMPETITIVE_LANDSCAPE",
  TRACTION: "TRACTION",
  BUSINESS_MODEL: "BUSINESS_MODEL",
  GTM_STRATEGY: "GTM_STRATEGY",
  TEAM: "TEAM",
  FINANCIALS: "FINANCIALS",
  ASK: "ASK"
};

// Ensure these match exactly with what we expect in the API response
export const SECTION_TITLES = {
  [SECTION_TYPES.PROBLEM]: "Problem Statement",
  [SECTION_TYPES.MARKET]: "Market Opportunity",
  [SECTION_TYPES.SOLUTION]: "Solution (Product)",
  [SECTION_TYPES.COMPETITIVE_LANDSCAPE]: "Competitive Landscape",
  [SECTION_TYPES.TRACTION]: "Traction & Milestones",
  [SECTION_TYPES.BUSINESS_MODEL]: "Business Model",
  [SECTION_TYPES.GTM_STRATEGY]: "Go-to-Market Strategy",
  [SECTION_TYPES.TEAM]: "Founder & Team Background",
  [SECTION_TYPES.FINANCIALS]: "Financial Overview & Projections",
  [SECTION_TYPES.ASK]: "The Ask & Next Steps"
};

// Array of all expected section types for validation
export const EXPECTED_SECTION_TYPES = Object.values(SECTION_TYPES);
