
export const AreaOfInterestOptions = [
  { label: "AI/Machine Learning", value: "ai-ml" },
  { label: "SaaS", value: "saas" },
  { label: "Fintech", value: "fintech" },
  { label: "Health Tech", value: "health-tech" },
  { label: "Biotech", value: "biotech" },
  { label: "EdTech", value: "edtech" },
  { label: "Clean Tech", value: "clean-tech" },
  { label: "Consumer", value: "consumer" },
  { label: "Marketplace", value: "marketplace" },
  { label: "Enterprise Software", value: "enterprise-software" },
  { label: "Cybersecurity", value: "cybersecurity" },
  { label: "Gaming", value: "gaming" },
  { label: "AR/VR", value: "ar-vr" },
  { label: "E-commerce", value: "e-commerce" },
  { label: "Blockchain/Crypto", value: "blockchain-crypto" },
  { label: "AgTech", value: "agtech" },
  { label: "Real Estate", value: "real-estate" },
  { label: "Robotics", value: "robotics" },
  { label: "Hardware", value: "hardware" },
  { label: "Social Media", value: "social-media" },
  { label: "Media & Entertainment", value: "media-entertainment" },
  { label: "Travel & Hospitality", value: "travel-hospitality" },
  { label: "Space Tech", value: "space-tech" },
  { label: "IoT", value: "iot" },
  { label: "B2B", value: "b2b" },
  { label: "B2C", value: "b2c" }
];

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

// Ensure these match exactly with what we expect in the Gemini response
export const SECTION_TITLES = {
  [SECTION_TYPES.PROBLEM]: "Problem Statement",
  [SECTION_TYPES.MARKET]: "Market Opportunity",
  [SECTION_TYPES.SOLUTION]: "Solution",
  [SECTION_TYPES.COMPETITIVE_LANDSCAPE]: "Competitive Landscape",
  [SECTION_TYPES.TRACTION]: "Traction",
  [SECTION_TYPES.BUSINESS_MODEL]: "Business Model",
  [SECTION_TYPES.GTM_STRATEGY]: "Go-to-Market Strategy",
  [SECTION_TYPES.TEAM]: "Team",
  [SECTION_TYPES.FINANCIALS]: "Financial",
  [SECTION_TYPES.ASK]: "Ask"
};

// Define the ordered array for section display
export const ORDERED_SECTIONS = [
  'business_model',
  'market_opportunity',
  'competitive_advantage',
  'financial_projections',
  'team_experience',
  'technology_innovation',
  'scalability_potential',
  'risk_assessment',
  // New Eureka form sections
  'problem_solution_fit',
  'target_customers',
  'competitors',
  'revenue_model',
  'usp', // Changed from 'differentiation' to 'usp'
  'prototype' // Added new prototype section
];

// Array of all expected section types for validation
export const EXPECTED_SECTION_TYPES = Object.values(SECTION_TYPES);
