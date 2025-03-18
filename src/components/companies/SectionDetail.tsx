
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookText, TrendingUp, TrendingDown, Building2, Users, DollarSign, BarChart3, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionDetailed } from "@/lib/api/apiContract";

interface SectionDetailProps {
  section: SectionDetailed | null;
  isLoading: boolean;
}

// Helper function to format description as bullet points
const formatDescriptionAsBullets = (description: string): string[] => {
  if (!description) return [];
  
  // Split on periods, semicolons, exclamation marks, question marks, line breaks
  const sentences = description.split(/(?<=[.;!?\n])\s+/);
  
  // Filter out empty sentences and trim each one
  return sentences
    .map(s => s.trim())
    .filter(s => s.length > 10) // Minimum length to be considered a point
    .map(s => s.endsWith('.') || s.endsWith(';') || s.endsWith('!') || s.endsWith('?') ? s : s + '.');
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

  // Format the detailed content as bullet points and categorize them
  const contentBullets = formatDescriptionAsBullets(section.detailedContent);
  
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">{section.title}</h1>

        <Card className="shadow-card border-0 mb-6 bg-gradient-to-br from-secondary/30 via-secondary/20 to-background">
          <CardHeader className="border-b pb-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <BookText className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl font-semibold">Key Insights</CardTitle>
              </div>
              <div className="flex items-center">
                <span className="text-xl font-bold mr-1">{section.score.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">/5</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid grid-cols-1 gap-4">
              {contentBullets.map((bullet, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg transition-colors
                    ${isMetric(bullet) ? 'bg-primary/5 hover:bg-primary/10' : 
                      isCompetitive(bullet) ? 'bg-blue-500/5 hover:bg-blue-500/10' : 
                      'hover:bg-secondary/10'}`}
                >
                  {isMetric(bullet) ? (
                    <DollarSign className="h-5 w-5 mt-0.5 text-emerald-500 shrink-0" />
                  ) : isCompetitive(bullet) ? (
                    <Target className="h-5 w-5 mt-0.5 text-blue-500 shrink-0" />
                  ) : (
                    <BarChart3 className="h-5 w-5 mt-0.5 text-primary/70 shrink-0" />
                  )}
                  <span className="text-sm leading-relaxed">{bullet}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strengths Card */}
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
                  <li key={index} className="flex items-start gap-2">
                    <div className="mt-1.5 shrink-0 rounded-full bg-emerald-100 p-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <span className="text-sm">{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          
          {/* Weaknesses Card */}
          <Card className="shadow-card border-0 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-rose-500" />
                <CardTitle className="text-xl font-semibold">Weaknesses</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <ul className="space-y-3">
                {section.weaknesses.map((weakness, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="mt-1.5 shrink-0 rounded-full bg-rose-100 p-1">
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
