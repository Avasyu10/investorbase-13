
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BarChart2, ExternalLink, Search, Loader2, Sparkle, Globe, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, CircleDollarSign, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [activeTab, setActiveTab] = useState<string>("overview");

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
            <DialogTitle className="text-xl flex items-center gap-2">
              <CircleDollarSign className="h-5 w-5 text-primary" />
              <span>Investor Research Report: {companyName}</span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Comprehensive investor analysis and insights
            </DialogDescription>
          </DialogHeader>
          
          {researchData?.status === 'completed' ? (
            <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="risks">Risks & Concerns</TabsTrigger>
                <TabsTrigger value="financials">Financial Analysis</TabsTrigger>
              </TabsList>
              
              <ScrollArea className="h-[65vh] pr-4">
                <TabsContent value="overview" className="p-4 mt-0 space-y-6">
                  {researchData?.response ? (
                    <div className="prose prose-sm max-w-none">
                      <div className="formatted-research" dangerouslySetInnerHTML={{ 
                        __html: formatResearchSection(extractContentOutsideThinkTags(researchData.response), "Market Opportunity") 
                      }} />
                    </div>
                  ) : (
                    <ResearchSkeleton />
                  )}
                </TabsContent>
                
                <TabsContent value="risks" className="p-4 mt-0 space-y-6">
                  {researchData?.response ? (
                    <div className="prose prose-sm max-w-none">
                      <div className="formatted-research" dangerouslySetInnerHTML={{ 
                        __html: formatResearchSection(extractContentOutsideThinkTags(researchData.response), "Key Investor Concerns") 
                      }} />
                    </div>
                  ) : (
                    <ResearchSkeleton />
                  )}
                </TabsContent>
                
                <TabsContent value="financials" className="p-4 mt-0 space-y-6">
                  {researchData?.response ? (
                    <div className="prose prose-sm max-w-none">
                      <div className="formatted-research" dangerouslySetInnerHTML={{ 
                        __html: formatResearchSection(extractContentOutsideThinkTags(researchData.response), "Financial & Traction") 
                      }} />
                    </div>
                  ) : (
                    <ResearchSkeleton />
                  )}
                </TabsContent>
              </ScrollArea>
              
              {researchData?.sources && researchData.sources.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-base font-medium mb-2 flex items-center gap-1.5">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    Sources
                  </h4>
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
            </Tabs>
          ) : (
            <div className="p-4">
              <ResearchSkeleton />
            </div>
          )}
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

// Enhanced formatting function to make research visually appealing
function formatResearchHtml(text: string): string {
  if (!text) return '<p>No research data available</p>';
  
  return text
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-3 mt-6 text-primary">$1</h1>') // h1
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mb-2 mt-5 text-primary/90">$1</h2>') // h2
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mb-2 mt-4 text-primary/80">$1</h3>') // h3
    .replace(/^#### (.*$)/gim, '<h4 class="text-base font-bold mb-1 mt-3 text-primary/70">$1</h4>') // h4
    .replace(/^##### (.*$)/gim, '<h5 class="font-bold mb-1 mt-2 text-primary/60">$1</h5>') // h5
    .replace(/\*\*(.*?)\*\*/gim, '<strong class="text-foreground">$1</strong>') // bold
    .replace(/\*(.*?)\*/gim, '<em>$1</em>') // italic
    .replace(/\n\n/gim, '</p><p class="mb-4">') // paragraphs
    .replace(/^- (.*$)/gim, '<li class="ml-5 mb-1">$1</li>') // list items
    .replace(/\n- /g, '</p><ul class="my-3 space-y-1"><li class="ml-5 mb-1">') // list start
    .replace(/<\/li>\n- /g, '</li><li class="ml-5 mb-1">') // consecutive list items
    .replace(/<\/p><ul/g, '<ul') // fix paragraph to list transition
    .replace(/<\/li>(?!\n<li>|\n<\/ul>)/g, '</li></ul>') // close lists
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">$1</a>'); // links
}

// Function to extract and format specific sections of the research
function formatResearchSection(text: string, sectionName: string): string {
  if (!text) return '<p>No research data available</p>';
  
  // Extract section based on heading (exact or partial match)
  const sections = text.split(/^#+\s+/m);
  let sectionContent = '';
  
  for (let i = 0; i < sections.length; i++) {
    if (sections[i].trim().startsWith(sectionName) || 
        sections[i].toLowerCase().trim().startsWith(sectionName.toLowerCase())) {
      sectionContent = sections[i];
      break;
    }
  }
  
  if (!sectionContent) {
    // If exact heading not found, try to find content containing the section name
    const regex = new RegExp(`(${sectionName}[\\s\\S]*?)(?=^#+\\s+|$)`, 'im');
    const match = text.match(regex);
    sectionContent = match ? match[1] : '';
  }
  
  if (!sectionContent) {
    return `<p>No ${sectionName} section found in research</p>`;
  }
  
  // Apply special formatting based on section type
  let result = '';
  
  switch (sectionName.toLowerCase()) {
    case 'market opportunity':
      result = `<div class="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 mb-6">
        <h2 class="text-xl font-bold mb-3 text-blue-700 dark:text-blue-400 flex items-center">
          <TrendingUp className="mr-2 h-5 w-5" />
          Market Opportunity & Competitive Risks
        </h2>
        ${formatSectionContent(sectionContent, 'blue')}
      </div>`;
      break;
      
    case 'key investor concerns':
      result = `<div class="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800 mb-6">
        <h2 class="text-xl font-bold mb-3 text-amber-700 dark:text-amber-400 flex items-center">
          <AlertTriangle className="mr-2 h-5 w-5" />
          Key Investor Concerns
        </h2>
        ${formatSectionContent(sectionContent, 'amber')}
      </div>`;
      break;
      
    case 'financial & traction':
      result = `<div class="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800 mb-6">
        <h2 class="text-xl font-bold mb-3 text-green-700 dark:text-green-400 flex items-center">
          <CircleDollarSign className="mr-2 h-5 w-5" />
          Financial & Traction Metrics
        </h2>
        ${formatSectionContent(sectionContent, 'green')}
      </div>`;
      break;
      
    default:
      result = `<div class="p-4 rounded-lg border mb-6">
        <h2 class="text-xl font-bold mb-3 flex items-center">
          ${sectionName}
        </h2>
        ${formatSectionContent(sectionContent, 'gray')}
      </div>`;
  }
  
  return result;
}

function formatSectionContent(content: string, colorTheme: string): string {
  // Remove the title from the content
  const lines = content.split('\n');
  lines.shift(); // Remove first line (title)
  content = lines.join('\n');
  
  // Apply formatting based on color theme
  let formattedContent = content
    .replace(/^(Market sizing gaps|Unaddressed saturation risks|Problem-Solution Fit|Unit Economics|Execution Risks|Financial & Traction Red Flags|Unsubstantiated projections):/gim, 
      `<h3 class="text-${colorTheme}-600 dark:text-${colorTheme}-400 font-bold mt-4 mb-2">$1</h3>`)
    .replace(/\*\*(.*?)\*\*/gim, `<strong class="text-${colorTheme}-700 dark:text-${colorTheme}-300">$1</strong>`) // bold
    .replace(/\*(.*?)\*/gim, '<em>$1</em>') // italic
    .replace(/\n\n/gim, '</p><p class="mb-3 text-sm">') // paragraphs
    .replace(/^([0-9]+\.) (.*$)/gim, '<div class="flex gap-2 mb-2"><span class="font-bold text-black dark:text-white">$1</span><span>$2</span></div>') // numbered items
    .replace(/^- (.*$)/gim, `<li class="ml-5 mb-1 text-sm marker:text-${colorTheme}-500">$1</li>`) // list items
    .replace(/\n- /g, `</p><ul class="my-3 list-disc space-y-1 text-sm"><li class="ml-5 marker:text-${colorTheme}-500">`) // list start
    .replace(/<\/li>\n- /g, '</li><li class="ml-5">') // consecutive list items
    .replace(/<\/p><ul/g, '<ul') // fix paragraph to list transition
    .replace(/<\/li>(?!\n<li>|\n<\/ul>)/g, '</li></ul>'); // close lists
  
  // Wrap in paragraph if not starting with formatted element
  if (!formattedContent.startsWith('<')) {
    formattedContent = `<p class="mb-3 text-sm">${formattedContent}</p>`;
  }
  
  return formattedContent;
}
