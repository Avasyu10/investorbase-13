
export interface NewsItem {
  headline: string;
  content: string;
  source?: string;
  url?: string;
}

export interface MarketInsight {
  headline: string;  // Updated from title to headline for consistency
  content: string;
  source?: string;
  url?: string;
}

export interface Source {
  name: string;
  url: string;
}

export interface MarketResearchData {
  id: string;
  company_id: string;
  companyName?: string;
  market_insights?: MarketInsight[] | null;
  news_highlights?: NewsItem[] | null;
  created_at: string;
}
