
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BarChart2, ExternalLink, Search, Loader2, Sparkle, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InvestorResearchProps {
  companyId: string;
  assessmentPoints: string[];
  userId: string;
}

export function InvestorResearch({ companyId, assessmentPoints, userId }: InvestorResearchProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [researchData, setResearchData] = useState<any>(null);
  const [isCheckingExisting, setIsCheckingExisting] = useState(true);
  const [companyName, setCompanyName] = useState<string>("");

  useEffect(() => {
    if (!companyId) return;
    
    const checkExistingResearch = async () => {
      try {
        setIsCheckingExisting(true);
        
        // Get company name
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('name')
          .eq('id', companyId)
          .single();
          
        if (!companyError && companyData) {
          setCompanyName(companyData.name);
        }
        
        const { data, error } = await supabase
          .from('investor_research')
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
    if (!companyId || !assessmentPoints || assessmentPoints.length === 0 || !userId) {
      toast.error("Missing required information", {
        description: "Cannot request investor research without complete data"
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('investor-research-perplexity', {
        body: { 
          companyId,
          assessmentPoints,
          userId
        }
      });
      
      if (error) {
        console.error('Error invoking research function:', error);
        toast.error("Research failed", {
          description: "There was a problem with the investor research. Please try again."
        });
        return;
      }
      
      if (data && data.id) {
        const { data: refreshedData, error: refreshError } = await supabase
          .from('investor_research')
          .select('*')
          .eq('id', data.id)
          .single();
          
        if (!refreshError && refreshedData) {
          setResearchData(refreshedData);
          setIsDialogOpen(true);
          toast.success("Research complete", {
            description: "Investor research has been completed successfully"
          });
        } else {
          console.error('Error refreshing research data:', refreshError);
          setResearchData(data);
          setIsDialogOpen(true);
        }
      } else {
        toast.error("Research failed", {
          description: data?.error || "Unknown error occurred"
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
              <CardTitle className="text-xl font-semibold">Investor Research</CardTitle>
            </div>
            
            <Button 
              variant={researchData ? "outline" : "default"}
              onClick={handleRequestResearch}
              disabled={isLoading || isCheckingExisting}
              className={researchData ? "" : "bg-blue-500 hover:bg-blue-600 text-white border-blue-500"}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkle className="mr-2 h-4 w-4" />
                  {researchData ? "Update Research" : "Generate Research"}
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
                        Investor Research
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Tailored Expert Research for Investment Decisions.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Search className="h-12 w-12 mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Investor Research Available</h3>
              <p className="text-muted-foreground max-w-md mb-6">
                Get expert research and insights crafted for investors.
              </p>
              <p className="text-sm text-muted-foreground max-w-md mb-8">
                InvestorBase uses advanced algorithms to analyze the latest news, competitors, and market trends, delivering actionable insights for smarter investment decisions.
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
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Investor Research Report: {companyName}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Comprehensive investor analysis and insights
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[70vh] pr-4">
            {researchData?.status === 'completed' ? (
              <div className="p-4 prose prose-sm max-w-none">
                {researchData?.response ? (
                  <div dangerouslySetInnerHTML={{ 
                    __html: formatResearchHtml(extractContentOutsideThinkTags(researchData.response))
                  }} />
                ) : (
                  <p>No research data available.</p>
                )}
                
                {researchData?.sources && researchData.sources.length > 0 && (
                  <div className="mt-8 pt-4 border-t">
                    <h4 className="text-base font-medium mb-2">Sources</h4>
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
              </div>
            ) : (
              <div className="p-4">
                <ResearchSkeleton />
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
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

// Updated function to extract content outside of <think></think> tags and remove link references
function extractContentOutsideThinkTags(text: string): string {
  if (!text) return '';
  
  // First, replace <think>...</think> blocks with empty string
  let content = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  
  // Remove link references like [1], [23], etc.
  content = content.replace(/\[\d+\]/g, '');
  
  return content;
}

function formatResearchHtml(text: string): string {
  if (!text) return '<p>No research data available</p>';
  
  // Improved formatting with better structure and visual hierarchy
  return text
    // Format major section headers with proper styling
    .replace(/^# (.*$)/gim, '<div class="border-b pb-2 mb-6"><h1 class="text-2xl font-bold mt-6">$1</h1></div>')
    .replace(/^## (.*$)/gim, '<div class="mt-8 mb-4"><h2 class="text-xl font-bold pb-2 border-b border-gray-200 dark:border-gray-800">$1</h2></div>')
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-5 mb-3">$1</h3>')
    .replace(/^#### (.*$)/gim, '<h4 class="text-base font-semibold mt-4 mb-2">$1</h4>')
    
    // Format text styling
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    
    // Format paragraphs with proper spacing
    .replace(/\n\n/gim, '</p><p class="mb-4">')
    
    // Format lists with better styling
    .replace(/^- (.*$)/gim, '<li class="mb-2">$1</li>')
    .replace(/\n- /g, '</p><ul class="mb-4 pl-6 space-y-2 list-disc">$&')
    .replace(/<\/li>\n- /g, '</li><li class="mb-2">')
    .replace(/<\/p><ul/g, '<ul')
    .replace(/<\/li>(?!\n<li>|\n<\/ul>)/g, '</li></ul>')
    
    // Format special sections (e.g., tables, value proposition, competitive analysis)
    .replace(/Value proposition:/g, '<div class="mt-4 mb-2 font-semibold text-primary">Value proposition:</div>')
    .replace(/Revenue risks:/g, '<div class="mt-5 mb-2 font-semibold text-primary">Revenue risks:</div>')
    .replace(/Competitive Landscape Gaps/g, '<div class="mt-6 mb-4 font-bold text-xl border-b pb-2">Competitive Landscape Gaps</div>')
    .replace(/Unaddressed competitors:/g, '<div class="mt-4 mb-2 font-semibold text-primary">Unaddressed competitors:</div>')
    
    // Format numerical values and statistics to stand out
    .replace(/(\$[0-9.,]+ (?:billion|million|trillion)|\d+% growth|\d+\.\d+%|~\d+%|\$\d+(?:\.\d+)?[BM])/gi, 
             '<span class="font-semibold">$1</span>')
    
    // Format separator lines
    .replace(/^---/gm, '<hr class="my-5 border-gray-200 dark:border-gray-800">')
    
    // Format table-like structures with proper alignment
    .replace(/\| Company \| Key Advantage \| Market Position \|/g, 
             '<div class="overflow-x-auto mt-4 mb-6"><table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">' +
             '<thead><tr><th class="text-left px-3 py-2">Company</th><th class="text-left px-3 py-2">Key Advantage</th>' +
             '<th class="text-left px-3 py-2">Market Position</th></tr></thead><tbody>')
    
    // Convert dashed competitor lines into table rows
    .replace(/\|-+\|-+\|-+\|/g, '')
    .replace(/\| ([^|]+) \| ([^|]+) \| ([^|]+) \|/g, 
             '<tr class="border-b border-gray-100 dark:border-gray-900"><td class="px-3 py-2">$1</td>' +
             '<td class="px-3 py-2">$2</td><td class="px-3 py-2">$3</td></tr>')
    
    // Close the table if it exists
    .replace(/No evidence of differentiated/g, '</tbody></table></div>No evidence of differentiated')
    
    // Clean up links and sources
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">$1</a>')
    
    // Ensure proper paragraph wrapping
    .replace(/^([^<\n].*)/gm, '<p class="mb-4">$1</p>')
    
    // Fix duplicate paragraph tags
    .replace(/<p><p/g, '<p')
    .replace(/<\/p><\/p>/g, '</p>')
    
    // Clean up line breaks
    .replace(/\n/g, ' ');
}
