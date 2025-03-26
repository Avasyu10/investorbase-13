import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarChart2, ExternalLink, Search, Loader2, Sparkle, Globe, TrendingUp, Newspaper } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MarketResearchProps {
  companyId: string;
  assessmentPoints: string[];
}

export function MarketResearch({ companyId, assessmentPoints }: MarketResearchProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [researchData, setResearchData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("summary");
  const [isCheckingExisting, setIsCheckingExisting] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    
    // Check if we already have research for this company
    const checkExistingResearch = async () => {
      try {
        setIsCheckingExisting(true);
        
        // Ensure companyId is a string
        const companyIdStr = String(companyId);
        
        const { data, error } = await supabase
          .from('market_research')
          .select('*')
          .eq('company_id', companyIdStr)
          .order('requested_at', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (error) {
          console.error('Error checking existing research:', error);
        } else if (data) {
          setResearchData(data);
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
      
      // Ensure companyId is a string
      const companyIdStr = String(companyId);
      
      console.log('Calling real-time-perplexity-research function with:', {
        companyId: companyIdStr,
        assessmentPoints: assessmentPoints.length
      });
      
      // Call the edge function to get real-time research
      const { data, error } = await supabase.functions.invoke('real-time-perplexity-research', {
        body: { 
          companyId: companyIdStr,
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
      
      if (data.success) {
        // Refresh the research data from the database
        const { data: refreshedData, error: refreshError } = await supabase
          .from('market_research')
          .select('*')
          .eq('id', data.researchId)
          .single();
          
        if (!refreshError && refreshedData) {
          setResearchData(refreshedData);
          setIsDialogOpen(true);
          toast.success("Research complete", {
            description: "Market research has been completed successfully"
          });
        } else {
          console.error('Error refreshing research data:', refreshError);
          setResearchData(data.research);
          setIsDialogOpen(true);
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <>
      <Card className="shadow-md border bg-card overflow-hidden mb-8">
        <CardHeader className="bg-muted/50 border-b pb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl font-semibold">Real-Time Market Research</CardTitle>
            </div>
            
            <Button 
              variant={researchData ? "outline" : "default"}
              onClick={handleRequestResearch}
              disabled={isLoading || isCheckingExisting}
              className={researchData ? "" : "bg-amber-500 hover:bg-amber-600 text-white border-amber-500"}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkle className="mr-2 h-4 w-4" />
                  {researchData ? "Update Research" : "Real-Time Analysis"}
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="pt-5 px-4 sm:px-6">
          {isCheckingExisting ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-pulse">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Checking for existing research...</p>
            </div>
          ) : researchData ? (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold">Research Status</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={researchData.status === 'completed' ? "default" : researchData.status === 'failed' ? "destructive" : "secondary"}>
                      {researchData.status.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {researchData.status === 'completed' 
                        ? `Completed on ${formatDate(researchData.completed_at)}` 
                        : `Requested on ${formatDate(researchData.requested_at)}`}
                    </span>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsDialogOpen(true)}
                  disabled={researchData.status !== 'completed'}
                >
                  <Search className="mr-2 h-4 w-4" />
                  View Research
                </Button>
              </div>
              
              {researchData.status === 'failed' && (
                <div className="bg-destructive/10 text-destructive rounded-md p-4 mt-4">
                  <h4 className="font-semibold">Error Details</h4>
                  <p className="text-sm mt-1">{researchData.error_message || "Unknown error occurred"}</p>
                </div>
              )}
              
              {researchData.status === 'completed' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  <Card className="bg-muted/30">
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
                  
                  <Card className="bg-muted/30">
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
                  
                  <Card className="bg-muted/30">
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
      
      {/* Research Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl">Market Research Analysis</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="summary" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="summary">Research Summary</TabsTrigger>
              <TabsTrigger value="news">Latest News</TabsTrigger>
              <TabsTrigger value="insights">Market Insights</TabsTrigger>
            </TabsList>
            
            <ScrollArea className="h-[60vh]">
              <TabsContent value="summary" className="mt-0 p-4">
                {/* Show the summary section from the research text */}
                {researchData?.research_text ? (
                  <div className="prose prose-sm max-w-none">
                    <div dangerouslySetInnerHTML={{ 
                      __html: extractSection(researchData.research_text, "RESEARCH SUMMARY") 
                    }} />
                  </div>
                ) : (
                  <ResearchSkeleton />
                )}
              </TabsContent>
              
              <TabsContent value="news" className="mt-0 p-4">
                {/* Show news highlights */}
                {researchData?.news_highlights && researchData.news_highlights.length > 0 ? (
                  <div className="space-y-6">
                    {researchData.news_highlights.map((news: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4 bg-card">
                        <h3 className="text-lg font-semibold mb-1">{news.headline}</h3>
                        {news.source && (
                          <p className="text-sm text-primary mb-2">{news.source}</p>
                        )}
                        <p className="text-sm text-muted-foreground mb-3">{news.content}</p>
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
                ) : researchData?.research_text ? (
                  <div className="prose prose-sm max-w-none">
                    <div dangerouslySetInnerHTML={{ 
                      __html: extractSection(researchData.research_text, "LATEST NEWS") 
                    }} />
                  </div>
                ) : (
                  <ResearchSkeleton />
                )}
              </TabsContent>
              
              <TabsContent value="insights" className="mt-0 p-4">
                {/* Show market insights */}
                {researchData?.market_insights && researchData.market_insights.length > 0 ? (
                  <div className="space-y-6">
                    {researchData.market_insights.map((insight: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4 bg-card">
                        <h3 className="text-lg font-semibold mb-1">{insight.title}</h3>
                        {insight.source && (
                          <p className="text-sm text-primary mb-2">{insight.source}</p>
                        )}
                        <p className="text-sm text-muted-foreground mb-3">{insight.content}</p>
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
                ) : researchData?.research_text ? (
                  <div className="prose prose-sm max-w-none">
                    <div dangerouslySetInnerHTML={{ 
                      __html: extractSection(researchData.research_text, "MARKET INSIGHTS") 
                    }} />
                  </div>
                ) : (
                  <ResearchSkeleton />
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
          
          {/* Sources */}
          {researchData?.sources && researchData.sources.length > 0 && (
            <div className="mt-4 pt-4 border-t">
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
        </DialogContent>
      </Dialog>
    </>
  );
}

// Helper component for loading state
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

// Helper function to extract a section from the research text
function extractSection(text: string, sectionName: string): string {
  // Find the section by its header
  const sectionRegex = new RegExp(`#+\\s*${sectionName}[\\s\\S]*?(?=#+\\s*|$)`, 'i');
  const sectionMatch = text.match(sectionRegex);
  
  if (!sectionMatch) return '<p>Section not found</p>';
  
  // Convert markdown to HTML (very basic conversion)
  let html = sectionMatch[0]
    .replace(/^#+\s*([^\n]+)/gm, '<h3>$1</h3>') // Headers
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') // Bold
    .replace(/\*([^*]+)\*/g, '<em>$1</em>') // Italic
    .replace(/\n\n/g, '</p><p>') // Paragraphs
    .replace(/\n- /g, '</p><ul><li>') // List items
    .replace(/\n  - /g, '</p><ul><li>') // Nested list items
    .replace(/<\/li>\n- /g, '</li><li>') // Multiple list items
    .replace(/<\/p><ul>/g, '<ul>') // Fix paragraph before list
    .replace(/\n/g, ' ') // Replace remaining newlines with spaces
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">$1</a>'); // Links
  
  // Wrap in p tags if not already
  if (!html.startsWith('<')) {
    html = `<p>${html}</p>`;
  }
  
  return html;
}
