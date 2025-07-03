
// Section type constants for consistent referencing
export const SECTION_TYPES = {
  PROBLEM: 'PROBLEM',
  SOLUTION: 'SOLUTION', 
  MARKET: 'MARKET',
  TRACTION: 'TRACTION',
  COMPETITIVE_LANDSCAPE: 'COMPETITIVE_LANDSCAPE',
  BUSINESS_MODEL: 'BUSINESS_MODEL',
  TEAM: 'TEAM',
  FINANCIALS: 'FINANCIALS',
  ASK: 'ASK',
  GTM_STRATEGY: 'GTM_STRATEGY',
  SLIDE_NOTES: 'SLIDE_NOTES',
  USP: 'USP', // Changed from DIFFERENTIATION
  PROTOTYPE: 'PROTOTYPE' // New section
} as const;

// Human-readable titles for each section type
export const SECTION_TITLES = {
  [SECTION_TYPES.PROBLEM]: 'Problem & Solution',
  [SECTION_TYPES.SOLUTION]: 'Solution & Product',
  [SECTION_TYPES.MARKET]: 'Market Opportunity',
  [SECTION_TYPES.TRACTION]: 'Traction & Milestones',
  [SECTION_TYPES.COMPETITIVE_LANDSCAPE]: 'Competitive Landscape',
  [SECTION_TYPES.BUSINESS_MODEL]: 'Business Model',
  [SECTION_TYPES.TEAM]: 'Team & Execution',
  [SECTION_TYPES.FINANCIALS]: 'Financial Projections',
  [SECTION_TYPES.ASK]: 'Ask & Next Steps',
  [SECTION_TYPES.GTM_STRATEGY]: 'Go-to-Market Strategy',
  [SECTION_TYPES.SLIDE_NOTES]: 'Slide Notes',
  [SECTION_TYPES.USP]: 'USP', // Changed from 'Differentiation'
  [SECTION_TYPES.PROTOTYPE]: 'Prototype' // New section
} as const;

// Ordered list for consistent section display
export const ORDERED_SECTIONS = [
  SECTION_TYPES.PROBLEM,
  SECTION_TYPES.MARKET,
  SECTION_TYPES.SOLUTION,
  SECTION_TYPES.TRACTION,
  SECTION_TYPES.COMPETITIVE_LANDSCAPE,
  SECTION_TYPES.BUSINESS_MODEL,
  SECTION_TYPES.TEAM,
  SECTION_TYPES.FINANCIALS,
  SECTION_TYPES.ASK,
  SECTION_TYPES.GTM_STRATEGY,
  SECTION_TYPES.USP, // Changed from DIFFERENTIATION
  SECTION_TYPES.PROTOTYPE // New section added
];

// Score color classes for consistent styling
export const SCORE_COLORS = {
  EXCELLENT: 'bg-emerald-500',
  GOOD: 'bg-blue-500', 
  AVERAGE: 'bg-amber-500',
  POOR: 'bg-orange-500',
  CRITICAL: 'bg-red-500'
} as const;
