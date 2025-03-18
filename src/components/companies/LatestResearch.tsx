
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowUpRight, Calendar, ExternalLink, Globe, Newspaper, RefreshCw } from "lucide-react";
import { getLatestResearch } from "@/lib/supabase/research";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useQueryClient } from '@tanstack/react-query';
import { Separator } from "@/components/ui/separator";

interface LatestResearchProps {
  companyId: string;
  assessmentPoints: string[];
  existingResearch?: string;
  requestedAt?: string;
  onSuccess?: () => void;
}

interface NewsItem {
  title: string;
  content: string;
  source?: string;
  url?: string;
  date?: string;
  imageUrl?: string;
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

  // Function to parse research content into structured news items
  const parseResearchToNews = (content: string): NewsItem[] => {
    if (!content) return [];
    
    // Parse headings and content
    const sections = content.split(/#{3,}\s+/);
    // Remove empty first section if exists
    const sectionsWithContent = sections.filter(section => section.trim().length > 0);
    
    return sectionsWithContent.map(section => {
      const lines = section.split('\n');
      const title = lines[0].replace(/^[#\s]+/, '').replace(/\*\*/g, '').trim();
      const contentText = lines.slice(1).join('\n').trim();
      
      // Extract URL if present
      const urlMatch = contentText.match(/(https?:\/\/[^\s)]+)/);
      const url = urlMatch ? urlMatch[0] : undefined;
      
      // Try to extract date if present (assuming format like "January 2023" or "2023")
      const datePattern = /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|\d{4}/;
      const dateMatch = contentText.match(datePattern);
      const date = dateMatch ? dateMatch[0] : undefined;
      
      // Extract source if available (assuming something like "Source: XYZ")
      let source;
      const sourceMatch = contentText.match(/Source:?\s*([^,.]+)/i) || 
                         contentText.match(/according to\s+([^,.]+)/i) ||
                         contentText.match(/reported by\s+([^,.]+)/i);
      if (sourceMatch) {
        source = sourceMatch[1].trim();
      }
      
      // Extract image URL if any (for now using placeholder since Perplexity doesn't return images)
      // We'll enhance this later with the modified prompt
      const imageKeywords = extractKeywordsForImage(title + " " + contentText);
      const imageUrl = getImageForKeywords(imageKeywords);
      
      // Clean up content (remove URLs, citations)
      const cleanContent = contentText
        .replace(/\[(\d+)\]/g, '') // Remove citation markers
        .replace(/Sources:[\s\S]*$/, '') // Remove "Sources:" section
        .replace(/https?:\/\/[^\s]+/g, '') // Remove any URLs
        .replace(/\*\*/g, '') // Remove bold markers
        .replace(/\n\s*\n/g, '\n') // Replace multiple newlines
        .replace(/\n+$/, '') // Remove trailing newlines
        .trim();
      
      return {
        title,
        content: cleanContent,
        source,
        url,
        date,
        imageUrl
      };
    });
  };

  // Helper function to extract keywords for image selection
  const extractKeywordsForImage = (text: string): string[] => {
    // Extract key business/tech terms for relevant image selection
    const keywordPatterns = [
      /\b(?:AI|artificial intelligence|machine learning|ML)\b/i,
      /\b(?:fintech|finance|banking|investment)\b/i,
      /\b(?:healthcare|medical|health|biotech)\b/i,
      /\b(?:software|SaaS|platform|app|application)\b/i,
      /\b(?:market|growth|funding|venture|capital)\b/i,
      /\b(?:startup|company|business|enterprise)\b/i,
      /\b(?:technology|tech|digital|innovation)\b/i,
      /\b(?:consumer|customer|user|client)\b/i
    ];
    
    const keywords: string[] = [];
    keywordPatterns.forEach(pattern => {
      const match = text.match(pattern);
      if (match) keywords.push(match[0].toLowerCase());
    });
    
    return keywords.length > 0 ? keywords : ['business', 'technology'];
  };

  // Get appropriate image URL based on keywords
  const getImageForKeywords = (keywords: string[]): string => {
    // Dictionary mapping keywords to image URLs
    const imageMappings: Record<string, string> = {
      'ai': 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=800&q=80',
      'artificial intelligence': 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=800&q=80',
      'machine learning': 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=800&q=80',
      'ml': 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=800&q=80',
      'fintech': 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?auto=format&fit=crop&w=800&q=80',
      'finance': 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?auto=format&fit=crop&w=800&q=80',
      'banking': 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?auto=format&fit=crop&w=800&q=80',
      'investment': 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?auto=format&fit=crop&w=800&q=80',
      'healthcare': 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?auto=format&fit=crop&w=800&q=80',
      'medical': 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?auto=format&fit=crop&w=800&q=80',
      'health': 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?auto=format&fit=crop&w=800&q=80',
      'biotech': 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?auto=format&fit=crop&w=800&q=80',
      'software': 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=800&q=80',
      'saas': 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=800&q=80',
      'platform': 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=800&q=80',
      'app': 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=800&q=80',
      'application': 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=800&q=80',
      'market': 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=800&q=80',
      'growth': 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=800&q=80',
      'funding': 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=800&q=80',
      'venture': 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=800&q=80',
      'capital': 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=800&q=80',
      'startup': 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
      'company': 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
      'business': 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
      'enterprise': 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80'
    };
    
    // Find first matching keyword
    for (const keyword of keywords) {
      if (imageMappings[keyword]) {
        return imageMappings[keyword];
      }
    }
    
    // Default image if no matching keywords
    return 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=800&q=80';
  };

  // Format date to be more readable
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'Recent';
    
    // If it's just a year, add "Published in" prefix
    if (/^\d{4}$/.test(dateStr)) {
      return `Published in ${dateStr}`;
    }
    
    return dateStr;
  };

  // Format source for display
  const formatSource = (source?: string): string => {
    if (!source) return 'Industry source';
    return source;
  };

  const newsItems = research ? parseResearchToNews(research) : [];
  const urls = research ? extractUrls(research) : [];

  // Extract all URLs from the research content
  function extractUrls(content: string) {
    if (!content) return [];
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = content.match(urlRegex);
    
    return matches || [];
  }

  return (
    <Card className="mb-8 shadow-card border-0">
      <CardHeader className="bg-gradient-to-r from-purple-500/10 to-blue-500/5 border-b pb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl font-semibold">Latest News</CardTitle>
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
      
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : newsItems.length > 0 ? (
          <div className="divide-y">
            {newsItems.map((item, index) => (
              <div key={index} className="p-5 hover:bg-muted/30 transition-colors">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Image column */}
                  <div className="md:col-span-3">
                    <div className="rounded-md overflow-hidden aspect-video bg-muted">
                      <img 
                        src={item.imageUrl} 
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  
                  {/* Content column */}
                  <div className="md:col-span-9 space-y-2">
                    <h3 className="text-base font-medium">{item.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-3">{item.content}</p>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(item.date)}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        <span>{formatSource(item.source)}</span>
                      </div>
                      
                      {item.url && (
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Read more</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mb-4 opacity-30" />
            <p className="mb-2">No news articles available yet.</p>
            <p className="text-sm mb-4">Click the button below to fetch latest market news.</p>
            <Button onClick={handleFetchResearch} className="gap-2">
              <Newspaper className="h-4 w-4" />
              Fetch Latest News
            </Button>
          </div>
        )}
      </CardContent>
      
      {research && urls.length > 0 && (
        <CardFooter className="flex justify-end border-t py-3 px-5">
          <Sheet>
            <SheetTrigger asChild>
              <button className="text-sm text-primary font-medium hover:underline flex items-center gap-1 transition-colors">
                All Sources <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>News Sources</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  The following sources were used in compiling this news:
                </p>
                <div className="space-y-3">
                  {urls.map((url, index) => (
                    <div key={index} className="bg-secondary/40 p-3 rounded-md">
                      <a 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-sm text-primary break-all hover:underline flex items-start gap-2"
                      >
                        <ExternalLink className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>{url}</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </CardFooter>
      )}
    </Card>
  );
}
