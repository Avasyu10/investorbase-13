
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2, Newspaper } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketInsight, NewsItem } from "@/components/types";
import { useNavigate } from "react-router-dom";

interface MarketResearchData {
  id: string;
  company_id: string;
  companyName?: string;
  market_insights?: MarketInsight[] | null;
  news_highlights?: NewsItem[] | null;
  created_at: string;
}

const NewsFeed = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [researches, setResearches] = useState<MarketResearchData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("news");

  useEffect(() => {
    fetchMarketResearch();
  }, []);

  const fetchMarketResearch = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('market_research')
        .select(`
          id, 
          company_id, 
          market_insights, 
          news_highlights,
          requested_at,
          companies!market_research_company_id_fkey(name)
        `)
        .order('requested_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      const formattedData = data?.map(item => {
        const companyName = item.companies ? item.companies.name : 'Unknown Company';
        
        let marketInsights: MarketInsight[] = [];
        let newsHighlights: NewsItem[] = [];
        
        if (item.market_insights) {
          marketInsights = item.market_insights as unknown as MarketInsight[];
        }
        
        if (item.news_highlights) {
          newsHighlights = item.news_highlights as unknown as NewsItem[];
        }
        
        return {
          id: item.id,
          company_id: item.company_id,
          companyName: companyName,
          market_insights: marketInsights,
          news_highlights: newsHighlights,
          created_at: item.requested_at
        };
      }) || [];
      
      setResearches(formattedData);
    } catch (error) {
      console.error('Error fetching market research:', error);
      toast.error("Failed to load news feed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Helper function to remove double stars from text
  const removeDoubleStars = (text: string): string => {
    if (!text) return '';
    return text.replace(/\*\*/g, '');
  };

  // Sort news by date (newest first)
  const sortByDate = (items: any[]): any[] => {
    return [...items].sort((a, b) => {
      // Extract dates from content or publication info
      const aDate = extractDateFromItem(a);
      const bDate = extractDateFromItem(b);
      
      // If both dates are valid, compare them
      if (aDate && bDate) {
        return bDate.getTime() - aDate.getTime();
      }
      
      // If only one date is valid or no dates, maintain original order
      return 0;
    });
  };

  // Helper function to extract date from news or insight item
  const extractDateFromItem = (item: any): Date | null => {
    if (!item) return null;
    
    // Check for date in content or source
    const dateRegex = /(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:\s+\d{4})?)|(\d{4}-\d{2}-\d{2})|([A-Z][a-z]{2,8}\s+\d{4})|(\d{1,2}\/\d{1,2}\/\d{4})/i;
    
    let dateStr = '';
    
    // Look for date in content
    if (item.content) {
      const contentMatch = item.content.match(dateRegex);
      if (contentMatch) dateStr = contentMatch[0];
    }
    
    // If no date in content, check source or other fields
    if (!dateStr && item.source) {
      const match = item.source.match(/\(([^,]+),\s*([^)]+)\)/);
      if (match) dateStr = match[2]; // Date is typically the second part in parentheses
    }
    
    // Try to parse the date
    if (dateStr) {
      try {
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
        }
      } catch (e) {
        console.log("Error parsing date:", e);
      }
    }
    
    return null;
  };

  return (
    <div className="animate-fade-in">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackClick}
            className="mr-auto mb-4 flex items-center"
          >
            <ChevronLeft className="mr-1" /> Back
          </Button>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <Newspaper className="mr-2 h-7 w-7" />
            News Feed
          </h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="news">News Highlights</TabsTrigger>
            <TabsTrigger value="insights">Market Insights</TabsTrigger>
          </TabsList>
          
          <TabsContent value="news">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {researches.flatMap(research => 
                (research.news_highlights && research.news_highlights.length > 0) ? 
                  sortByDate(research.news_highlights).map((news, index) => (
                    <Card key={`${research.id}-news-${index}`} className="h-full">
                      <CardHeader>
                        <CardTitle className="line-clamp-2">{removeDoubleStars(news.headline)}</CardTitle>
                        <CardDescription className="flex justify-between items-center">
                          <span>{research.companyName}</span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="line-clamp-4 text-sm">{news.content ? removeDoubleStars(news.content).replace(/\*\*Analysis:\*\*/gi, '').replace(/Analysis:/g, '').replace(/\*\*Analysis\*\*/gi, '') : ''}</p>
                        {news.url && (
                          <a 
                            href={news.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline mt-2 inline-block text-sm"
                          >
                            Read more
                          </a>
                        )}
                        {news.source && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Source: {news.source}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )) : []
              )}
              
              {researches.length === 0 || 
               researches.every(r => !r.news_highlights || r.news_highlights.length === 0) ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground">No news articles found.</p>
                </div>
              ) : null}
            </div>
          </TabsContent>
          
          <TabsContent value="insights">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {researches.flatMap(research => 
                (research.market_insights && research.market_insights.length > 0) ?
                  sortByDate(research.market_insights).map((insight, index) => (
                    <Card key={`${research.id}-insight-${index}`} className="h-full">
                      <CardHeader>
                        <CardTitle className="line-clamp-2">{removeDoubleStars(insight.headline)}</CardTitle>
                        <CardDescription>{research.companyName}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{insight.content ? removeDoubleStars(insight.content).replace(/\*\*Analysis:\*\*/gi, '').replace(/Analysis:/g, '').replace(/\*\*Analysis\*\*/gi, '') : ''}</p>
                        {insight.url && (
                          <a 
                            href={insight.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline mt-2 inline-block text-sm"
                          >
                            Read more
                          </a>
                        )}
                        {insight.source && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Source: {insight.source}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )) : []
              )}
              
              {researches.length === 0 || 
               researches.every(r => !r.market_insights || r.market_insights.length === 0) ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground">No market insights found.</p>
                </div>
              ) : null}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default NewsFeed;
