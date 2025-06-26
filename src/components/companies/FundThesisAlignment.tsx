import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, RefreshCw, FileText, TrendingUp, GitCompare, Target } from "lucide-react";
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from 'react-markdown';
interface FundThesisAlignmentProps {
  companyId: string;
  companyName?: string;
}
export function FundThesisAlignment({
  companyId,
  companyName = "This company"
}: FundThesisAlignmentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasFundThesis, setHasFundThesis] = useState(false);
  const analyzeThesisAlignment = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);
      if (forceRefresh) {
        setAnalysis(null);
      }
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You need to be logged in to analyze thesis alignment");
        setIsLoading(false);
        setError("Authentication required");
        return;
      }
      console.log("Analyzing fund thesis alignment for company:", companyId);
      console.log("User ID:", user.id);
      const {
        data,
        error
      } = await supabase.functions.invoke('analyze-fund-thesis-alignment', {
        body: {
          company_id: companyId,
          user_id: user.id,
          force_refresh: forceRefresh
        }
      });
      if (error) {
        console.error("Error invoking analyze-fund-thesis-alignment:", error);
        toast.error("Failed to analyze fund thesis alignment");
        setError(`API error: ${error.message}`);
        setIsLoading(false);
        return;
      }
      console.log("Response from analyze-fund-thesis-alignment:", data);
      if (data.error) {
        console.error("API error:", data.error);
        toast.error(data.error);
        setError(`API error: ${data.error}`);
        setIsLoading(false);
        return;
      }

      // Process the analysis text
      if (data.analysis) {
        setAnalysis(data.analysis);
        // Automatically open the analysis modal once the data is loaded
        setIsAnalysisModalOpen(true);
        toast.success("Fund thesis analysis completed!");
      } else {
        setError("No analysis data received from API");
      }
    } catch (error) {
      console.error("Error in thesis alignment analysis:", error);
      toast.error("Failed to analyze fund thesis alignment");
      setError(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user has a fund thesis on component mount
  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);

          // Check if user has a fund thesis by looking for a non-null thesis URL
          const {
            data,
            error
          } = await supabase.from('vc_profiles').select('fund_thesis_url').eq('id', user.id).single();
          if (!error && data && data.fund_thesis_url) {
            setHasFundThesis(true);
          } else {
            // If first query fails, the profile might be using a different ID structure
            // Try to get the profile directly without filtering
            console.log("Trying alternative method to find fund thesis...");
            const {
              data: profileData,
              error: profileError
            } = await supabase.from('vc_profiles').select('fund_thesis_url').single();
            if (!profileError && profileData && profileData.fund_thesis_url) {
              setHasFundThesis(true);
              console.log("Found fund thesis with alternative method");
            } else {
              console.log("No fund thesis found:", profileError);
              setHasFundThesis(false);
            }
          }
        }
      } catch (error) {
        console.error('Error checking fund thesis:', error);
      }
    };
    checkUser();
  }, []);
  const handleAnalyzeClick = () => {
    if (!hasFundThesis) {
      toast.error("Please upload a fund thesis document in your profile first");
      return;
    }
    analyzeThesisAlignment(false);
  };
  const handleRefreshAnalysis = () => {
    analyzeThesisAlignment(true);
  };

  // Function to parse and structure the analysis content
  const parseAnalysisContent = (content: string) => {
    const sections = content.split(/(?=## )/);
    return sections.map(section => {
      const lines = section.trim().split('\n');
      const title = lines[0]?.replace(/^##\s*/, '') || '';
      const body = lines.slice(1).join('\n').trim();
      return {
        title,
        body
      };
    }).filter(section => section.title && section.body);
  };
  const getSectionIcon = (title: string) => {
    if (title.toLowerCase().includes('summary') || title.toLowerCase().includes('overview')) {
      return <TrendingUp className="h-5 w-5 text-blue-500" />;
    }
    if (title.toLowerCase().includes('similarities') || title.toLowerCase().includes('alignment')) {
      return <Target className="h-5 w-5 text-green-500" />;
    }
    if (title.toLowerCase().includes('differences') || title.toLowerCase().includes('gaps')) {
      return <GitCompare className="h-5 w-5 text-orange-500" />;
    }
    return <FileText className="h-5 w-5 text-gray-500" />;
  };
  const getSectionBadgeColor = (title: string) => {
    if (title.toLowerCase().includes('summary') || title.toLowerCase().includes('overview')) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    if (title.toLowerCase().includes('similarities') || title.toLowerCase().includes('alignment')) {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    if (title.toLowerCase().includes('differences') || title.toLowerCase().includes('gaps')) {
      return 'bg-orange-100 text-orange-800 border-orange-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };
  return <>
      <Button onClick={handleAnalyzeClick} disabled={isLoading || !hasFundThesis} variant="outline" className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 border-blue-200 hover:border-blue-300">
        {isLoading ? <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing...
          </> : <>
            <FileText className="h-4 w-4" />
            Fund Thesis Analysis
          </>}
      </Button>

      {error && <div className="mt-2 p-4 border border-red-200 bg-red-50 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700">{error}</p>
              <p className="text-sm text-red-600 mt-1">
                Please make sure you have uploaded a fund thesis document in your profile.
              </p>
            </div>
          </div>
        </div>}

      <Dialog open={isAnalysisModalOpen} onOpenChange={setIsAnalysisModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="border-b pb-4 bg-gradient-to-r from-blue-50 to-purple-50 -m-6 mb-0 p-6 rounded-t-lg">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Fund Thesis Alignment Analysis</div>
                <div className="text-sm font-normal text-gray-600 mt-1">
                  Strategic alignment assessment for {companyName}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-[75vh] pr-4">
            <div className="space-y-6 py-6">
              {analysis ? (() => {
              const sections = parseAnalysisContent(analysis);
              return sections.length > 0 ? <div className="space-y-6">
                      {sections.map((section, index) => <Card key={index} className="border-0 shadow-sm bg-gradient-to-br from-white to-gray-50/50">
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-3 text-lg">
                              {getSectionIcon(section.title)}
                              <span className="flex-1 text-slate-950">{section.title}</span>
                              <Badge variant="outline" className={`${getSectionBadgeColor(section.title)} text-xs`}>
                                Section {index + 1}
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown components={{
                        // Enhanced paragraph styling
                        p: ({
                          children
                        }) => <p className="mb-4 leading-relaxed text-sm text-gray-700 last:mb-0">{children}</p>,
                        // Enhanced bullet points with custom styling
                        ul: ({
                          children
                        }) => <ul className="mb-6 space-y-2 last:mb-0">{children}</ul>,
                        li: ({
                          children
                        }) => <li className="text-sm leading-relaxed text-gray-700 flex items-start gap-3 py-1">
                                      <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-2"></span>
                                      <span className="flex-1">{children}</span>
                                    </li>,
                        // Enhanced numbered lists with custom styling
                        ol: ({
                          children,
                          ...props
                        }) => <ol className="mb-6 space-y-3 last:mb-0" {...props}>{children}</ol>,
                        // Enhanced headers
                        h1: ({
                          children
                        }) => <h1 className="text-lg font-bold mb-4 mt-6 first:mt-0 text-gray-900 border-b border-gray-200 pb-2">{children}</h1>,
                        h2: ({
                          children
                        }) => <h2 className="text-base font-semibold mb-3 mt-5 first:mt-0 text-gray-800 flex items-center gap-2">
                                      <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                                      {children}
                                    </h2>,
                        h3: ({
                          children
                        }) => <h3 className="text-sm font-medium mb-2 mt-4 first:mt-0 text-gray-700">{children}</h3>,
                        // Enhanced strong text
                        strong: ({
                          children
                        }) => <strong className="font-semibold text-gray-900 bg-yellow-100 px-1 py-0.5 rounded">{children}</strong>,
                        // Enhanced emphasis
                        em: ({
                          children
                        }) => <em className="italic text-blue-600 font-medium">{children}</em>,
                        // Enhanced code blocks
                        code: ({
                          children
                        }) => <code className="bg-gray-100 border border-gray-200 px-2 py-1 rounded text-xs font-mono text-gray-800">{children}</code>,
                        // Enhanced blockquotes
                        blockquote: ({
                          children
                        }) => <blockquote className="border-l-4 border-blue-400 bg-blue-50 pl-4 pr-4 py-3 ml-0 my-4 rounded-r-lg">
                                      <div className="text-blue-800 text-sm font-medium">{children}</div>
                                    </blockquote>
                      }}>
                                {section.body}
                              </ReactMarkdown>
                            </div>
                          </CardContent>
                        </Card>)}
                    </div> : <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown components={{
                  p: ({
                    children
                  }) => <p className="mb-4 leading-relaxed text-sm text-foreground">{children}</p>,
                  ul: ({
                    children
                  }) => <ul className="mb-6 space-y-2 pl-6 list-disc">{children}</ul>,
                  li: ({
                    children
                  }) => <li className="text-sm leading-relaxed text-foreground pl-1">{children}</li>,
                  ol: ({
                    children
                  }) => <ol className="mb-6 space-y-2 pl-6 list-decimal">{children}</ol>,
                  h1: ({
                    children
                  }) => <h1 className="text-xl font-bold mb-4 mt-6 first:mt-0 text-foreground border-b pb-2">{children}</h1>,
                  h2: ({
                    children
                  }) => <h2 className="text-lg font-semibold mb-3 mt-5 first:mt-0 text-foreground">{children}</h2>,
                  h3: ({
                    children
                  }) => <h3 className="text-base font-medium mb-2 mt-4 first:mt-0 text-foreground">{children}</h3>,
                  h4: ({
                    children
                  }) => <h4 className="text-sm font-medium mb-2 mt-3 first:mt-0 text-foreground">{children}</h4>,
                  strong: ({
                    children
                  }) => <strong className="font-semibold text-foreground">{children}</strong>,
                  em: ({
                    children
                  }) => <em className="italic text-muted-foreground">{children}</em>,
                  code: ({
                    children
                  }) => <code className="bg-secondary px-2 py-1 rounded text-xs font-mono text-foreground">{children}</code>,
                  blockquote: ({
                    children
                  }) => <blockquote className="border-l-4 border-blue-500 pl-4 ml-2 italic text-muted-foreground my-4 bg-secondary/20 py-2">
                              {children}
                            </blockquote>,
                  table: ({
                    children
                  }) => <div className="overflow-x-auto my-4">
                              <table className="min-w-full border border-border">{children}</table>
                            </div>,
                  th: ({
                    children
                  }) => <th className="border border-border px-3 py-2 bg-secondary text-left font-medium text-sm">{children}</th>,
                  td: ({
                    children
                  }) => <td className="border border-border px-3 py-2 text-sm">{children}</td>
                }}>
                        {analysis}
                      </ReactMarkdown>
                    </div>;
            })() : <div className="flex justify-center items-center py-12">
                  <Card className="text-center p-8 bg-gradient-to-br from-gray-50 to-gray-100 border-0 shadow-sm">
                    <CardContent className="pt-0">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-medium text-gray-600 mb-2">No Analysis Available</h3>
                      <p className="text-sm text-gray-500">
                        Click "Refresh Analysis" to generate a new fund thesis alignment report.
                      </p>
                    </CardContent>
                  </Card>
                </div>}
            </div>
          </ScrollArea>
          
          <div className="border-t bg-gray-50 pt-4 pb-2 -m-6 mt-0 p-6 rounded-b-lg flex justify-between items-center">
            <Button variant="outline" className="flex items-center gap-2 bg-white hover:bg-gray-100" onClick={handleRefreshAnalysis} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Analysis
            </Button>
            
            <Button variant="default" onClick={() => setIsAnalysisModalOpen(false)} className="bg-blue-600 hover:bg-blue-700">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>;
}