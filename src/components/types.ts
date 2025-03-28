
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

// Add a JSON type helper for properly casting Supabase JSON data
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];
