import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface MarketInsight {
  title: string;
  source: string;
  year?: string;
  content: string;
}

interface MarketResearchDisplayProps {
  companyId: string;
}

export const MarketResearchDisplay = ({ companyId }: MarketResearchDisplayProps) => {
  const [insights, setInsights] = useState<MarketInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMarketResearch = async () => {
      if (!companyId) return;

      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('market_research')
          .select('*')
          .eq('company_id', companyId)
          .order('requested_at', { ascending: false })
          .limit(1)
          .single();

        if (error) throw error;

        if (data) {
          // Parse market insights from the research data
          const parsedInsights: MarketInsight[] = [];

          // Try to parse market_insights if it exists
          if (data.market_insights) {
            try {
              const marketInsightsData = typeof data.market_insights === 'string' 
                ? JSON.parse(data.market_insights) 
                : data.market_insights;
              
              if (Array.isArray(marketInsightsData)) {
                parsedInsights.push(...marketInsightsData.map((insight: any) => ({
                  title: insight.title || insight.headline || 'Market Insight',
                  source: insight.source || 'Market Research',
                  year: insight.year,
                  content: insight.content || insight.description || insight.text || ''
                })));
              }
            } catch (e) {
              console.error('Error parsing market_insights:', e);
            }
          }

          // Parse news highlights if they exist
          if (data.news_highlights) {
            try {
              const newsData = typeof data.news_highlights === 'string'
                ? JSON.parse(data.news_highlights)
                : data.news_highlights;
              
              if (Array.isArray(newsData)) {
                parsedInsights.push(...newsData.map((news: any) => ({
                  title: news.title || news.headline || 'News Highlight',
                  source: news.source || 'News',
                  content: news.content || news.summary || news.description || ''
                })));
              }
            } catch (e) {
              console.error('Error parsing news_highlights:', e);
            }
          }

          // If no structured data, use research_summary or research_text
          if (parsedInsights.length === 0) {
            const summary = data.research_summary || data.research_text;
            if (summary) {
              parsedInsights.push({
                title: 'Market Research Summary',
                source: 'Research Report',
                content: summary
              });
            }
          }

          setInsights(parsedInsights);
        }
      } catch (error) {
        console.error('Error fetching market research:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarketResearch();
  }, [companyId]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <Card className="border-0 shadow-subtle bg-[#1a1d2e]">
        <CardContent className="p-6 text-center">
          <p className="text-gray-400">
            No market research available yet. Click "Update Research" to fetch the latest insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {insights.map((insight, index) => (
        <Card key={index} className="border-0 shadow-subtle bg-[#1a1d2e]">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white">
              {insight.title}
            </CardTitle>
            <p className="text-sm text-[#f59e0b]">
              {insight.source}
              {insight.year && `, ${insight.year}`}
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 leading-relaxed">
              {insight.content}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};