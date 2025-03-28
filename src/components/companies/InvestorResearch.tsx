
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Lightbulb, Newspaper, BookOpen, Globe } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MarketInsight, NewsItem, Json } from "@/components/types";

interface InvestorResearchProps {
  companyId: string;
  assessmentPoints: string[];
}

export function InvestorResearch({ companyId, assessmentPoints }: InvestorResearchProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [research, setResearch] = useState<{
    id?: string;
    research?: string;
    researchSummary?: string;
    marketInsights?: MarketInsight[];
    newsHighlights?: NewsItem[];
    sources?: { name: string; url: string }[];
    status?: string;
    requested_at?: string;
  }>({});
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (companyId) {
      fetchExistingResearch();
    }
  }, [companyId]);

  const fetchExistingResearch = async () => {
    try {
      setIsLoading(true);
      
      if (!user) {
        toast.error("You need to be logged in to view investor research");
        return;
      }
      
      const { data, error } = await supabase
        .from("investor_research")
        .select("*")
        .eq("company_id", companyId)
        .eq("user_id", user.id)
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (error) {
        console.error("Error fetching investor research:", error);
        toast.error("Failed to load investor research data");
        return;
      }
      
      if (data) {
        console.log("Found investor research data:", data);
        setResearch({
          id: data.id,
          research: data.response,
          researchSummary: data.research_summary,
          marketInsights: data.market_insights as unknown as MarketInsight[],
          newsHighlights: data.news_highlights as unknown as NewsItem[],
          sources: data.sources as unknown as { name: string; url: string }[],
          status: data.status,
          requested_at: data.requested_at
        });
      } else {
        console.log("No investor research found for this company");
      }
    } catch (error) {
      console.error("Error fetching investor research:", error);
      toast.error("Failed to load investor research data");
    } finally {
      setIsLoading(false);
    }
  };

  const generateResearch = async () => {
    try {
      if (!user) {
        toast.error("You need to be logged in to generate investor research");
        return;
      }
      
      setIsAnalyzing(true);
      
      // Show toast to let user know the process has started
      toast.info("Generating investor research...", {
        description: "This may take up to 5 minutes. You can continue using the app while waiting.",
        duration: 5000,
      });
      
      // Call the investor-research-perplexity edge function
      const { data, error } = await supabase.functions.invoke("investor-research-perplexity", {
        body: {
          companyId,
          userId: user.id,
          assessmentPoints
        }
      });
      
      if (error) {
        console.error("Error generating investor research:", error);
        toast.error("Failed to generate investor research", {
          description: error.message || "Please try again later",
        });
        return;
      }
      
      if (data) {
        // Update the research state with the response data
        setResearch({
          id: data.id,
          research: data.research,
          researchSummary: data.researchSummary,
          marketInsights: data.marketInsights,
          newsHighlights: data.newsHighlights,
          sources: data.sources,
          status: "completed",
          requested_at: new Date().toISOString()
        });
        
        toast.success("Investor research completed", {
          description: "Research data has been generated successfully",
        });
      }
    } catch (error) {
      console.error("Error generating investor research:", error);
      toast.error("Failed to generate investor research", {
        description: "An unexpected error occurred. Please try again later.",
      });
    } finally {
      setIsAnalyzing(false);
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
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-xl font-semibold">Investor Research</CardTitle>
          </div>
          
          {research.id && research.status === "completed" ? (
            <CardDescription>
              Last updated: {new Date(research.requested_at!).toLocaleDateString()}
            </CardDescription>
          ) : (
            <Button
              onClick={generateResearch}
              disabled={isAnalyzing}
              variant="secondary"
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Lightbulb className="mr-2 h-4 w-4" />
                  Generate Research
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      
      {research.id && research.status === "completed" ? (
        <CardContent className="pt-5">
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="news">News Highlights</TabsTrigger>
              <TabsTrigger value="insights">Market Insights</TabsTrigger>
              <TabsTrigger value="sources">Sources</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              {research.researchSummary ? (
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-amber-500" />
                    Market Overview
                  </h3>
                  <div 
                    className="text-sm space-y-4 leading-relaxed" 
                    dangerouslySetInnerHTML={{ 
                      __html: `<p class="mb-4">${formatContentHtml(research.researchSummary)}</p>` 
                    }} 
                  />
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No research summary available.</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="news">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-amber-500" />
                Latest News
              </h3>
              
              {research.newsHighlights && research.newsHighlights.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {research.newsHighlights.map((news, index) => (
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
              
              {research.marketInsights && research.marketInsights.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {research.marketInsights.map((insight, index) => (
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
            
            <TabsContent value="sources">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Globe className="h-4 w-4 text-amber-500" />
                Sources
              </h3>
              
              {research.sources && research.sources.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {research.sources.map((source, index) => (
                    <li key={`source-${index}`} className="flex items-start gap-2">
                      <div className="mt-1.5 shrink-0 rounded-full bg-amber-100 p-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      </div>
                      {source.url ? (
                        <a 
                          href={source.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          {source.name}
                        </a>
                      ) : (
                        <span>{source.name}</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No sources available.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      ) : (
        <CardContent className="pt-6 pb-6 text-center">
          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-amber-500 mb-4" />
              <p className="text-muted-foreground">
                Generating investor research. This may take up to 5 minutes.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                You can continue using the app while we gather the data.
              </p>
            </div>
          ) : (
            <div className="py-12">
              <Lightbulb className="h-12 w-12 text-amber-500/40 mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">
                Generate AI-powered investor research for this company.
              </p>
              <p className="text-xs text-muted-foreground">
                Includes market overview, latest news, and investor insights.
              </p>
              <Button
                onClick={generateResearch}
                className="mt-6 bg-amber-500 hover:bg-amber-600 text-white"
                size="lg"
              >
                <Lightbulb className="mr-2 h-4 w-4" />
                Generate Research
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
