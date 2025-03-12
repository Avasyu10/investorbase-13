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
      "Strong product-market fit with proven enterprise adoption",
      "World-class technical team with successful track record",
      "Robust IP portfolio with patent-pending technology",
      "Clear path to $100M ARR within 24 months",
      "Strategic partnerships with major cloud providers"
    ]
  },
  2: {
    ...COMPANIES_DETAILED_DATA[2],
    assessmentPoints: [
      "Innovative solution addressing critical environmental challenges",
      "Strong regulatory tailwinds supporting adoption",
      "Proven pilot results with 40% conversion rate",
      "Clear product roadmap with recurring revenue model",
      "Experienced team with deep industry expertise"
    ]
  },
  3: {
    ...COMPANIES_DETAILED_DATA[3],
    assessmentPoints: [
      "Revolutionary medical diagnostic technology with FDA approval",
      "Strong IP protection and regulatory compliance",
      "Exceptional team with domain expertise",
      "Significant market opportunity with limited competition",
      "Strong partnerships with leading healthcare institutions"
    ]
  },
  4: {
    ...COMPANIES_DETAILED_DATA[4],
    assessmentPoints: [
      "Addressing critical SME financing gap in emerging markets",
      "Scalable technology platform with proven unit economics",
      "Strong partnerships with local financial institutions",
      "Experienced fintech team with regional expertise",
      "Clear regulatory compliance and risk management framework"
    ]
  }
};

export type { SectionType, SectionData, CompanyData };
export { COMPANIES_DETAILED_DATA };
