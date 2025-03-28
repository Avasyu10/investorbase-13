import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Lightbulb, Newspaper, BookOpen, Globe } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MarketInsight, NewsItem, Json } from "@/components/types";

interface NewsFeedProps {
  companyId: string;
}

export function NewsFeed({ companyId }: NewsFeedProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [research, setResearch] = useState<{
    id?: string;
    company_id?: string;
    market_insights?: Json;
    news_highlights?: Json;
    created_at?: string;
  }>({});
  const [activeTab, setActiveTab] = useState("news");

  useEffect(() => {
    if (companyId) {
      fetchNewsFeed();
    }
  }, [companyId]);

  const fetchNewsFeed = async () => {
    try {
      setIsLoading(true);
      
      if (!user) {
        toast.error("You need to be logged in to view the news feed");
        return;
      }
      
      const { data, error } = await supabase
        .from("market_research")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (error) {
        console.error("Error fetching news feed:", error);
        toast.error("Failed to load news feed data");
        return;
      }
      
      if (data) {
        setResearch({
          id: data.id,
          company_id: data.company_id,
          market_insights: data.market_insights,
          news_highlights: data.news_highlights,
          created_at: data.created_at
        });
      }
    } catch (error) {
      console.error("Error fetching news feed:", error);
      toast.error("Failed to load news feed data");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to format HTML content
  const formatContentHtml = (content: string) => {
    if (!content) return '';
    
    return content
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  };

  // Make sure to properly cast the JSON data to the correct types
  const marketInsights = research?.market_insights as unknown as MarketInsight[];
  const newsHighlights = research?.news_highlights as unknown as NewsItem[];

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6 flex justify-center items-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 shadow-card border-0 bg-gradient-to-br from-amber-500/5 via-amber-500/10 to-background">
      <CardHeader className="border-b pb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-xl font-semibold">Company News Feed</CardTitle>
          </div>
          
          {research.id ? (
            <CardDescription>
              Last updated: {new Date(research.created_at!).toLocaleDateString()}
            </CardDescription>
          ) : (
            <Button
              disabled
              variant="secondary"
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              Generate Research
            </Button>
          )}
        </div>
      </CardHeader>
      
      {research.id ? (
        <CardContent className="pt-5">
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="news">News Highlights</TabsTrigger>
              <TabsTrigger value="insights">Market Insights</TabsTrigger>
            </TabsList>
            
            <TabsContent value="news">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-amber-500" />
                Latest News
              </h3>
              
              {newsHighlights && newsHighlights.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {newsHighlights.map((news, index) => (
                    <Card key={`news-${index}`} className="h-full">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base line-clamp-2">{news.headline}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm line-clamp-4 mb-2">{news.content}</p>
                        {news.url && (
                          <a 
                            href={news.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline text-xs inline-flex items-center gap-1"
                          >
                            Read more <Globe className="h-3 w-3" />
                          </a>
                        )}
                        {news.source && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Source: {news.source}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No news highlights available.</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="insights">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Market Insights
              </h3>
              
              {marketInsights && marketInsights.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {marketInsights.map((insight, index) => (
                    <Card key={`insight-${index}`} className="h-full">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{insight.headline}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{insight.content}</p>
                        {insight.source && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Source: {insight.source}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No market insights available.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      ) : (
        <CardContent className="pt-6 pb-6 text-center">
          <div className="py-12">
            <Newspaper className="h-12 w-12 text-amber-500/40 mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">
              No news feed available for this company.
            </p>
            <p className="text-xs text-muted-foreground">
              Please check back later.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
