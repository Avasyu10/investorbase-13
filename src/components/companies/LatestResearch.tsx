import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowUpRight, BookText } from "lucide-react";
import { getLatestResearch } from "@/lib/supabase/research";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useQueryClient } from '@tanstack/react-query';

interface LatestResearchProps {
  companyId: string;
  assessmentPoints: string[];
  existingResearch?: string;
  requestedAt?: string;
  onSuccess?: () => void;
}

export function LatestResearch({ companyId, assessmentPoints, existingResearch, requestedAt, onSuccess }: LatestResearchProps) {
  const [research, setResearch] = useState<string | undefined>(existingResearch);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchTrigger, setFetchTrigger] = useState<number>(0);
  const [hasError, setHasError] = useState<boolean>(false);
  const queryClient = useQueryClient();

  const handleFetchResearch = async () => {
    if (!assessmentPoints || assessmentPoints.length === 0) {
      return;
    }

    try {
      setIsLoading(true);
      setHasError(false);
      // Join assessment points as text for the research prompt
      const assessmentText = assessmentPoints.join("\n\n");
      const result = await getLatestResearch(companyId, assessmentText);
      
      if (result && result.research) {
        setResearch(result.research);
        
        // Invalidate the company query to refresh data
        queryClient.invalidateQueries({
          queryKey: ['company', companyId],
        });
        
        // Call the onSuccess callback to notify parent component
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      console.error("Error fetching research:", error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to trigger research fetching when needed
  useEffect(() => {
    const shouldFetchResearch = !research && !isLoading && assessmentPoints?.length > 0;
    
    if (shouldFetchResearch || fetchTrigger > 0) {
      console.log("Auto-fetching research data");
      handleFetchResearch();
    }
  }, [companyId, assessmentPoints, research, isLoading, fetchTrigger]);

  // If the existingResearch prop changes (from parent), update state
  useEffect(() => {
    if (existingResearch && existingResearch !== research) {
      setResearch(existingResearch);
      setHasError(false);
    }
  }, [existingResearch]);

  // Manual refresh option
  const handleRefresh = () => {
    setFetchTrigger(prev => prev + 1);
  };

  // Extract text content without URLs for main display
  const extractTextContent = (content: string) => {
    if (!content) return [];
    
    // Split by sections (### headers)
    const sections = content.split(/#{3,}\s+/);
    // Remove empty sections
    return sections.filter(section => section.trim().length > 0);
  };

  // Format section text - improved to handle source links
  const formatSectionText = (text: string) => {
    // Replace markdown links with HTML links
    let formattedText = text.replace(/\*\*/g, '')  // Remove bold markers
      .replace(/\[(\d+)\]/g, '') // Remove citation markers
      .replace(/Sources:[\s\S]*$/, '') // Remove "Sources:" and everything after it
      .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
      .replace(/\n+$/, '') // Remove trailing newlines
      .trim();
      
    return formattedText;
  };

  // Process markdown links in the content
  const processMarkdownLinks = (text: string) => {
    // Find markdown links in the format [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    return text.replace(linkRegex, (match, text, url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">${text}</a>`;
    });
  };

  // Extract source URL from a section
  const extractSourceUrl = (text: string) => {
    // Find markdown links in the format [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/;
    const match = text.match(linkRegex);
    return match ? match[2] : null; // Return the URL if found
  };

  const sections = research ? extractTextContent(research) : [];

  return (
    <Card className="mb-8 shadow-card border-0">
      <CardHeader className="bg-secondary/50 border-b pb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BookText className="h-5 w-5" />
            <CardTitle className="text-xl font-semibold">Latest Market News</CardTitle>
          </div>
          {research && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh} 
              disabled={isLoading}
            >
              Refresh
            </Button>
          )}
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
              const sourceUrl = extractSourceUrl(content);
              
              // Format text for display
              let formattedTitle = formatSectionText(title);
              let formattedContent = formatSectionText(content);
              
              // Remove the markdown link syntax but keep the text
              const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
              formattedContent = formattedContent.replace(linkRegex, '');
              
              return (
                <div key={index} className="space-y-1">
                  <h3 className="text-sm font-semibold">{formattedTitle}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formattedContent}
                    {sourceUrl && (
                      <a 
                        href={sourceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="ml-1 text-primary hover:underline inline-flex items-center"
                      >
                        (source<ArrowUpRight className="h-3 w-3 ml-0.5" />)
                      </a>
                    )}
                  </p>
                </div>
              );
            })}
            
            {hasError && (
              <div className="mt-2 py-2 px-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-xs text-yellow-700">
                  Using cached research data. Real-time updates couldn't be fetched.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mb-4 opacity-30" />
            <p className="mb-2">No market news data is available yet.</p>
            <p className="text-sm mb-4">Click the button below to fetch market insights.</p>
            <Button onClick={handleFetchResearch} className="gap-2">
              Fetch Market News
            </Button>
          </div>
        )}
      </CardContent>
      
      {research && (
        <CardFooter className="flex justify-end border-t pt-4">
          <Sheet>
            <SheetTrigger asChild>
              <button className="text-sm text-primary font-medium hover:underline flex items-center gap-1 transition-colors">
                All Sources <ArrowUpRight className="h-3.5 w-3.5" />
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
                  {sections.map((section, index) => {
                    const sourceUrl = extractSourceUrl(section);
                    if (!sourceUrl) return null;
                    
                    // Get a title for the source
                    const lines = section.split('\n');
                    const title = lines[0].replace(/^[#\s]+/, '').trim();
                    
                    return (
                      <li key={index} className="text-sm">
                        <a 
                          href={sourceUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-primary hover:underline"
                        >
                          {title || sourceUrl}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </SheetContent>
          </Sheet>
        </CardFooter>
      )}
    </Card>
  );
}
