
import { SectionType, SectionData, CompanyData, COMPANIES_DETAILED_DATA } from "@/lib/dummyData";

// Add the assessment points to the company data
export interface CompanyDetailedData extends CompanyData {
  assessmentPoints: string[];
}

// Extend the existing data with assessment points
export const COMPANIES_DETAILED_DATA_WITH_ASSESSMENT: Record<number, CompanyDetailedData> = {
  1: {
    ...COMPANIES_DETAILED_DATA[1],
    assessmentPoints: [
      "Strong product-market fit with innovative solution",
      "Experienced team with proven track record",
      "Clear path to profitability with sustainable business model",
      "Well-defined market strategy and competitive positioning"
    ]
  },
  2: {
    ...COMPANIES_DETAILED_DATA[2],
    assessmentPoints: [
      "Promising technology with growing market potential",
      "Skilled technical team requiring business experience",
      "Early market validation with pilot projects"
    ]
  },
  3: {
    ...COMPANIES_DETAILED_DATA[3],
    assessmentPoints: [
      "Innovative medical solution with strong clinical validation",
      "Exceptional team with domain expertise",
      "Well-structured business model with clear regulatory path",
      "Significant market opportunity with few direct competitors"
    ]
  },
  4: {
    ...COMPANIES_DETAILED_DATA[4],
    assessmentPoints: [
      "Digital banking solution addressing financial inclusion",
      "Moderate traction in a competitive market",
      "Experienced fintech team with relevant background"
    ]
  }
};

export type { SectionType, SectionData, CompanyData };
export { COMPANIES_DETAILED_DATA };
