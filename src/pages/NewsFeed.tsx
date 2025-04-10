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

  // Improved function to extract date from news or insight item
  const extractDateFromItem = (item: any): Date | null => {
    if (!item) return null;
    
    // Look for date patterns in content and source
    // Check for common date formats
    const datePatterns = [
      // Full month name with year and optional day: January 2024, 15 January 2024
      /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b/i,
      // Day with month name: 15th January, January 15th
      /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b/i,
      // Month name with year: January 2024
      /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}\b/i,
      // ISO date format: 2024-01-15
      /\d{4}-\d{2}-\d{2}/,
      // MM/DD/YYYY or DD/MM/YYYY format
      /\d{1,2}\/\d{1,2}\/\d{4}/,
      // Month abbreviation with day and year: 15 Jan 2024, Jan 15 2024
      /\b(?:\d{1,2}\s+)?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(?:\d{1,2},?\s+)?\d{4}\b/i,
      // Just year (last resort, less reliable)
      /\b(20\d{2})\b/
    ];
    
    let dateStr = '';
    let sourceStr = '';
    
    // First check content
    if (item.content) {
      for (const pattern of datePatterns) {
        const match = item.content.match(pattern);
        if (match) {
          dateStr = match[0];
          break;
        }
      }
    }
    
    // If no date in content, check source
    if (!dateStr && item.source) {
      sourceStr = item.source;
      
      // Extract date portion from source format like "Source Name (Location, Date)"
      const sourceMatch = sourceStr.match(/\(([^,]+),\s*([^)]+)\)/);
      if (sourceMatch && sourceMatch[2]) {
        dateStr = sourceMatch[2].trim();
      } else {
        // Try to find any date pattern in the source
        for (const pattern of datePatterns) {
          const match = sourceStr.match(pattern);
          if (match) {
            dateStr = match[0];
            break;
          }
        }
      }
    }
    
    // If no date in source, check headline as last resort
    if (!dateStr && item.headline) {
      for (const pattern of datePatterns) {
        const match = item.headline.match(pattern);
        if (match) {
          dateStr = match[0];
          break;
        }
      }
    }
    
    // Try to parse the date
    if (dateStr) {
      try {
        // Try direct parsing first
        let parsedDate = new Date(dateStr);
        
        // If date is invalid, try more specific parsing based on format
        if (isNaN(parsedDate.getTime())) {
          // Handle "Month Day, Year" format
          const monthDayYearMatch = dateStr.match(/(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/);
          if (monthDayYearMatch) {
            const month = monthDayYearMatch[1];
            const day = parseInt(monthDayYearMatch[2]);
            const year = parseInt(monthDayYearMatch[3]);
            
            const monthIndex = [
              'january', 'february', 'march', 'april', 'may', 'june', 
              'july', 'august', 'september', 'october', 'november', 'december'
            ].findIndex(m => month.toLowerCase().startsWith(m.substring(0, 3)));
            
            if (monthIndex !== -1) {
              parsedDate = new Date(year, monthIndex, day);
            }
          }
          
          // Handle DD/MM/YYYY format
          const ddmmyyyyMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
          if (ddmmyyyyMatch) {
            const day = parseInt(ddmmyyyyMatch[1]);
            const month = parseInt(ddmmyyyyMatch[2]) - 1; // JS months are 0-based
            const year = parseInt(ddmmyyyyMatch[3]);
            parsedDate = new Date(year, month, day);
          }
        }
        
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
        }
      } catch (e) {
        console.log("Error parsing date:", e);
      }
    }
    
    // If we couldn't extract a date or the date is invalid,
    // use a fallback approach: set a default date based on the index
    // This ensures consistent but arbitrary ordering when no date is found
    return null;
  };

  // Sort news by date (newest first)
  const sortByDate = (items: any[]): any[] => {
    if (!items || !Array.isArray(items)) return [];
    
    return [...items].sort((a, b) => {
      // Extract dates from content or publication info
      const aDate = extractDateFromItem(a);
      const bDate = extractDateFromItem(b);
      
      // If both dates are valid, compare them
      if (aDate && bDate) {
        return bDate.getTime() - aDate.getTime();
      }
      
      // If only one has a valid date, prioritize the one with a date
      if (aDate) return -1;
      if (bDate) return 1;
      
      // If neither has a valid date, keep original order
      return 0;
    });
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
