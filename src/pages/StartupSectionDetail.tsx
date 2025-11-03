import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface SectionSummary {
  summary: string;
  score: number;
  feedback?: string;
  fromCache: boolean;
}

export default function StartupSectionDetail() {
  const { submissionId, sectionType } = useParams<{ submissionId: string; sectionType: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sectionData, setSectionData] = useState<SectionSummary | null>(null);
  const [sectionInfo, setSectionInfo] = useState<{ title: string; description: string } | null>(null);

  const sectionTypeMap: Record<string, { title: string; description: string }> = {
    'PROBLEM': { title: 'Problem & Solution', description: 'Problem validation and solution fit' },
    'TRACTION': { title: 'Target Customers', description: 'Customer validation and market access' },
    'COMPETITIVE_LANDSCAPE': { title: 'Competitors', description: 'Competitive landscape and differentiation' },
    'BUSINESS_MODEL': { title: 'Revenue Model', description: 'Business model and revenue strategy' },
    'USP': { title: 'USP', description: 'Unique selling proposition and differentiation' },
    'TEAM': { title: 'Prototype', description: 'Technical execution and prototype development' },
  };

  const generateSummary = async (forceRefresh = false) => {
    if (!submissionId || !sectionType) return;

    setIsGenerating(true);
    try {
      const sectionName = sectionTypeMap[sectionType]?.title;
      if (!sectionName) {
        throw new Error('Invalid section type');
      }

      const { data, error } = await supabase.functions.invoke('generate-startup-section-summary', {
        body: { 
          submissionId, 
          sectionName,
          forceRefresh 
        }
      });

      if (error) {
        console.error('Error generating summary:', error);
        
        if (error.message?.includes('Rate limit')) {
          toast({
            title: "Rate Limit Exceeded",
            description: "Please try again in a moment.",
            variant: "destructive"
          });
          return;
        }
        
        if (error.message?.includes('Payment required')) {
          toast({
            title: "Credits Required",
            description: "Please add credits to continue using AI features.",
            variant: "destructive"
          });
          return;
        }
        
        throw error;
      }

      if (data?.success) {
        setSectionData({
          summary: data.summary,
          score: data.score,
          fromCache: data.fromCache
        });
        
        if (!forceRefresh && data.fromCache) {
          toast({
            title: "Summary Loaded",
            description: "Displaying cached summary."
          });
        } else {
          toast({
            title: "Summary Generated",
            description: "AI analysis completed successfully."
          });
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate summary. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sectionType) {
      setSectionInfo(sectionTypeMap[sectionType] || null);
    }
    generateSummary();
  }, [submissionId, sectionType]);

  const getScoreColor = (score: number) => {
    const percentage = (score / 100) * 100;
    if (percentage >= 80) return "text-emerald-600";
    if (percentage >= 60) return "text-blue-600";
    if (percentage >= 40) return "text-amber-600";
    if (percentage >= 20) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "outline" | "destructive" => {
    const percentage = (score / 100) * 100;
    if (percentage >= 80) return "default";
    if (percentage >= 60) return "secondary";
    if (percentage >= 40) return "outline";
    return "destructive";
  };

  const getProgressColor = (score: number) => {
    const percentage = (score / 100) * 100;
    if (percentage >= 80) return "bg-emerald-500";
    if (percentage >= 60) return "bg-blue-500";
    if (percentage >= 40) return "bg-amber-500";
    if (percentage >= 20) return "bg-orange-500";
    return "bg-red-500";
  };

  const formatSummary = (text: string) => {
    // Split by bullet points or numbered lists
    const lines = text.split('\n').filter(line => line.trim());
    
    return lines.map((line, index) => {
      const trimmedLine = line.trim();
      // Check if line starts with bullet or number
      if (trimmedLine.match(/^[-•*]\s/) || trimmedLine.match(/^\d+\.\s/)) {
        return (
          <div key={index} className="flex items-start gap-3 mb-3">
            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-2" />
            <p className="text-base leading-relaxed">{trimmedLine.replace(/^[-•*]\s|^\d+\.\s/, '')}</p>
          </div>
        );
      }
      return <p key={index} className="text-base leading-relaxed mb-3">{trimmedLine}</p>;
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!sectionInfo) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Section Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The requested section could not be found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Section Metrics
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{sectionInfo.title}</h1>
        <p className="text-muted-foreground">{sectionInfo.description}</p>
      </div>

      {sectionData && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Score Overview</CardTitle>
                <Badge variant={getScoreBadgeVariant(sectionData.score)} className="text-lg px-4 py-1">
                  {sectionData.score}/100
                </Badge>
              </div>
              <div className="relative mt-4">
                <Progress value={sectionData.score} className="h-3" />
                <div 
                  className={`absolute top-0 left-0 h-3 rounded-full transition-all ${getProgressColor(sectionData.score)}`}
                  style={{ width: `${sectionData.score}%` }}
                />
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">AI Analysis</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateSummary(true)}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Regenerate
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                {formatSummary(sectionData.summary)}
              </div>
              
              {sectionData.fromCache && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground italic">
                    This analysis was retrieved from cache. Click "Regenerate" for a fresh analysis.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!sectionData && !isLoading && (
        <Card>
          <CardHeader>
            <CardTitle>No Analysis Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">No analysis has been generated for this section yet.</p>
            <Button onClick={() => generateSummary(true)} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Generate Analysis
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
