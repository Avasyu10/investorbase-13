
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Target, Loader2 } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface FundThesisAlignmentProps {
  companyId: string;
  companyName: string;
  assessmentPoints?: string[];
}

export function FundThesisAlignment({ companyId, companyName, assessmentPoints = [] }: FundThesisAlignmentProps) {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(true);

  useEffect(() => {
    const checkExistingAnalysis = async () => {
      try {
        setIsAnalysisLoading(true);
        
        if (!companyId || !user?.id) return;
        
        const { data, error } = await supabase
          .from('fund_thesis_analysis')
          .select('*')
          .eq('company_id', companyId)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .maybeSingle();
          
        if (error) throw error;
        
        if (data) {
          setAnalysis(data);
        }
      } catch (error) {
        console.error('Error checking existing analysis:', error);
      } finally {
        setIsAnalysisLoading(false);
      }
    };
    
    checkExistingAnalysis();
  }, [companyId, user?.id]);

  const generateAlignment = async () => {
    try {
      setIsLoading(true);
      setIsDialogOpen(true);
      
      if (!user?.id) {
        toast.error('You must be logged in to analyze thesis alignment');
        return;
      }
      
      // Call the edge function to analyze the thesis alignment
      const { data, error } = await supabase.functions.invoke('analyze-fund-thesis-alignment', {
        body: { 
          companyId,
          assessmentPoints 
        }
      });
      
      if (error) {
        console.error('Error invoking analyze-fund-thesis-alignment function:', error);
        toast.error('Failed to analyze thesis alignment');
        return;
      }
      
      if (data.error) {
        console.error('API error:', data.error);
        toast.error(data.error);
        return;
      }
      
      setAnalysis(data.analysis);
      toast.success('Thesis alignment analysis complete');
      
    } catch (error) {
      console.error('Error in generateAlignment:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };
  
  return (
    <>
      <Card className="shadow-md border">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-semibold flex items-center">
              <Target className="mr-2 h-5 w-5 text-primary" />
              Fund Thesis Alignment
            </CardTitle>
            
            {analysis && (
              <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
                View Analysis
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {isAnalysisLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : analysis ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This analysis compares the company's profile with your investment thesis to determine alignment.
              </p>
              
              <div className="flex items-center space-x-2">
                <Badge className="bg-primary">Analysis Available</Badge>
                <span className="text-xs text-muted-foreground">
                  Created on {formatDate(analysis.created_at)}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 space-y-4">
              <Target className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold">No Thesis Alignment Analysis</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Generate an analysis to see how well {companyName} aligns with your fund's investment thesis.
              </p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-end border-t pt-4 pb-4 bg-muted/30">
          <Button 
            onClick={generateAlignment} 
            disabled={isLoading}
            className="bg-primary hover:bg-primary/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {analysis ? "Regenerate Analysis" : "Analyze Thesis Alignment"}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      {/* Analysis Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Fund Thesis Alignment Analysis</DialogTitle>
          </DialogHeader>
          
          {analysis && (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div dangerouslySetInnerHTML={{ __html: analysis.analysis_text }} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
