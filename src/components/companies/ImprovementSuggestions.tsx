
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, Users, DollarSign, Target, BarChart } from "lucide-react";

interface ImprovementSuggestionsProps {
  suggestions: string[];
  companyName: string;
}

const getIconForSuggestion = (suggestion: string) => {
  const lowerSuggestion = suggestion.toLowerCase();
  
  if (lowerSuggestion.includes('market') || lowerSuggestion.includes('tam') || lowerSuggestion.includes('sam')) {
    return <Target className="h-4 w-4 text-blue-500" />;
  }
  if (lowerSuggestion.includes('financial') || lowerSuggestion.includes('revenue') || lowerSuggestion.includes('projection')) {
    return <DollarSign className="h-4 w-4 text-green-500" />;
  }
  if (lowerSuggestion.includes('team') || lowerSuggestion.includes('founder') || lowerSuggestion.includes('advisor')) {
    return <Users className="h-4 w-4 text-purple-500" />;
  }
  if (lowerSuggestion.includes('traction') || lowerSuggestion.includes('growth') || lowerSuggestion.includes('metric')) {
    return <TrendingUp className="h-4 w-4 text-orange-500" />;
  }
  if (lowerSuggestion.includes('chart') || lowerSuggestion.includes('graph') || lowerSuggestion.includes('visual')) {
    return <BarChart className="h-4 w-4 text-indigo-500" />;
  }
  
  return <Lightbulb className="h-4 w-4 text-yellow-500" />;
};

const getCategoryForSuggestion = (suggestion: string) => {
  const lowerSuggestion = suggestion.toLowerCase();
  
  if (lowerSuggestion.includes('market') || lowerSuggestion.includes('tam') || lowerSuggestion.includes('sam')) {
    return { label: 'Market Analysis', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' };
  }
  if (lowerSuggestion.includes('financial') || lowerSuggestion.includes('revenue') || lowerSuggestion.includes('projection')) {
    return { label: 'Financials', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
  }
  if (lowerSuggestion.includes('team') || lowerSuggestion.includes('founder') || lowerSuggestion.includes('advisor')) {
    return { label: 'Team', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' };
  }
  if (lowerSuggestion.includes('traction') || lowerSuggestion.includes('growth') || lowerSuggestion.includes('metric')) {
    return { label: 'Traction', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' };
  }
  if (lowerSuggestion.includes('chart') || lowerSuggestion.includes('graph') || lowerSuggestion.includes('visual')) {
    return { label: 'Design', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' };
  }
  
  return { label: 'General', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' };
};

export const ImprovementSuggestions = ({ suggestions, companyName }: ImprovementSuggestionsProps) => {
  if (!suggestions || suggestions.length === 0) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Improvement Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No specific improvement suggestions available for this pitch deck.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          Improvement Suggestions
          <Badge variant="secondary" className="ml-2">
            {suggestions.length} Recommendations
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Actionable recommendations to enhance {companyName}'s pitch deck and strengthen their investment case.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {suggestions.map((suggestion, index) => {
            const category = getCategoryForSuggestion(suggestion);
            const icon = getIconForSuggestion(suggestion);
            
            return (
              <div
                key={index}
                className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className={category.color}>
                      {category.label}
                    </Badge>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground">
                    {suggestion}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Implementation Tip
            </span>
          </div>
          <p className="text-xs text-blue-800 dark:text-blue-200">
            Focus on addressing the most critical gaps first, particularly those related to market sizing, 
            financial projections, and competitive differentiation, as these are often key areas investors scrutinize.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
