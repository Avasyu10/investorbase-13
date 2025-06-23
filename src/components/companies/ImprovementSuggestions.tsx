
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, TrendingUp, Users, DollarSign, Target, BarChart3 } from "lucide-react";

interface ImprovementSuggestionsProps {
  reportId: string;
  companyName: string;
}

export function ImprovementSuggestions({ reportId, companyName }: ImprovementSuggestionsProps) {
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string>('');

  React.useEffect(() => {
    const generateImprovementSuggestions = async () => {
      if (!reportId) return;
      
      try {
        setLoading(true);
        setError('');
        
        console.log('Generating improvement suggestions for report:', reportId);
        
        // Call the analyze-pdf function with improvement suggestions prompt
        const { data, error: analysisError } = await supabase.functions.invoke('analyze-pdf', {
          body: { 
            reportId,
            analysisType: 'improvement_suggestions',
            companyName
          }
        });

        if (analysisError) {
          console.error('Error generating improvement suggestions:', analysisError);
          throw new Error(analysisError.message || 'Failed to generate suggestions');
        }

        if (data?.suggestions && Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions);
          console.log('Improvement suggestions generated:', data.suggestions.length);
        } else {
          console.warn('No suggestions returned from analysis');
          setSuggestions([]);
        }
        
      } catch (err) {
        console.error('Error in generateImprovementSuggestions:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate improvement suggestions');
      } finally {
        setLoading(false);
      }
    };

    generateImprovementSuggestions();
  }, [reportId, companyName]);

  const getIconForSuggestion = (suggestion: string) => {
    const lowerSuggestion = suggestion.toLowerCase();
    if (lowerSuggestion.includes('market') || lowerSuggestion.includes('tam') || lowerSuggestion.includes('sam')) {
      return <BarChart3 className="h-4 w-4 text-blue-600" />;
    }
    if (lowerSuggestion.includes('financial') || lowerSuggestion.includes('revenue') || lowerSuggestion.includes('funding')) {
      return <DollarSign className="h-4 w-4 text-green-600" />;
    }
    if (lowerSuggestion.includes('team') || lowerSuggestion.includes('founder') || lowerSuggestion.includes('experience')) {
      return <Users className="h-4 w-4 text-purple-600" />;
    }
    if (lowerSuggestion.includes('traction') || lowerSuggestion.includes('growth') || lowerSuggestion.includes('metrics')) {
      return <TrendingUp className="h-4 w-4 text-orange-600" />;
    }
    if (lowerSuggestion.includes('competitive') || lowerSuggestion.includes('positioning')) {
      return <Target className="h-4 w-4 text-red-600" />;
    }
    return <Lightbulb className="h-4 w-4 text-yellow-600" />;
  };

  if (loading) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            Improvement Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3">Analyzing deck for improvement opportunities...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            Improvement Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <p className="text-sm text-muted-foreground">
              Unable to generate improvement suggestions at this time.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-600" />
          Improvement Suggestions
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Actionable recommendations to strengthen your pitch deck based on market best practices and investor expectations.
        </p>
      </CardHeader>
      <CardContent>
        {suggestions.length > 0 ? (
          <div className="space-y-4">
            {suggestions.map((suggestion, index) => (
              <div key={index} className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                {getIconForSuggestion(suggestion)}
                <div className="flex-1">
                  <p className="text-sm leading-relaxed">{suggestion}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Specific Improvements Identified</h3>
            <p className="text-muted-foreground">
              The pitch deck appears to cover the essential elements well. Continue refining the content and presentation quality.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
