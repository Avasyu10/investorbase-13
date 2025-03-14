
import { Progress } from "@/components/ui/progress";

interface ProgressIndicatorProps {
  progressStage: string;
  progress: number;
  isScrapingWebsite: boolean;
  isAnalyzing: boolean;
}

export function ProgressIndicator({
  progressStage,
  progress,
  isScrapingWebsite,
  isAnalyzing
}: ProgressIndicatorProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="text-sm font-medium">{progressStage}</span>
        <span className="text-sm text-muted-foreground">{progress}%</span>
      </div>
      <Progress value={progress} className="h-2" />
      <p className="text-xs text-muted-foreground italic mt-1">
        {isScrapingWebsite && "Scraping website content..."}
        {isAnalyzing && "AI analysis may take a few minutes. Please be patient..."}
      </p>
    </div>
  );
}
