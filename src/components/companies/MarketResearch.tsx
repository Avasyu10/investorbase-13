
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
      
      // Call the edge function to get real-time research
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
      {/* Market Research section is now hidden from the main page view */}
      
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
