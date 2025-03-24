
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Lightbulb, ExternalLink, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "../ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadVCDocument } from "@/lib/supabase/documents";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FundThesisAlignmentProps {
  companyName: string;
}

export function FundThesisAlignment({ companyName }: FundThesisAlignmentProps) {
  const [hasFundThesis, setHasFundThesis] = useState<boolean>(false);
  const [fundThesisUrl, setFundThesisUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [promptSent, setPromptSent] = useState<string | null>(null);
  const [responseReceived, setResponseReceived] = useState<string | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState<boolean>(false);

  useEffect(() => {
    async function checkFundThesis() {
      try {
        setIsLoading(true);
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsLoading(false);
          return;
        }
        
        setUserId(user.id);
        
        // Check if the user has a VC profile with a fund thesis
        const { data: vcProfile, error } = await supabase
          .from('vc_profiles')
          .select('fund_thesis_url')
          .eq('id', user.id)
          .maybeSingle();
          
        if (error) {
          console.error("Error fetching VC profile:", error);
          setIsLoading(false);
          return;
        }
        
        if (vcProfile && vcProfile.fund_thesis_url) {
          setHasFundThesis(true);
          setFundThesisUrl(vcProfile.fund_thesis_url);
          
          // Check if there's an existing analysis
          const urlParts = window.location.pathname.split('/');
          const companyId = urlParts[urlParts.length - 1];
          
          if (companyId) {
            const { data: existingAnalysis } = await supabase
              .from('fund_thesis_analysis')
              .select('analysis_text, prompt_sent, response_received')
              .eq('company_id', companyId)
              .eq('user_id', user.id)
              .maybeSingle();
              
            if (existingAnalysis) {
              setAnalysis(existingAnalysis.analysis_text);
              setPromptSent(existingAnalysis.prompt_sent);
              setResponseReceived(existingAnalysis.response_received);
            }
          }
        }
      } catch (error) {
        console.error("Error checking fund thesis:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    checkFundThesis();
  }, []);
  
  const handleViewThesis = async () => {
    if (!fundThesisUrl || !userId) return;
    
    try {
      // Try to get the document
      const pdfBlob = await downloadVCDocument(fundThesisUrl, userId);
      
      if (!pdfBlob) {
        toast({
          title: "Error",
          description: "Could not retrieve the fund thesis document.",
          variant: "destructive",
        });
        return;
      }
      
      // Create URL and open in new tab
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
    } catch (error) {
      console.error("Error viewing fund thesis:", error);
      toast({
        title: "Error",
        description: "Failed to open the fund thesis document.",
        variant: "destructive",
      });
    }
  };
  
  const analyzeAlignment = async () => {
    if (!userId) return;
    
    try {
      setIsAnalyzing(true);
      // Get the company ID from the URL
      const urlParts = window.location.pathname.split('/');
      const companyId = urlParts[urlParts.length - 1];
      
      if (!companyId) {
        toast({
          title: "Error",
          description: "Could not determine the company ID.",
          variant: "destructive",
        });
        return;
      }
      
      // Get the current session for auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to analyze fund thesis alignment.",
          variant: "destructive",
        });
        return;
      }
      
      // Call the edge function using direct fetch with proper headers
      const response = await fetch('https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/analyze-fund-thesis-alignment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': supabase.supabaseUrl.split('//')[1].split('.')[0]
        },
        body: JSON.stringify({ company_id: companyId, user_id: userId })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error response: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data) {
        setAnalysis(data.analysis);
        setPromptSent(data.prompt_sent);
        setResponseReceived(data.response_received);
        
        toast({
          title: "Analysis Complete",
          description: "Fund thesis alignment analysis has been completed.",
        });
      }
    } catch (error) {
      console.error("Error analyzing fund thesis alignment:", error);
      toast({
        title: "Analysis Failed",
        description: "An error occurred during analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleDebugInfo = () => {
    setShowDebugInfo(!showDebugInfo);
  };
  
  if (isLoading) {
    return (
      <Card className="mb-6 border-0 shadow-subtle">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10 w-32 mt-2" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Don't render anything if user doesn't have a fund thesis
  if (!hasFundThesis) {
    return null;
  }
  
  return (
    <Card className="mb-6 border-0 shadow-subtle bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-indigo-500" />
          Fund Thesis Alignment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          Assess how well {companyName} aligns with your investment thesis and strategic focus areas.
          {!analysis && "Run an analysis to get AI-powered insights on the alignment."}
        </p>
        
        <div className="flex flex-col space-y-3">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2"
              onClick={handleViewThesis}
            >
              <FileText className="h-4 w-4" />
              View Your Fund Thesis
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
            
            {!analysis && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2"
                onClick={analyzeAlignment}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Lightbulb className="h-4 w-4" />
                    Analyze Alignment
                  </>
                )}
              </Button>
            )}
            
            {(promptSent || responseReceived) && (
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 ml-auto"
                onClick={toggleDebugInfo}
              >
                {showDebugInfo ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    Hide Debug Info
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Show Debug Info
                  </>
                )}
              </Button>
            )}
          </div>
          
          {analysis && (
            <Tabs defaultValue="analysis" className="mt-4">
              <TabsList>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
                {showDebugInfo && (
                  <>
                    <TabsTrigger value="prompt">Prompt</TabsTrigger>
                    <TabsTrigger value="response">Raw Response</TabsTrigger>
                  </>
                )}
              </TabsList>
              
              <TabsContent value="analysis" className="mt-2">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground whitespace-pre-line">
                    {analysis}
                  </div>
                </div>
              </TabsContent>
              
              {showDebugInfo && (
                <>
                  <TabsContent value="prompt" className="mt-2">
                    <div className="p-4 bg-muted/50 rounded-lg max-h-96 overflow-auto">
                      <h3 className="text-sm font-medium mb-2">Prompt Sent to LLM</h3>
                      <pre className="text-xs text-muted-foreground overflow-x-auto">
                        {promptSent || "No prompt data available"}
                      </pre>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="response" className="mt-2">
                    <div className="p-4 bg-muted/50 rounded-lg max-h-96 overflow-auto">
                      <h3 className="text-sm font-medium mb-2">Raw Response from LLM</h3>
                      <pre className="text-xs text-muted-foreground overflow-x-auto">
                        {responseReceived ? JSON.stringify(JSON.parse(responseReceived), null, 2) : "No response data available"}
                      </pre>
                    </div>
                  </TabsContent>
                </>
              )}
            </Tabs>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
