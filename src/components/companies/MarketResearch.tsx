import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart2, ExternalLink, Search, Loader2, Sparkle, Globe, TrendingUp, Newspaper } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MarketResearchProps {
  companyId: string;
  assessmentPoints: string[];
}

export function MarketResearch({ companyId, assessmentPoints }: MarketResearchProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [researchData, setResearchData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("summary");
  const [isCheckingExisting, setIsCheckingExisting] = useState(true);
  const [companyName, setCompanyName] = useState<string>("");
  const [showDetailView, setShowDetailView] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    
    const checkExistingResearch = async () => {
      try {
        setIsCheckingExisting(true);
        
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('name')
          .eq('id', companyId)
          .single();
          
        if (!companyError && companyData) {
          setCompanyName(companyData.name);
        }
        
        const { data, error } = await supabase
          .from('market_research')
          .select('*')
          .eq('company_id', companyId)
          .order('requested_at', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (error) {
          console.error('Error checking existing research:', error);
        } else if (data) {
          setResearchData(data);
          console.log('Found existing research data:', data);
        } else {
          // No existing research found, start analysis automatically
          console.log('No existing research found, starting analysis automatically');
          await handleRequestResearch();
        }
      } catch (error) {
        console.error('Error in checkExistingResearch:', error);
      } finally {
        setIsCheckingExisting(false);
      }
    };
    
    checkExistingResearch();
  }, [companyId]);

  const handleRequestResearch = async () => {
    if (!companyId || !assessmentPoints || assessmentPoints.length === 0) {
      toast.error("Missing company information", {
        description: "Cannot request market research without company data"
      });
      return;
    }

    try {
      setIsLoading(true);
      console.log('Starting market research for company:', companyId);
      
      const { data, error } = await supabase.functions.invoke('real-time-perplexity-research', {
        body: { 
          companyId,
          assessmentPoints 
        }
      });
      
      if (error) {
        console.error('Error invoking research function:', error);
        toast.error("Research failed", {
          description: "There was a problem with the market research. Please try again."
        });
        return;
      }
      
      console.log('Research function response:', data);
      
      if (data.success) {
        // Refresh the data from the database
        const { data: refreshedData, error: refreshError } = await supabase
          .from('market_research')
          .select('*')
          .eq('id', data.researchId)
          .single();
          
        if (!refreshError && refreshedData) {
          setResearchData(refreshedData);
          setShowDetailView(true);
          toast.success("Research complete", {
            description: "Market research has been completed successfully"
          });
        } else {
          console.error('Error refreshing research data:', refreshError);
          toast.error("Research completed but failed to load", {
            description: "Please refresh the page to see the results"
          });
        }
      } else {
        toast.error("Research failed", {
          description: data.error || "Unknown error occurred"
        });
      }
    } catch (error) {
      console.error('Error in handleRequestResearch:', error);
      toast.error("Research failed", {
        description: "An unexpected error occurred"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    if (researchData && researchData.status === 'completed') {
      setShowDetailView(true);
    }
  };

  // Helper function to remove formatting artifacts
  const cleanText = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/\*\*/g, '')
      .replace(/\*\*Analysis:\*\*/gi, '')
      .replace(/Analysis:/gi, '')
      .replace(/\*\*Analysis\*\*/gi, '')
      .replace(/analysis:/gi, '');
  };

  const renderDetailView = () => {
    if (!researchData || researchData.status !== 'completed') {
      return <ResearchSkeleton />;
    }

    return (
      <div className="h-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-primary">
            {activeTab === "summary" && "Research Summary"}
            {activeTab === "news" && "Latest News"}
            {activeTab === "insights" && "Market Insights"}
          </h3>
        </div>
        
        <ScrollArea className="h-[500px] pr-4">
          {activeTab === "summary" && (
            <div className="prose prose-sm max-w-none">
              <div dangerouslySetInnerHTML={{ 
                __html: researchData.research_summary 
                  ? formatResearchHtml(researchData.research_summary)
                  : extractSection(researchData.research_text, "RESEARCH SUMMARY") 
              }} />
            </div>
          )}
          
          {activeTab === "news" && (
            <div>
              {researchData.news_highlights && researchData.news_highlights.length > 0 ? (
                <div className="space-y-6">
                  {researchData.news_highlights.map((news: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4 bg-card">
                      <h3 className="text-lg font-semibold mb-1">{cleanText(news.headline || news.title || '')}</h3>
                      {news.source && (
                        <p className="text-sm text-primary mb-2">{news.source}</p>
                      )}
                      <p className="text-sm text-muted-foreground mb-3">
                        {cleanText(news.content || '')}
                      </p>
                      {news.url && (
                        <a 
                          href={news.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs flex items-center gap-1 text-blue-500 hover:underline"
                        >
                          Read source <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <div dangerouslySetInnerHTML={{ 
                    __html: extractSection(researchData.research_text, "LATEST NEWS") 
                  }} />
                </div>
              )}
            </div>
          )}
          
          {activeTab === "insights" && (
            <div>
              {researchData.market_insights && researchData.market_insights.length > 0 ? (
                <div className="space-y-6">
                  {researchData.market_insights.map((insight: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4 bg-card">
                      <h3 className="text-lg font-semibold mb-1">
                        {cleanText(insight.headline || insight.title || '')}
                      </h3>
                      {insight.source && (
                        <p className="text-sm text-primary mb-2">{insight.source}</p>
                      )}
                      <p className="text-sm text-muted-foreground mb-3">
                        {cleanText(insight.content || '')}
                      </p>
                      {insight.url && (
                        <a 
                          href={insight.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs flex items-center gap-1 text-blue-500 hover:underline"
                        >
                          Read source <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <div dangerouslySetInnerHTML={{ 
                    __html: extractSection(researchData.research_text, "MARKET INSIGHTS") 
                  }} />
                </div>
              )}
            </div>
          )}

          {researchData.sources && researchData.sources.length > 0 && (
            <div className="mt-8 pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Sources</h4>
              <div className="flex flex-wrap gap-2">
                {researchData.sources.map((source: any, index: number) => (
                  <a
                    key={index}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs flex items-center gap-1 text-blue-500 hover:underline bg-blue-50 dark:bg-blue-950/30 px-2 py-1 rounded"
                  >
                    Source {index + 1} <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    );
  };

  return (
    <Card className="shadow-md border bg-card overflow-hidden mb-8">
      <CardHeader className="bg-muted/50 border-b pb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl font-semibold">Real-Time Market Research</CardTitle>
          </div>
          
          <Button 
            variant="outline"
            onClick={handleRequestResearch}
            disabled={isLoading || isCheckingExisting}
            className=""
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkle className="mr-2 h-4 w-4" />
                Update Research
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-5 px-4 sm:px-6">
        {isCheckingExisting ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-pulse">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Starting market research analysis...</p>
          </div>
        ) : researchData ? (
          <div>
            {researchData.status === 'failed' && (
              <div className="bg-destructive/10 text-destructive rounded-md p-4 mb-4">
                <h4 className="font-semibold">Research Failed</h4>
                <p className="text-sm mt-1">{researchData.error_message || "Unknown error occurred"}</p>
              </div>
            )}
            
            {researchData.status === 'pending' && (
              <div className="bg-amber-50 text-amber-800 rounded-md p-4 mb-4">
                <h4 className="font-semibold">Research In Progress</h4>
                <p className="text-sm mt-1">Market research is being generated. This may take a few minutes.</p>
              </div>
            )}
            
            {researchData.status === 'completed' && (
              <>
                {showDetailView ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-primary">Research Categories</h3>
                      <div className="grid grid-cols-1 gap-4 mt-2">
                        <Card 
                          className={`bg-muted/30 cursor-pointer transition-colors hover:bg-muted/50 ${activeTab === 'summary' ? 'border-primary ring-1 ring-primary' : ''}`}
                          onClick={() => handleTabClick('summary')}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 font-medium text-sm mb-2">
                              <Globe className="h-4 w-4 text-blue-500" />
                              Market Research
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Comprehensive market analysis with up-to-date insights from reputable sources.
                            </p>
                          </CardContent>
                        </Card>
                        
                        <Card 
                          className={`bg-muted/30 cursor-pointer transition-colors hover:bg-muted/50 ${activeTab === 'news' ? 'border-primary ring-1 ring-primary' : ''}`}
                          onClick={() => handleTabClick('news')}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 font-medium text-sm mb-2">
                              <Newspaper className="h-4 w-4 text-green-500" />
                              Latest News
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Recent industry news and events with relevant implications for this company.
                            </p>
                          </CardContent>
                        </Card>
                        
                        <Card 
                          className={`bg-muted/30 cursor-pointer transition-colors hover:bg-muted/50 ${activeTab === 'insights' ? 'border-primary ring-1 ring-primary' : ''}`}
                          onClick={() => handleTabClick('insights')}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 font-medium text-sm mb-2">
                              <TrendingUp className="h-4 w-4 text-amber-500" />
                              Market Trends
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Current trends, market size data, and competitive landscape analysis.
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                    
                    <div className="border-l pl-6">
                      {renderDetailView()}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    <Card 
                      className="bg-muted/30 cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => handleTabClick('summary')}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 font-medium text-sm mb-2">
                          <Globe className="h-4 w-4 text-blue-500" />
                          Market Research
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Comprehensive market analysis with up-to-date insights.
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card 
                      className="bg-muted/30 cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => handleTabClick('news')}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 font-medium text-sm mb-2">
                          <Newspaper className="h-4 w-4 text-green-500" />
                          Latest News
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Recent industry news and events.
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card 
                      className="bg-muted/30 cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => handleTabClick('insights')}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 font-medium text-sm mb-2">
                          <TrendingUp className="h-4 w-4 text-amber-500" />
                          Market Trends
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Current trends and market analysis.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Search className="h-12 w-12 mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Market Research Available</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Get real-time market research, industry news, and competitive analysis for this company.
            </p>
            <p className="text-sm text-muted-foreground max-w-md mb-8">
              Our AI will analyze recent news, market trends, and industry data to provide actionable insights.
            </p>
          </div>
        )}
      </CardContent>
      
      {(researchData?.sources?.length > 0) && (
        <CardFooter className="flex justify-end border-t pt-4 bg-muted/30 px-6">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">{researchData.sources.length}</span> sources referenced
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

function ResearchSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-6 w-2/3 mt-6" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
    </div>
  );
}

function extractSection(text: string, sectionName: string): string {
  if (!text) return '<p>No content available</p>';
  
  const sectionRegex = new RegExp(`#+\\s*${sectionName}[\\s\\S]*?(?=#+\\s*|$)`, 'i');
  const sectionMatch = text.match(sectionRegex);
  
  if (!sectionMatch) return '<p>Section not found</p>';
  
  let html = sectionMatch[0]
    .replace(/^# (.*$)/gim, '<h2 class="text-2xl font-bold mb-4 pb-2 border-b">$1</h2>')
    .replace(/^## (.*$)/gim, '<h3 class="text-xl font-bold mb-3 mt-6">$1</h3>')
    .replace(/^### (.*$)/gim, '<h4 class="text-lg font-bold mb-2 mt-4 flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>$1</h4>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p class="mb-4">')
    .replace(/\n- /g, '</p><ul class="list-disc pl-6 my-4 space-y-2"><li class="mb-1">')
    .replace(/\n  - /g, '</li><ul class="list-circle pl-6 my-2 space-y-1"><li>')
    .replace(/<\/li>\n- /g, '</li><li class="mb-1">')
    .replace(/<\/p><ul>/g, '<ul>')
    .replace(/<\/li>(?!<li|<\/ul>)/g, '</li></ul>')
    .replace(/\n(\d+\. )(.*)/g, '</p><div class="pl-4 py-2 my-3 border-l-4 border-primary/20"><span class="font-semibold">$1</span>$2</div><p>')
    .replace(/Source:.*https?:\/\/[^\s]+/g, '')
    .replace(/\*\*Source:\*\*.*https?:\/\/[^\s]+/g, '')
    .replace(/\*\*URL:\*\*.*https?:\/\/[^\s]+/g, '')
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/\*\*/g, '')
    .replace(/\n/g, ' ');

  if (!html.startsWith('<')) {
    html = `<p class="mb-4">${html}</p>`;
  }
  
  return `<div class="mb-6 pt-4">${html}</div>`;
}

function formatResearchHtml(text: string): string {
  if (!text) return '<p>No research summary available</p>';
  
  const formatted = text
    .replace(/^# (.*$)/gim, '<div class="mb-6"><h2 class="text-2xl font-bold mb-2">$1</h2>')
    .replace(/^## (.*$)/gim, '<h3 class="text-xl font-bold mb-3 mt-6 pt-4 border-t">$1</h3></div><div class="mb-6">')
    .replace(/^### (.*$)/gim, '<h4 class="text-lg font-bold mb-2 mt-4 flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>$1</h4>')
    .replace(/^#### (.*$)/gim, '<h4 class="text-base font-bold mb-1 mt-3">$1</h4>') 
    .replace(/^##### (.*$)/gim, '<h5 class="font-bold mb-1 mt-2">$1</h5>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/\n\n/gim, '</p><p class="mb-4">')
    .replace(/^- (.*$)/gim, '<li class="flex items-start mb-2"><span class="inline-block h-1.5 w-1.5 rounded-full bg-primary/70 mt-1.5 mr-2 flex-shrink-0"></span><span>$1</span></li>')
    .replace(/\n- /g, '</p><ul class="my-4 space-y-1 pl-2">$&')
    .replace(/<\/li>\n- /g, '</li><li class="flex items-start mb-2"><span class="inline-block h-1.5 w-1.5 rounded-full bg-primary/70 mt-1.5 mr-2 flex-shrink-0"></span><span>')
    .replace(/<\/p><ul>/g, '<ul>')
    .replace(/<\/li>(?!<li|<\/ul>)/g, '</li></ul>')
    .replace(/(\$[0-9.,]+ (?:billion|million|trillion)|\d+% growth|market (?:value|size|cap) of \$[0-9.,]+ (?:billion|million|trillion))/gi, 
             '<span class="font-medium">$1</span>')
    .replace(/^(\d+)\. (.*$)/gim, '<div class="mb-4 pl-4 border-l-2 border-primary/20"><span class="font-bold">$1.</span> $2</div>')
    .replace(/Source:.*https?:\/\/[^\s]+/g, '')
    .replace(/\*\*Source:\*\*.*https?:\/\/[^\s]+/g, '')
    .replace(/\*\*URL:\*\*.*https?:\/\/[^\s]+/g, '')
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/\*\*/g, '')
    .replace(/\n/g, ' ')
    + '</div>';
  
  if (!formatted.includes('<p>') && !formatted.includes('<li>')) {
    return `<div class="research-content">
              <p class="mb-4">${formatted}</p>
            </div>`;
  }

  return `<div class="research-content">
            ${formatted}
          </div>`;
}
