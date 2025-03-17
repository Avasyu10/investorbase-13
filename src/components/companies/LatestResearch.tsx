
import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowUpRight, BookText, RotateCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getLatestResearch } from "@/lib/supabase/research";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

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

  // Extract text content without URLs for main display
  const extractTextContent = (content: string) => {
    if (!content) return [];
    
    // Split by sections (### headers)
    const sections = content.split(/#{3,}\s+/);
    // Remove empty sections
    return sections.filter(section => section.trim().length > 0);
  };

  // Extract all URLs from the research content
  const extractUrls = (content: string) => {
    if (!content) return [];
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = content.match(urlRegex);
    
    return matches || [];
  };

  // Format section text - improved to better handle sources
  const formatSectionText = (text: string) => {
    return text
      .replace(/\*\*/g, '')  // Remove bold markers
      .replace(/\[(\d+)\]/g, '') // Remove citation markers
      .replace(/Sources:[\s\S]*$/, '') // Remove "Sources:" and everything after it
      .replace(/https?:\/\/[^\s]+/g, '') // Remove any URLs
      .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
      .replace(/\n+$/, '') // Remove trailing newlines
      .trim();
  };

  const sections = research ? extractTextContent(research) : [];
  const urls = research ? extractUrls(research) : [];

  return (
    <Card className="mb-8 shadow-card border-0">
      <CardHeader className="bg-secondary/50 border-b pb-4">
        <div className="flex items-center gap-2">
          <BookText className="h-5 w-5" />
          <CardTitle className="text-xl font-semibold">Latest Research</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="pt-5">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : sections.length > 0 ? (
          <div className="space-y-4">
            {sections.map((section, index) => {
              // Get section title from the first line
              const lines = section.split('\n');
              const title = lines[0].replace(/^[#\s]+/, '');
              
              // Skip empty sections
              if (!title.trim()) return null;
              
              // Get content (rest of the lines)
              const content = lines.slice(1).join('\n');
              
              return (
                <div key={index} className="space-y-1">
                  <h3 className="text-sm font-semibold">{formatSectionText(title)}</h3>
                  <p className="text-sm text-muted-foreground">{formatSectionText(content)}</p>
                </div>
              );
            })}
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
      
      {research && urls.length > 0 && (
        <CardFooter className="flex justify-end border-t pt-4">
          <Sheet>
            <SheetTrigger asChild>
              <button className="text-sm text-primary font-medium hover:underline flex items-center gap-1 transition-colors">
                Sources <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Research Sources</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  The following sources were used in compiling this research:
                </p>
                <ul className="space-y-2 list-disc pl-5">
                  {urls.map((url, index) => (
                    <li key={index} className="text-sm">
                      <a 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary break-all hover:underline"
                      >
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </SheetContent>
          </Sheet>
        </CardFooter>
      )}
    </Card>
  );
}
