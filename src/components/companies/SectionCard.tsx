
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, FileText, List } from "lucide-react";
import { Section } from "@/lib/api/apiContract";
import { SECTION_TYPE_MAPPINGS } from "@/lib/constants";

interface SectionCardProps {
  section: Section;
  onClick: () => void;
}

export function SectionCard({ section, onClick }: SectionCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-blue-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Average";
    return "Poor";
  };

  const isSlideNotesSection = section.type === "SLIDE_NOTES";
  const displayTitle = SECTION_TYPE_MAPPINGS[section.type as keyof typeof SECTION_TYPE_MAPPINGS] || section.title;

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-200 border border-border/50 hover:border-primary/20 group"
      onClick={onClick}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1">
            {isSlideNotesSection ? (
              <List className="h-5 w-5 text-primary flex-shrink-0" />
            ) : (
              <FileText className="h-5 w-5 text-primary flex-shrink-0" />
            )}
            <CardTitle className="text-lg font-semibold leading-tight">
              {displayTitle}
            </CardTitle>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {!isSlideNotesSection && (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Score</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{section.score}</span>
                <Badge 
                  variant="secondary" 
                  className={`${getScoreColor(section.score)} text-white`}
                >
                  {getScoreLabel(section.score)}
                </Badge>
              </div>
            </div>
            
            <Progress 
              value={section.score} 
              className="h-2 mb-4"
            />
          </>
        )}
        
        <p className="text-sm text-muted-foreground line-clamp-3">
          {isSlideNotesSection 
            ? "Detailed slide-by-slide analysis and recommendations for your pitch deck presentation."
            : section.description || "Click to view detailed analysis"
          }
        </p>
        
        {isSlideNotesSection && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <Badge variant="outline" className="text-xs">
              <List className="h-3 w-3 mr-1" />
              Slide Analysis
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
