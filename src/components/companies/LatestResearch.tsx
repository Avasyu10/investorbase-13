
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Newspaper, RotateCw, Clock, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getLatestResearch } from "@/lib/supabase/research";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface LatestResearchProps {
  companyId: string;
  assessmentPoints: string[];
  existingResearch?: string;
  requestedAt?: string;
}

export function LatestResearch({ companyId, assessmentPoints, existingResearch, requestedAt }: LatestResearchProps) {
  const [research, setResearch] = useState<string | undefined>(existingResearch);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleRefresh = async () => {
    if (!assessmentPoints || assessmentPoints.length === 0) {
      toast({
        title: "Cannot fetch research",
        description: "No assessment data available to base research on.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      // Join assessment points as text for the research prompt
      const assessmentText = assessmentPoints.join("\n\n");
      const result = await getLatestResearch(companyId, assessmentText);
      
      if (result && result.research) {
        setResearch(result.research);
      }
    } catch (error) {
      console.error("Error refreshing research:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Format research content to extract URLs and make them clickable
  const formatResearchContent = (content: string) => {
    if (!content) return null;

    // Split by double newlines to get paragraphs
    const paragraphs = content.split(/\n\n+/);
    
    return paragraphs.map((paragraph, pIndex) => {
      // Regular expression to find URLs
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      
      // Replace URLs with anchor tags
      const paragraphWithLinks = paragraph.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary/80">${url}</a>`;
      });

      return (
        <div key={pIndex} className="mb-4">
          <div dangerouslySetInnerHTML={{ __html: paragraphWithLinks }} />
        </div>
      );
    });
  };

  return (
    <Card className="mb-7 border-0 shadow-subtle">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Latest Market Research</CardTitle>
          </div>
          {requestedAt && (
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="h-3 w-3 mr-1" />
              <span>Updated {formatDistanceToNow(new Date(requestedAt), { addSuffix: true })}</span>
            </div>
          )}
        </div>
        <CardDescription>
          Real-time market insights and competitor analysis
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : research ? (
          <div className="text-sm space-y-1">
            {formatResearchContent(research)}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mb-4 opacity-30" />
            <p className="mb-2">No research data is available yet.</p>
            <p className="text-sm mb-4">Click the button below to fetch market insights.</p>
            <Button onClick={handleRefresh} className="gap-2">
              <RotateCw className="h-4 w-4" />
              Fetch Research Data
            </Button>
          </div>
        )}
      </CardContent>
      
      {research && (
        <CardFooter className="pt-0 flex justify-between">
          <Button onClick={handleRefresh} variant="outline" size="sm" className="gap-2" disabled={isLoading}>
            <RotateCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Updating...' : 'Refresh Research'}
          </Button>
          
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
            <ExternalLink className="h-3 w-3" />
            <span className="text-xs">Data from Perplexity AI</span>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
