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
      let title = lines[0]?.replace(/^##\s*/, '') || '';

      // Remove numbered prefixes like "1.", "2.", etc. from titles
      title = title.replace(/^\d+\.\s*/, '');
      const body = lines.slice(1).join('\n').trim();
      return {
        title,
        body
      };
    }).filter(section => section.title && section.body);
  };
  const getSectionIcon = (title: string) => {
    if (title.toLowerCase().includes('summary') || title.toLowerCase().includes('overview')) {
      return <TrendingUp className="h-5 w-5 text-blue-400" />;
    }
    if (title.toLowerCase().includes('similarities') || title.toLowerCase().includes('alignment')) {
      return <Target className="h-5 w-5 text-green-400" />;
    }
    if (title.toLowerCase().includes('differences') || title.toLowerCase().includes('gaps')) {
      return <GitCompare className="h-5 w-5 text-orange-400" />;
    }
    return <FileText className="h-5 w-5 text-gray-400" />;
  };
  const getSectionBadgeColor = (title: string) => {
    if (title.toLowerCase().includes('summary') || title.toLowerCase().includes('overview')) {
      return 'bg-blue-900/30 text-blue-300 border-blue-700';
    }
    if (title.toLowerCase().includes('similarities') || title.toLowerCase().includes('alignment')) {
      return 'bg-green-900/30 text-green-300 border-green-700';
    }
    if (title.toLowerCase().includes('differences') || title.toLowerCase().includes('gaps')) {
      return 'bg-orange-900/30 text-orange-300 border-orange-700';
    }
    return 'bg-gray-800/30 text-gray-300 border-gray-600';
  };

  // Function to determine if a title should have larger heading
  const isImportantHeading = (title: string) => {
    const lowerTitle = title.toLowerCase();
    return lowerTitle.includes('similarities') || lowerTitle.includes('differences') || lowerTitle.includes('alignment') || lowerTitle.includes('gaps');
  };
  return <>
      <Button onClick={handleAnalyzeClick} disabled={isLoading || !hasFundThesis} variant="outline" className="flex items-center gap-2 border-blue-200 hover:border-blue-300 bg-amber-400 hover:bg-amber-300 text-slate-950">
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
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden bg-slate-900 border-slate-700">
          <DialogHeader className="border-b border-slate-700 pb-4 bg-gradient-to-r from-slate-800 to-blue-900/50 -m-6 mb-0 p-6 rounded-t-lg">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-blue-900/50 rounded-lg border border-blue-700">
                <FileText className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <div className="font-semibold text-slate-100">Fund Thesis Alignment Analysis</div>
                <div className="text-sm font-normal text-slate-400 mt-1">
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
                      {sections.map((section, index) => <Card key={index} className="border-0 shadow-sm bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700">
                          <CardHeader className="pb-3">
                            <CardTitle className={`flex items-center gap-3 ${isImportantHeading(section.title) ? 'text-xl' : 'text-lg'} text-slate-100`}>
                              {getSectionIcon(section.title)}
                              <span className="flex-1">{section.title}</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="prose prose-sm prose-invert max-w-none">
                              <ReactMarkdown components={{
                        // Enhanced paragraph styling
                        p: ({
                          children
                        }) => <p className="mb-4 leading-relaxed text-sm text-slate-300 last:mb-0">{children}</p>,
                        // Enhanced bullet points with custom styling
                        ul: ({
                          children
                        }) => <ul className="mb-6 space-y-2 last:mb-0">{children}</ul>,
                        li: ({
                          children
                        }) => <li className="text-sm leading-relaxed text-slate-300 flex items-start gap-3 py-1">
                                      <span className="w-2 h-2 bg-blue-400 rounded-full shrink-0 mt-2"></span>
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
                        }) => <h1 className="text-lg font-bold mb-4 mt-6 first:mt-0 text-slate-100 border-b border-slate-600 pb-2">{children}</h1>,
                        h2: ({
                          children
                        }) => <h2 className="text-base font-semibold mb-3 mt-5 first:mt-0 text-slate-200 flex items-center gap-2">
                                      <span className="w-1 h-4 bg-blue-400 rounded-full"></span>
                                      {children}
                                    </h2>,
                        h3: ({
                          children
                        }) => <h3 className="text-sm font-medium mb-2 mt-4 first:mt-0 text-slate-300">{children}</h3>,
                        // Enhanced strong text
                        strong: ({
                          children
                        }) => <strong className="font-semibold text-slate-100 bg-blue-900/30 px-1 py-0.5 rounded">{children}</strong>,
                        // Enhanced emphasis
                        em: ({
                          children
                        }) => <em className="italic text-blue-300 font-medium">{children}</em>,
                        // Enhanced code blocks
                        code: ({
                          children
                        }) => <code className="bg-slate-800 border border-slate-600 px-2 py-1 rounded text-xs font-mono text-slate-200">{children}</code>,
                        // Enhanced blockquotes
                        blockquote: ({
                          children
                        }) => <blockquote className="border-l-4 border-blue-400 bg-blue-900/20 pl-4 pr-4 py-3 ml-0 my-4 rounded-r-lg">
                                      <div className="text-blue-200 text-sm font-medium">{children}</div>
                                    </blockquote>
                      }}>
                                {section.body}
                              </ReactMarkdown>
                            </div>
                          </CardContent>
                        </Card>)}
                    </div> : <div className="prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown components={{
                  p: ({
                    children
                  }) => <p className="mb-4 leading-relaxed text-sm text-slate-300">{children}</p>,
                  ul: ({
                    children
                  }) => <ul className="mb-6 space-y-2 pl-6 list-disc">{children}</ul>,
                  li: ({
                    children
                  }) => <li className="text-sm leading-relaxed text-slate-300 pl-1">{children}</li>,
                  ol: ({
                    children
                  }) => <ol className="mb-6 space-y-2 pl-6 list-decimal">{children}</ol>,
                  h1: ({
                    children
                  }) => <h1 className="text-xl font-bold mb-4 mt-6 first:mt-0 text-slate-100 border-b border-slate-600 pb-2">{children}</h1>,
                  h2: ({
                    children
                  }) => <h2 className="text-lg font-semibold mb-3 mt-5 first:mt-0 text-slate-200">{children}</h2>,
                  h3: ({
                    children
                  }) => <h3 className="text-base font-medium mb-2 mt-4 first:mt-0 text-slate-300">{children}</h3>,
                  h4: ({
                    children
                  }) => <h4 className="text-sm font-medium mb-2 mt-3 first:mt-0 text-slate-300">{children}</h4>,
                  strong: ({
                    children
                  }) => <strong className="font-semibold text-slate-100">{children}</strong>,
                  em: ({
                    children
                  }) => <em className="italic text-slate-400">{children}</em>,
                  code: ({
                    children
                  }) => <code className="bg-slate-800 px-2 py-1 rounded text-xs font-mono text-slate-200">{children}</code>,
                  blockquote: ({
                    children
                  }) => <blockquote className="border-l-4 border-blue-400 pl-4 ml-2 italic text-slate-400 my-4 bg-slate-800/20 py-2">
                              {children}
                            </blockquote>,
                  table: ({
                    children
                  }) => <div className="overflow-x-auto my-4">
                              <table className="min-w-full border border-slate-600">{children}</table>
                            </div>,
                  th: ({
                    children
                  }) => <th className="border border-slate-600 px-3 py-2 bg-slate-800 text-left font-medium text-sm text-slate-200">{children}</th>,
                  td: ({
                    children
                  }) => <td className="border border-slate-600 px-3 py-2 text-sm text-slate-300">{children}</td>
                }}>
                        {analysis}
                      </ReactMarkdown>
                    </div>;
            })() : <div className="flex justify-center items-center py-12">
                  <Card className="text-center p-8 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 shadow-sm">
                    <CardContent className="pt-0">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                      <h3 className="text-lg font-medium text-slate-300 mb-2">No Analysis Available</h3>
                      <p className="text-sm text-slate-400">
                        Click "Refresh Analysis" to generate a new fund thesis alignment report.
                      </p>
                    </CardContent>
                  </Card>
                </div>}
            </div>
          </ScrollArea>
          
          <div className="border-t border-slate-700 bg-slate-800 pt-4 pb-2 -m-6 mt-0 p-6 rounded-b-lg flex justify-between items-center">
            <Button variant="outline" className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-200" onClick={handleRefreshAnalysis} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Analysis
            </Button>
            
            <Button variant="default" onClick={() => setIsAnalysisModalOpen(false)} className="bg-blue-600 hover:bg-blue-700 text-white">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>;
}