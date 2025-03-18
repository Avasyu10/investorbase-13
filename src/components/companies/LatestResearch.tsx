
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowUpRight, BookText, Sparkle, ExternalLink } from "lucide-react";
import { getLatestResearch } from "@/lib/supabase/research";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";

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
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const queryClient = useQueryClient();

  const handleFetchResearch = async () => {
    if (!assessmentPoints || assessmentPoints.length === 0) {
      return;
    }

    try {
      setIsLoading(true);
      setHasError(false);
      const assessmentText = assessmentPoints.join("\n\n");
      const result = await getLatestResearch(companyId, assessmentText);
      
      if (result && result.research) {
        setResearch(result.research);
        
        queryClient.invalidateQueries({
          queryKey: ['company', companyId],
        });
        
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      console.error("Error fetching research:", error);
      setHasError(true);
      
      // Use toast instead of built-in error handling to prevent multiple toasts
      toast.dismiss("research-error"); // Dismiss any existing error toasts
      toast.error("Research update failed", {
        id: "research-error",
        description: "Could not fetch latest research. Please try again later."
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const shouldFetchResearch = !research && !isLoading && assessmentPoints?.length > 0;
    
    if (shouldFetchResearch || fetchTrigger > 0) {
      console.log("Auto-fetching research data");
      handleFetchResearch();
    }
  }, [companyId, assessmentPoints, research, isLoading, fetchTrigger]);

  useEffect(() => {
    if (existingResearch && existingResearch !== research) {
      setResearch(existingResearch);
      setHasError(false);
    }
  }, [existingResearch]);

  const extractTextContent = (content: string) => {
    if (!content) return [];
    
    const sections = content.split(/#{3,}\s+/);
    return sections.filter(section => section.trim().length > 0);
  };

  const extractUrls = (content: string) => {
    if (!content) return [];
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = content.match(urlRegex);
    
    return matches || [];
  };

  const formatSectionText = (text: string) => {
    return text
      .replace(/\*\*/g, '')  
      .replace(/\[(\d+)\]/g, '') 
      .replace(/Sources:[\s\S]*$/, '') 
      .replace(/https?:\/\/[^\s]+/g, '') 
      .replace(/\n\s*\n/g, '\n') 
      .replace(/\n+$/, '') 
      .trim();
  };

  const getSectionUrl = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    return matches ? matches[0] : '';
  };

  const extractPublicationInfo = (text: string) => {
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

  const getBadgeColor = (index: number) => {
    const colors = ["bg-primary/10 text-primary", "bg-accent/10 text-primary", "bg-primary/20 text-primary", 
                    "bg-accent/20 text-primary", "bg-primary/15 text-primary"];
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

  const handleArticleClick = (article: any) => {
    setSelectedArticle(article);
    setIsDialogOpen(true);
  };

  const sections = research ? extractTextContent(research) : [];
  const urls = research ? extractUrls(research) : [];

  return (
    <Card className="mb-8 shadow-md border bg-card overflow-hidden">
      <CardHeader className="bg-muted/50 border-b pb-4">
        <div className="flex items-center gap-2">
          <Sparkle className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl font-semibold">Latest Research</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="pt-5 px-4 sm:px-6">
        {isLoading ? (
          <div className="space-y-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col space-y-2 animate-pulse">
                <div className="h-5 bg-muted rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-muted/50 rounded w-1/3 mb-3"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : sections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {sections.map((section, index) => {
              const lines = section.split('\n');
              const title = lines[0].replace(/^[#\s]+/, '');
              
              if (!title.trim()) return null;
              
              const content = lines.slice(1).join('\n');
              const url = getSectionUrl(section);
              const formattedTitle = formatSectionText(title);
              const formattedContent = formatSectionText(content);
              const pubInfo = extractPublicationInfo(content);
              const category = getCategoryFromTitle(formattedTitle);
              
              const article = {
                title: formattedTitle,
                content: formattedContent,
                url,
                publication: pubInfo.publication,
                date: pubInfo.date,
                category
              };
              
              return (
                <div 
                  key={index} 
                  className="bg-card rounded-lg p-4 border border-border shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer"
                  onClick={() => handleArticleClick(article)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className={`${getBadgeColor(index)} font-medium px-2 py-0.5 text-xs`}>
                      {category}
                    </Badge>
                    {pubInfo.date && (
                      <span className="text-xs text-muted-foreground">{pubInfo.date}</span>
                    )}
                  </div>
                  
                  <h3 className="text-sm font-bold text-foreground mb-1.5 line-clamp-2">
                    {formattedTitle}
                  </h3>
                  
                  {pubInfo.publication && (
                    <div className="text-xs text-primary font-medium mb-2">
                      {pubInfo.publication}
                    </div>
                  )}
                  
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-3">
                    {formattedContent}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mb-4 opacity-30" />
            <p className="mb-2">No research available yet.</p>
            <p className="text-sm mb-4">Click the button below to fetch the latest industry research.</p>
            <Button onClick={handleFetchResearch} className="gap-2">
              Fetch Latest Research
            </Button>
          </div>
        )}
      </CardContent>
      
      {research && urls.length > 0 && (
        <CardFooter className="flex justify-end border-t pt-4 bg-muted/30 px-6">
          <Sheet>
            <SheetTrigger asChild>
              <button className="text-sm text-primary font-medium hover:text-primary/80 flex items-center gap-1.5 transition-colors">
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedArticle?.title}</DialogTitle>
            {selectedArticle?.publication && (
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-medium text-primary">{selectedArticle.publication}</span>
                {selectedArticle.date && (
                  <span className="text-sm text-muted-foreground">{selectedArticle.date}</span>
                )}
              </div>
            )}
          </DialogHeader>
          
          <div className="mt-2">
            {selectedArticle?.category && (
              <Badge variant="outline" className="mb-4 bg-primary/10 text-primary">
                {selectedArticle.category}
              </Badge>
            )}
            
            <div className="space-y-4">
              <p className="text-foreground leading-relaxed whitespace-pre-line">
                {selectedArticle?.content}
              </p>
              
              {selectedArticle?.url && (
                <div className="pt-4 border-t border-border">
                  <a
                    href={selectedArticle.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1.5"
                  >
                    View Original Source <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
