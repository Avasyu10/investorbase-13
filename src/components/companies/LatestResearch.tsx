
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowUpRight, BookText, RefreshCw, Newspaper } from "lucide-react";
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

interface NewsArticle {
  headline: string;
  publication: string;
  content: string;
  sourceUrl?: string;
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

  // Parse research content into news articles
  const parseNewsArticles = (content: string): NewsArticle[] => {
    if (!content) return [];

    // Split by markdown headings (### Headlines)
    const sections = content.split(/###\s+/);
    // Remove the first empty section if it exists
    const articleSections = sections.filter(section => section.trim().length > 0);
    
    return articleSections.map(section => {
      const lines = section.split('\n').filter(line => line.trim().length > 0);
      
      // First line is the headline
      const headline = lines[0].trim();
      
      // Second line typically contains publication info
      const publicationLine = lines.length > 1 ? lines[1].trim() : '';
      
      // Extract source URL if available (typically at the end with format [Source](url))
      const sourceMatch = section.match(/\[Source\]\((https?:\/\/[^\s)]+)\)/i) || 
                          section.match(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/);
      const sourceUrl = sourceMatch ? sourceMatch[1] : undefined;
      
      // Get the content (all lines except the headline and publication info)
      const contentLines = lines.slice(2).filter(line => 
        !line.includes('[Source](') && 
        !line.match(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/)
      );
      const content = contentLines.join(' ');
      
      return {
        headline,
        publication: publicationLine,
        content,
        sourceUrl
      };
    });
  };

  const newsArticles = research ? parseNewsArticles(research) : [];
  
  // Get placeholder image URL based on content
  const getImageUrl = (article: NewsArticle): string => {
    const topics = [
      { keyword: "funding", url: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3" },
      { keyword: "market", url: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3" },
      { keyword: "technology", url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3" },
      { keyword: "launch", url: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3" },
      { keyword: "growth", url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3" },
      { keyword: "partnership", url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3" },
      { keyword: "regulation", url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3" },
    ];
    
    // Default image if no match is found
    let imageUrl = "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3";
    
    // Check article content against keywords to find relevant image
    const combinedText = `${article.headline} ${article.content}`.toLowerCase();
    for (const topic of topics) {
      if (combinedText.includes(topic.keyword)) {
        imageUrl = topic.url;
        break;
      }
    }
    
    return imageUrl;
  };

  return (
    <Card className="mb-8 shadow-card border-0">
      <CardHeader className="bg-secondary/50 border-b pb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            <CardTitle className="text-xl font-semibold">Latest Industry News</CardTitle>
          </div>
          {research && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh} 
              disabled={isLoading}
              className="gap-1"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-5">
        {isLoading ? (
          <div className="space-y-6">
            <div className="flex gap-4">
              <Skeleton className="h-20 w-32 rounded-md" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
            <div className="flex gap-4">
              <Skeleton className="h-20 w-32 rounded-md" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-3 w-1/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
          </div>
        ) : newsArticles.length > 0 ? (
          <div className="space-y-6">
            {newsArticles.map((article, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-4 pb-6 border-b last:border-0 last:pb-0 group">
                <div className="sm:w-1/4 min-w-[120px] max-w-[180px] mb-2 sm:mb-0">
                  <div className="aspect-video bg-secondary rounded-md overflow-hidden">
                    <img 
                      src={getImageUrl(article)} 
                      alt={article.headline} 
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-medium mb-1 line-clamp-2 transition-colors group-hover:text-primary">
                    {article.headline}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2">{article.publication}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-1">{article.content}</p>
                  {article.sourceUrl && (
                    <a 
                      href={article.sourceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                    >
                      Source <ArrowUpRight className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
            
            {hasError && (
              <div className="mt-2 py-2 px-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-xs text-yellow-700">
                  Using cached news data. Real-time updates couldn't be fetched.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mb-4 opacity-30" />
            <p className="mb-2">No industry news is available yet.</p>
            <p className="text-sm mb-4">Click the button below to fetch the latest news.</p>
            <Button onClick={handleFetchResearch} className="gap-2">
              Fetch Industry News
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
