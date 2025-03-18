
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowUpRight, BookText, Sparkle, RefreshCw, ExternalLink } from "lucide-react";
import { getLatestResearch } from "@/lib/supabase/research";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";

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

  // Get the first URL in a section
  const getSectionUrl = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    return matches ? matches[0] : '';
  };

  // Extract publication date from section text
  const extractPublicationInfo = (text: string) => {
    // Look for patterns like (Publication Name, Date)
    const dateRegex = /\(([^,]+),\s*([^)]+)\)/;
    const match = text.match(dateRegex);
    
    if (match) {
      return {
        publication: match[1],
        date: match[2]
      };
    }
    
    return {
      publication: '',
      date: ''
    };
  };

  const sections = research ? extractTextContent(research) : [];
  const urls = research ? extractUrls(research) : [];

  const getBadgeColor = (index: number) => {
    const colors = ["bg-blue-100 text-blue-800", "bg-purple-100 text-purple-800", "bg-green-100 text-green-800", 
                    "bg-amber-100 text-amber-800", "bg-rose-100 text-rose-800"];
    return colors[index % colors.length];
  };

  const getCategoryFromTitle = (title: string) => {
    if (title.toLowerCase().includes('market')) return 'Market';
    if (title.toLowerCase().includes('funding')) return 'Funding';
    if (title.toLowerCase().includes('trend')) return 'Trend';
    if (title.toLowerCase().includes('regulation')) return 'Regulation';
    if (title.toLowerCase().includes('challenge')) return 'Challenge';
    return 'News';
  };

  return (
    <Card className="mb-8 shadow-md border bg-white overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b pb-4 flex flex-row justify-between items-center">
        <div className="flex items-center gap-2">
          <Sparkle className="h-5 w-5 text-indigo-500" />
          <CardTitle className="text-xl font-semibold text-slate-800">Market Insights</CardTitle>
        </div>
        {research && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh} 
            disabled={isLoading}
            className="flex items-center gap-1.5 bg-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        )}
      </CardHeader>
      
      <CardContent className="pt-5 px-4 sm:px-6">
        {isLoading ? (
          <div className="space-y-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col space-y-2 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-gray-100 rounded w-1/3 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : sections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {sections.map((section, index) => {
              // Get section title from the first line
              const lines = section.split('\n');
              const title = lines[0].replace(/^[#\s]+/, '');
              
              // Skip empty sections
              if (!title.trim()) return null;
              
              // Get content (rest of the lines)
              const content = lines.slice(1).join('\n');
              const url = getSectionUrl(section);
              const formattedTitle = formatSectionText(title);
              const formattedContent = formatSectionText(content);
              const pubInfo = extractPublicationInfo(content);
              const category = getCategoryFromTitle(formattedTitle);
              
              return (
                <div key={index} className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="flex justify-between items-start mb-2">
                    <Badge className={`${getBadgeColor(index)} font-medium px-2 py-0.5 text-xs`}>
                      {category}
                    </Badge>
                    {pubInfo.date && (
                      <span className="text-xs text-gray-500">{pubInfo.date}</span>
                    )}
                  </div>
                  
                  <h3 className="text-sm font-bold text-gray-800 mb-1.5 line-clamp-2">
                    {formattedTitle}
                  </h3>
                  
                  {pubInfo.publication && (
                    <div className="text-xs text-indigo-600 font-medium mb-2">
                      {pubInfo.publication}
                    </div>
                  )}
                  
                  <p className="text-sm text-gray-600 mb-2 line-clamp-3">
                    {formattedContent}
                  </p>
                  
                  {url && (
                    <a 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1.5 mt-1 transition-colors"
                    >
                      Read more <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              );
            })}
            
            {hasError && (
              <div className="mt-2 py-2 px-3 bg-yellow-50 border border-yellow-200 rounded-md md:col-span-2">
                <p className="text-xs text-yellow-700">
                  Using cached research data. Real-time updates couldn't be fetched.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mb-4 opacity-30" />
            <p className="mb-2">No market insights available yet.</p>
            <p className="text-sm mb-4">Click the button below to fetch the latest industry research.</p>
            <Button onClick={handleFetchResearch} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              Fetch Market Insights
            </Button>
          </div>
        )}
      </CardContent>
      
      {research && urls.length > 0 && (
        <CardFooter className="flex justify-end border-t pt-4 bg-gray-50 px-6">
          <Sheet>
            <SheetTrigger asChild>
              <button className="text-sm text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1.5 transition-colors">
                View All Sources <ArrowUpRight className="h-3.5 w-3.5" />
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
