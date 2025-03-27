
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkle, ScrollText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface FundThesisAlignmentProps {
  companyId: string;
}

export function FundThesisAlignment({ companyId }: FundThesisAlignmentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [existingAnalysis, setExistingAnalysis] = useState<any>(null);

  // Check for existing analysis when component mounts
  useState(() => {
    const fetchExistingAnalysis = async () => {
      try {
        const { data, error } = await supabase
          .from('fund_thesis_analysis')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (error) {
          console.error('Error fetching existing analysis:', error);
        } else if (data) {
          setExistingAnalysis(data);
          setAnalysisText(data.analysis_text);
        }
      } catch (error) {
        console.error('Error in fetchExistingAnalysis:', error);
      }
    };
    
    fetchExistingAnalysis();
  });

  const handleRequestAnalysis = async () => {
    if (!companyId) {
      toast.error("Missing company information", {
        description: "Cannot analyze without company data"
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Call the edge function to analyze fund thesis alignment
      const { data, error } = await supabase.functions.invoke('analyze-fund-thesis-alignment', {
        body: { 
          companyId
        }
      });
      
      if (error) {
        console.error('Error invoking analysis function:', error);
        toast.error("Analysis failed", {
          description: "There was a problem with the fund thesis analysis. Please try again."
        });
        return;
      }
      
      if (data.success) {
        // Refresh the analysis data from the database
        const { data: refreshedData, error: refreshError } = await supabase
          .from('fund_thesis_analysis')
          .select('*')
          .eq('id', data.analysisId)
          .single();
          
        if (!refreshError && refreshedData) {
          setExistingAnalysis(refreshedData);
          setAnalysisText(refreshedData.analysis_text);
          setIsDialogOpen(true);
          toast.success("Analysis complete", {
            description: "Fund thesis alignment analysis has been completed"
          });
        } else {
          console.error('Error refreshing analysis data:', refreshError);
          setAnalysisText(data.analysisText || "Analysis completed, but details could not be retrieved.");
          setIsDialogOpen(true);
        }
      } else {
        toast.error("Analysis failed", {
          description: data.error || "Unknown error occurred"
        });
      }
    } catch (error) {
      console.error('Error in handleRequestAnalysis:', error);
      toast.error("Analysis failed", {
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
              <ScrollText className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl font-semibold">Fund Thesis Alignment</CardTitle>
            </div>
            
            <Button 
              variant={existingAnalysis ? "outline" : "default"}
              onClick={handleRequestAnalysis}
              disabled={isLoading}
              className={existingAnalysis ? "" : "bg-amber-500 hover:bg-amber-600 text-white border-amber-500"}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkle className="mr-2 h-4 w-4" />
                  {existingAnalysis ? "Refresh Analysis" : "Analyze Fund Alignment"}
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="pt-5 px-4 sm:px-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-pulse">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Analyzing fund thesis alignment...</p>
            </div>
          ) : existingAnalysis ? (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold">Analysis Status</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Analysis completed on {formatDate(existingAnalysis.created_at)}
                  </p>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsDialogOpen(true)}
                >
                  <ScrollText className="mr-2 h-4 w-4" />
                  View Analysis
                </Button>
              </div>
              
              <p className="text-sm">
                {existingAnalysis.analysis_text 
                  ? existingAnalysis.analysis_text.substring(0, 180) + "..." 
                  : "No analysis content available"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <ScrollText className="h-12 w-12 mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Fund Thesis Analysis Available</h3>
              <p className="text-muted-foreground max-w-md mb-6">
                Analyze how well this company aligns with your fund's investment thesis.
              </p>
              <p className="text-sm text-muted-foreground max-w-md mb-8">
                Our AI will compare this company's profile with your investment criteria to provide actionable insights.
              </p>
            </div>
          )}
        </CardContent>
        
        {existingAnalysis && (
          <CardFooter className="flex justify-end border-t pt-4 bg-muted/30 px-6">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Analysis ID:</span> {existingAnalysis.id.substring(0, 8)}
            </div>
          </CardFooter>
        )}
      </Card>
      
      {/* Analysis Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-primary" />
              Fund Thesis Alignment Analysis
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[70vh] p-4">
            {analysisText ? (
              <div className="prose prose-sm max-w-none">
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {analysisText}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-6 w-2/3 mt-6" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
