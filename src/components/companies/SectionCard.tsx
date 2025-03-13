
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SectionBase } from "@/lib/api/apiContract";

interface SectionCardProps {
  section: SectionBase | any;
  onClick: () => void;
}

export function SectionCard({ section, onClick }: SectionCardProps) {
  return (
    <Card 
      className="cursor-pointer transition-all hover:shadow-md h-full"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg">{section.title}</CardTitle>
        <CardDescription>Score: {section.score}/5</CardDescription>
      </CardHeader>
      <CardContent>
        <Progress 
          value={section.score * 20} 
          className="h-2 mb-2" 
        />
        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
          {section.description}
        </p>
      </CardContent>
    </Card>
  );
}
