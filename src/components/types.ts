
export interface MarketResearchData {
  id: string;
  company_id: string;
  companyName?: string;
  market_insights?: MarketInsight[] | null;
  news_highlights?: NewsItem[] | null;
  created_at: string;
}

export interface MarketInsight {
  headline: string;
  content: string;
  source?: string;
  url?: string;
}

export interface NewsItem {
  headline: string;
  content: string;
  source?: string;
  url?: string;
}
