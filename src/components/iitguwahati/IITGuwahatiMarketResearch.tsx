import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart2, Loader2, Sparkle, Globe, TrendingUp, Newspaper } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

interface IITGuwahatiMarketResearchProps {
  submissionId: string;
  submissionData?: any;
}

export function IITGuwahatiMarketResearch({ submissionId, submissionData }: IITGuwahatiMarketResearchProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [researchData, setResearchData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("summary");
  const [isCheckingExisting, setIsCheckingExisting] = useState(true);
  const [showDetailView, setShowDetailView] = useState(false);

  useEffect(() => {
    if (!submissionId) return;
    
    const checkExistingResearch = async () => {
      try {
        setIsCheckingExisting(true);
        
        const { data, error } = await supabase
          .from('iitguwahati_market_research')
          .select('*')
          .eq('submission_id', submissionId)
          .order('requested_at', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (error) {
          console.error('[IITGuwahatiMarketResearch] Error checking existing research:', error);
        } else if (data) {
          console.log('[IITGuwahatiMarketResearch] Found existing research:', data.status);
          setResearchData(data);
          if (data.status === 'completed') {
            setShowDetailView(true);
          }
        } else {
          // No research exists, trigger auto-generation
          console.log('[IITGuwahatiMarketResearch] No research found, triggering auto-generation');
          setIsCheckingExisting(false);
          await handleRequestResearch();
          return;
        }
      } catch (error) {
        console.error('[IITGuwahatiMarketResearch] Error in checkExistingResearch:', error);
      } finally {
        setIsCheckingExisting(false);
      }
    };
    
    checkExistingResearch();
  }, [submissionId]);

  const handleRequestResearch = async (forceRefresh = false) => {
    if (!submissionId) {
      toast.error("Missing submission ID");
      return;
    }

    // Build assessment text from submission data
    let assessmentText = "";
    if (submissionData) {
      assessmentText = `
STARTUP: ${submissionData.startup_name || submissionData.name || 'Unknown'}

DOMAIN & PROBLEM:
${submissionData.domain_and_problem || 'Not provided'}

TARGET MARKET SIZE:
${submissionData.target_market_size || 'Not provided'}

UNIQUE PROPOSITION:
${submissionData.unique_proposition || 'Not provided'}

PRODUCT TYPE & STAGE:
${submissionData.product_type_and_stage || 'Not provided'}

REVENUE MODEL:
${submissionData.primary_revenue_model || 'Not provided'}

TRACTION:
${submissionData.key_traction_metric || 'Not provided'}

IP/MOAT STATUS:
${submissionData.ip_moat_status || 'Not provided'}

12-MONTH ROADMAP:
${submissionData.twelve_month_roadmap || 'Not provided'}
      `.trim();
    }

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('iitguwahati-market-research', {
        body: { 
          submissionId,
          assessmentText,
          forceRefresh
        }
      });
      
      if (error) {
        console.error('[IITGuwahatiMarketResearch] Error invoking function:', error);
        toast.error("Research failed", {
          description: error.message || "Failed to start market research"
        });
        return;
      }
      
      if (data?.error) {
        console.error('[IITGuwahatiMarketResearch] Function returned error:', data.error);
        toast.error("Research failed", {
          description: data.error
        });
        return;
      }
      
      // Wait a bit before refreshing to allow the data to be written
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Refresh the data from the database
      const { data: refreshedData, error: refreshError } = await supabase
        .from('iitguwahati_market_research')
        .select('*')
        .eq('submission_id', submissionId)
        .order('requested_at', { ascending: false })
        .limit(1)
        .single();
        
      if (!refreshError && refreshedData) {
        setResearchData(refreshedData);
        setShowDetailView(true);
        toast.success("Research complete", {
          description: "Market research has been completed successfully"
        });
      }
    } catch (error) {
      console.error('[IITGuwahatiMarketResearch] Error:', error);
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

  const cleanText = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/\*\*/g, '')
      .replace(/\*\*Analysis:\*\*/gi, '')
      .replace(/Analysis:/gi, '');
  };

  const formatResearchHtml = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  };

  const ResearchSkeleton = () => (
    <div className="space-y-4">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );

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
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div dangerouslySetInnerHTML={{ 
                __html: formatResearchHtml(researchData.research_summary || '')
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
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No news highlights available.</p>
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
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No market insights available.</p>
              )}
            </div>
          )}
        </ScrollArea>
        
        {researchData.sources && researchData.sources.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {researchData.sources.length} sources referenced
            </p>
          </div>
        )}
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
            onClick={() => handleRequestResearch(true)}
            disabled={isLoading || isCheckingExisting}
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
            
            {researchData.status === 'completed' && showDetailView && (
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
                          <Newspaper className="h-4 w-4 text-amber-500" />
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
                          <TrendingUp className="h-4 w-4 text-emerald-500" />
                          Market Trends
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Current trends, market size data, and competitive landscape analysis.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
                
                <div>
                  {renderDetailView()}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No market research available yet.</p>
            <Button onClick={() => handleRequestResearch(false)} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkle className="mr-2 h-4 w-4" />
                  Generate Market Research
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
