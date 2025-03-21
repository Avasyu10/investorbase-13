
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BookText, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  BarChart3, 
  DollarSign, 
  Lightbulb,
  LineChart,
  Users,
  Building2,
  CheckCircle,
  AlertTriangle,
  Globe
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionDetailed } from "@/hooks/useCompanyDetails";

interface SectionDetailProps {
  section: SectionDetailed | null;
  isLoading: boolean;
}

// Helper function to format description as bullet points
const formatDescriptionAsBullets = (description: string): string[] => {
  if (!description) return [];
  
  // Instead of splitting on every period, try to identify complete thoughts
  // This regex looks for sentence endings followed by spaces or line breaks
  const regex = /(?<=[.!?])\s+(?=[A-Z])/g;
  
  // Split by the regex to get complete sentences
  let sentences = description.split(regex);
  
  // If we have very few sentences, try another approach for more granular points
  if (sentences.length <= 2 && description.length > 200) {
    // Try splitting on semicolons and line breaks too
    sentences = description.split(/(?<=[.;!?\n])\s+(?=[A-Z])/);
  }
  
  // Process each sentence
  return sentences
    .map(s => s.trim())
    .filter(s => s.length > 5) // Minimum length to be considered a point
    .map(s => {
      // Ensure each sentence ends with proper punctuation
      if (s.endsWith('.') || s.endsWith('!') || s.endsWith('?') || s.endsWith(';')) {
        return s;
      }
      return s + '.';
    })
    // Fix any split sentence fragments by joining them with the next one if they're too short
    .reduce((result: string[], current, index, array) => {
      if (current.length < 30 && index < array.length - 1) {
        // Current sentence is too short, join it with the next one
        array[index + 1] = current + ' ' + array[index + 1];
        return result;
      }
      result.push(current);
      return result;
    }, []);
};

export function SectionDetail({ section, isLoading }: SectionDetailProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (!section) {
    return <div>Section not found</div>;
  }

  // Check if section is missing (score of 0.5 indicates a missing section)
  const isSectionMissing = section?.score === 0.5;

  // Format the detailed content as bullet points and categorize them
  const contentBullets = section ? formatDescriptionAsBullets(section.detailedContent) : [];
  
  // Function to determine if a bullet point is a metric/statistic
  const isMetric = (text: string) => {
    return text.match(/\$|\d+%|\d+\s*(million|billion)|[0-9]+/i) !== null;
  };

  // Function to determine if a bullet point is about competition
  const isCompetitive = (text: string) => {
    return text.toLowerCase().includes('competitor') || 
           text.toLowerCase().includes('market') ||
           text.toLowerCase().includes('industry') ||
           text.toLowerCase().includes('players');
  };

  // Function to determine if a bullet point relates to growth or opportunity
  const isGrowth = (text: string) => {
    return text.toLowerCase().includes('growth') || 
           text.toLowerCase().includes('opportunity') ||
           text.toLowerCase().includes('expansion') ||
           text.toLowerCase().includes('potential') ||
           text.toLowerCase().includes('future');
  };

  // Function to determine if a bullet point is about product or technology
  const isProduct = (text: string) => {
    return text.toLowerCase().includes('product') || 
           text.toLowerCase().includes('technology') ||
           text.toLowerCase().includes('solution') ||
           text.toLowerCase().includes('platform') ||
           text.toLowerCase().includes('feature');
  };

  // Get appropriate icon for each type of insight
  const getInsightIcon = (text: string) => {
    if (isMetric(text)) return <DollarSign className="h-5 w-5 text-emerald-500 shrink-0" />;
    if (isCompetitive(text)) return <Target className="h-5 w-5 text-blue-500 shrink-0" />;
    if (isGrowth(text)) return <LineChart className="h-5 w-5 text-violet-500 shrink-0" />;
    if (isProduct(text)) return <Lightbulb className="h-5 w-5 text-amber-500 shrink-0" />;
    
    // Default icon
    return <CheckCircle className="h-5 w-5 text-primary/70 shrink-0" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">{section?.title}</h1>

        <Card className="shadow-card border-0 mb-6 bg-gradient-to-br from-secondary/30 via-secondary/20 to-background">
          <CardHeader className="border-b pb-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <BookText className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl font-semibold">Key Insights</CardTitle>
              </div>
              <div className="flex items-center">
                <span className="text-xl font-bold mr-1">{section?.score.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">/5</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid grid-cols-1 gap-4">
              {isSectionMissing ? (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-rose-500/10">
                  <AlertTriangle className="h-5 w-5 mt-0.5 text-rose-500 shrink-0" />
                  <span className="text-sm leading-relaxed font-medium">This section appears to be missing from the pitch deck. Consider adding it to improve the overall quality of your presentation.</span>
                </div>
              ) : (
                contentBullets.map((bullet, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-4 rounded-lg transition-colors border border-transparent
                      ${isMetric(bullet) ? 'bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/20' : 
                        isCompetitive(bullet) ? 'bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/20' : 
                        isGrowth(bullet) ? 'bg-violet-500/5 hover:bg-violet-500/10 hover:border-violet-500/20' :
                        isProduct(bullet) ? 'bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/20' :
                        'bg-primary/5 hover:bg-primary/10 hover:border-primary/20'}`}
                  >
                    {getInsightIcon(bullet)}
                    <span className="text-sm leading-relaxed">{bullet}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strengths Card - Only show if section is not missing */}
          {!isSectionMissing && section?.strengths.length > 0 && (
            <Card className="shadow-card border-0 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent">
              <CardHeader className="border-b pb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  <CardTitle className="text-xl font-semibold">Strengths</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                <ul className="space-y-3">
                  {section.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start gap-2 group">
                      <div className="mt-1.5 shrink-0 rounded-full bg-emerald-100 p-1 group-hover:bg-emerald-200 transition-colors">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      </div>
                      <span className="text-sm">{strength}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          
          {/* Weaknesses Card - Always show this */}
          <Card className="shadow-card border-0 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-rose-500" />
                <CardTitle className="text-xl font-semibold">Weaknesses</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <ul className="space-y-3">
                {section?.weaknesses.map((weakness, index) => (
                  <li key={index} className="flex items-start gap-2 group">
                    <div className="mt-1.5 shrink-0 rounded-full bg-rose-100 p-1 group-hover:bg-rose-200 transition-colors">
                      <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    </div>
                    <span className="text-sm">{weakness}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
