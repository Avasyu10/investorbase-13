
import { CompanyDetails } from "@/components/companies/CompanyDetails";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Sparkle, Globe, Newspaper, TrendingUp, ExternalLink, Search, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCompanyDetails } from "@/hooks/companyHooks/useCompanyDetails";
import { getLatestResearch } from "@/lib/supabase/research";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

const CompanyPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);
  const { company, isLoading } = useCompanyDetails(id);
  const [isResearchLoading, setIsResearchLoading] = useState(false);
  const [researchData, setResearchData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("summary");
  
  const handleBack = () => {
    navigate(-1);
  };

  const handleOpenResearchModal = async () => {
    setIsResearchModalOpen(true);
    
    if (!researchData && company) {
      try {
        setIsResearchLoading(true);
        const assessmentText = company.assessmentPoints?.join('\n\n') || '';
        const data = await getLatestResearch(company.id.toString(), assessmentText);
        setResearchData(data);
      } catch (error) {
        console.error("Error fetching research:", error);
      } finally {
        setIsResearchLoading(false);
      }
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const handleRequestResearch = async () => {
    if (!company) return;
    
    try {
      setIsResearchLoading(true);
      const assessmentText = company.assessmentPoints?.join('\n\n') || '';
      const data = await getLatestResearch(company.id.toString(), assessmentText);
      setResearchData(data);
    } catch (error) {
      console.error("Error fetching research:", error);
    } finally {
      setIsResearchLoading(false);
    }
  };

  const extractSection = (text: string, sectionName: string): string => {
    if (!text) return '<p>Section not found</p>';
    
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
  };

  return (
    <div className="animate-fade-in">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
          >
            <ChevronLeft className="mr-1" /> Back
          </Button>
          
          {!isLoading && company && (
            <Button
              variant="default"
              size="sm"
              onClick={handleOpenResearchModal}
              className="bg-amber-500 hover:bg-amber-600 text-white border-amber-500"
            >
              <Sparkle className="mr-2 h-4 w-4" />
              Analyze in Real Time
            </Button>
          )}
        </div>
      </div>
      
      <CompanyDetails />
      
      {/* Research Modal */}
      <Dialog open={isResearchModalOpen} onOpenChange={setIsResearchModalOpen}>
        <DialogContent className="max-w-4xl w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Sparkle className="h-5 w-5 text-amber-500" />
              Real-Time Market Research
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4">
            {company && (
              <div>
                {isResearchLoading ? (
                  <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                    <p className="text-muted-foreground">Analyzing market data...</p>
                  </div>
                ) : researchData?.research ? (
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-semibold">Research Status</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className="bg-amber-500 text-white">
                            COMPLETED
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Completed on {formatDate(researchData.requestedAt)}
                          </span>
                        </div>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        onClick={handleRequestResearch}
                        className="bg-slate-800 text-white hover:bg-slate-700 hover:text-white"
                      >
                        <Sparkle className="mr-2 h-4 w-4" />
                        Update Research
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                      <Card className="bg-slate-800 text-white border-0">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 font-medium text-sm mb-2">
                            <Globe className="h-4 w-4 text-blue-400" />
                            Market Research
                          </div>
                          <p className="text-xs text-slate-300">
                            Comprehensive market analysis with up-to-date insights from reputable sources.
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-slate-800 text-white border-0">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 font-medium text-sm mb-2">
                            <Newspaper className="h-4 w-4 text-green-400" />
                            Latest News
                          </div>
                          <p className="text-xs text-slate-300">
                            Recent industry news and events with relevant implications for this company.
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-slate-800 text-white border-0">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 font-medium text-sm mb-2">
                            <TrendingUp className="h-4 w-4 text-amber-400" />
                            Market Trends
                          </div>
                          <p className="text-xs text-slate-300">
                            Current trends, market size data, and competitive landscape analysis.
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="grid grid-cols-3 mb-4">
                        <TabsTrigger value="summary">Research Summary</TabsTrigger>
                        <TabsTrigger value="news">Latest News</TabsTrigger>
                        <TabsTrigger value="insights">Market Insights</TabsTrigger>
                      </TabsList>
                      
                      <ScrollArea className="h-[40vh]">
                        <TabsContent value="summary" className="mt-0 p-4">
                          <div className="prose prose-sm max-w-none">
                            <div dangerouslySetInnerHTML={{ 
                              __html: extractSection(researchData.research, "RESEARCH SUMMARY") 
                            }} />
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="news" className="mt-0 p-4">
                          <div className="prose prose-sm max-w-none">
                            <div dangerouslySetInnerHTML={{ 
                              __html: extractSection(researchData.research, "LATEST NEWS") 
                            }} />
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="insights" className="mt-0 p-4">
                          <div className="prose prose-sm max-w-none">
                            <div dangerouslySetInnerHTML={{ 
                              __html: extractSection(researchData.research, "MARKET INSIGHTS") 
                            }} />
                          </div>
                        </TabsContent>
                      </ScrollArea>
                    </Tabs>
                    
                    <div className="text-right text-sm text-muted-foreground">
                      <span>6 sources referenced</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No research data available yet.</p>
                    <Button 
                      className="mt-4 bg-amber-500 hover:bg-amber-600"
                      onClick={handleRequestResearch}
                    >
                      <Sparkle className="mr-2 h-4 w-4" />
                      Start Research
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyPage;
