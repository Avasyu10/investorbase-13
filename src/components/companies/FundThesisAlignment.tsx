
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, CheckCircle, XCircle, AlertTriangle, Lightbulb, TrendingUp, TrendingDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface FundThesisAlignmentProps {
  companyId: string;
}

interface FundThesisAnalysis {
  id: string;
  company_id: string;
  user_id: string;
  thesis_document_id: string;
  prompt_sent: string;
  analysis_text: string;
  alignment_score: number;
  alignment_reasons: string[];
  fund_perspective_strengths: string[];
  fund_perspective_weaknesses: string[];
  opportunity_fit: string;
  recommendation: string;
  created_at: string;
  updated_at: string;
  response_received: string;
}

export function FundThesisAlignment({ companyId }: FundThesisAlignmentProps) {
  const [analysis, setAnalysis] = useState<FundThesisAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setIsLoading(true);
        
        // Get the most recent analysis for this company
        const { data, error } = await supabase
          .from('fund_thesis_analysis')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (error) {
          console.error('Error fetching fund thesis analysis:', error);
          // Don't set an error state for "no rows returned" - this is expected when no analysis exists
          if (error.code !== 'PGRST116') {
            setError(error.message);
            toast({
              title: "Error",
              description: `Failed to load fund thesis alignment: ${error.message}`,
              variant: "destructive",
            });
          }
          setIsLoading(false);
          return;
        }
        
        if (data) {
          setAnalysis(data as FundThesisAnalysis);
        }
      } catch (err) {
        console.error('Exception fetching fund thesis analysis:', err);
        setError('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (companyId) {
      fetchAnalysis();
    }
    
    // Set up a real-time subscription for updates to the analysis
    const subscription = supabase
      .channel('fund-thesis-analysis-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'fund_thesis_analysis',
        filter: `company_id=eq.${companyId}`,
      }, (payload) => {
        console.log('Fund thesis analysis updated:', payload);
        setAnalysis(payload.new as FundThesisAnalysis);
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [companyId]);

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return "bg-emerald-500";
    if (score >= 3.5) return "bg-blue-500";
    if (score >= 2.5) return "bg-amber-500";
    if (score >= 1.5) return "bg-orange-500";
    return "bg-red-500";
  };
  
  const getOpportunityFitBadge = (fit: string) => {
    switch (fit?.toLowerCase()) {
      case 'high':
        return <Badge className="bg-emerald-500">High Fit</Badge>;
      case 'medium-high':
        return <Badge className="bg-blue-500">Medium-High Fit</Badge>;
      case 'medium':
        return <Badge className="bg-amber-500">Medium Fit</Badge>;
      case 'medium-low':
        return <Badge className="bg-orange-500">Medium-Low Fit</Badge>;
      case 'low':
        return <Badge className="bg-red-500">Low Fit</Badge>;
      default:
        return <Badge className="bg-slate-500">Fit Analysis Pending</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-card border-0 mb-6 mt-6">
        <CardHeader className="border-b pb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-xl font-semibold">Fund Thesis Alignment</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="animate-pulse space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-10/12" />
            <div className="mt-6">
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-32 w-full rounded-lg" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No analysis available yet
  if (!analysis || !analysis.response_received) {
    return (
      <Card className="shadow-card border-0 mb-6 mt-6 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent">
        <CardHeader className="border-b pb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-xl font-semibold">Fund Thesis Alignment</CardTitle>
          </div>
          <CardDescription>
            Analysis in progress. This may take a minute...
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-muted-foreground max-w-lg">
                We're analyzing how well this company aligns with your fund's investment thesis. 
                This analysis will be updated automatically when complete.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="shadow-card border-0 mb-6 mt-6 bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent">
        <CardHeader className="border-b pb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-red-600" />
            <CardTitle className="text-xl font-semibold">Fund Thesis Alignment</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="flex items-center justify-center py-6">
            <div className="flex flex-col items-center text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-muted-foreground max-w-lg">
                {error}. Please try again later or contact support if the issue persists.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Analysis complete and available
  return (
    <Card className="shadow-card border-0 mb-6 mt-6 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent">
      <CardHeader className="border-b pb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-xl font-semibold">Fund Thesis Alignment</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xl font-bold text-blue-600">{analysis.alignment_score.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">/5</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-5">
        <div className="mb-6">
          <Progress 
            value={analysis.alignment_score * 20} 
            className={`h-2 ${getScoreColor(analysis.alignment_score)}`} 
          />
        </div>
        
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium">Opportunity Fit:</h3>
          {getOpportunityFitBadge(analysis.opportunity_fit)}
        </div>
        
        <div className="space-y-4 mb-6">
          <h3 className="text-lg font-medium">Alignment Analysis</h3>
          <p className="text-sm whitespace-pre-line">{analysis.analysis_text}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Alignment Reasons */}
          <div className="space-y-3">
            <h3 className="text-md font-medium flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              Alignment Points
            </h3>
            <ul className="space-y-2">
              {analysis.alignment_reasons.map((reason, index) => (
                <li key={index} className="flex items-start gap-2 group">
                  <div className="mt-1.5 shrink-0 rounded-full bg-emerald-100 p-1 group-hover:bg-emerald-200 transition-colors">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-sm">{reason}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Recommendation */}
          <div className="space-y-3">
            <h3 className="text-md font-medium flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Recommendation
            </h3>
            <p className="text-sm p-3 bg-amber-50 rounded-lg border border-amber-100">
              {analysis.recommendation}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strengths */}
          <div className="space-y-3">
            <h3 className="text-md font-medium flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Fund Perspective: Strengths
            </h3>
            <ul className="space-y-2">
              {analysis.fund_perspective_strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2 group">
                  <div className="mt-1.5 shrink-0 rounded-full bg-emerald-100 p-1 group-hover:bg-emerald-200 transition-colors">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-sm">{strength}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Weaknesses */}
          <div className="space-y-3">
            <h3 className="text-md font-medium flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-rose-500" />
              Fund Perspective: Concerns
            </h3>
            <ul className="space-y-2">
              {analysis.fund_perspective_weaknesses.map((weakness, index) => (
                <li key={index} className="flex items-start gap-2 group">
                  <div className="mt-1.5 shrink-0 rounded-full bg-rose-100 p-1 group-hover:bg-rose-200 transition-colors">
                    <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  </div>
                  <span className="text-sm">{weakness}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
