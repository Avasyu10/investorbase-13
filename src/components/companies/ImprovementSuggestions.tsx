
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, Users, DollarSign, Target, BarChart } from "lucide-react";

interface ImprovementSuggestionsProps {
  suggestions: string[];
  companyName: string;
}

const getIconForCategory = (category: string) => {
  switch (category) {
    case 'Market Analysis':
      return <Target className="h-4 w-4 text-blue-500" />;
    case 'Financials':
      return <DollarSign className="h-4 w-4 text-green-500" />;
    case 'Team':
      return <Users className="h-4 w-4 text-purple-500" />;
    case 'Traction':
      return <TrendingUp className="h-4 w-4 text-orange-500" />;
    case 'Design':
      return <BarChart className="h-4 w-4 text-indigo-500" />;
    default:
      return <Lightbulb className="h-4 w-4 text-yellow-500" />;
  }
};

const getCategoryForSuggestion = (suggestion: string) => {
  const lowerSuggestion = suggestion.toLowerCase();
  
  if (lowerSuggestion.includes('market') || lowerSuggestion.includes('tam') || lowerSuggestion.includes('sam')) {
    return 'Market Analysis';
  }
  if (lowerSuggestion.includes('financial') || lowerSuggestion.includes('revenue') || lowerSuggestion.includes('projection')) {
    return 'Financials';
  }
  if (lowerSuggestion.includes('team') || lowerSuggestion.includes('founder') || lowerSuggestion.includes('advisor')) {
    return 'Team';
  }
  if (lowerSuggestion.includes('traction') || lowerSuggestion.includes('growth') || lowerSuggestion.includes('metric')) {
    return 'Traction';
  }
  if (lowerSuggestion.includes('chart') || lowerSuggestion.includes('graph') || lowerSuggestion.includes('visual')) {
    return 'Design';
  }
  
  return 'General';
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Market Analysis':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'Financials':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'Team':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'Traction':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'Design':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
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

  // Group suggestions by category
  const groupedSuggestions = suggestions.reduce((groups, suggestion) => {
    const category = getCategoryForSuggestion(suggestion);
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(suggestion);
    return groups;
  }, {} as Record<string, string[]>);

  // Sort categories to show most important first
  const categoryOrder = ['Market Analysis', 'Financials', 'Team', 'Traction', 'Design', 'General'];
  const sortedCategories = Object.keys(groupedSuggestions).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

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
        <div className="space-y-6">
          {sortedCategories.map((category) => (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-3 pb-2 border-b border-border">
                {getIconForCategory(category)}
                <h3 className="text-lg font-semibold">{category}</h3>
                <Badge variant="outline" className={getCategoryColor(category)}>
                  {groupedSuggestions[category].length} items
                </Badge>
              </div>
              
              <div className="space-y-3 ml-7">
                {groupedSuggestions[category].map((suggestion, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <p className="text-sm leading-relaxed text-foreground">
                      {suggestion}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
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
