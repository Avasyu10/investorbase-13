
import { SectionData } from "@/lib/companyData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface SectionCardProps {
  section: SectionData;
  onClick: () => void;
}

export function SectionCard({ section, onClick }: SectionCardProps) {
  return (
    <Card 
      className="cursor-pointer transition-all hover:shadow-md"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{section.title}</CardTitle>
        <CardDescription>Score: {section.score}/5</CardDescription>
      </CardHeader>
      <CardContent>
        <Progress 
          value={section.score * 20} 
          className="h-2 mb-2" 
        />
        <p className="text-sm text-muted-foreground truncate">
          {section.description}
        </p>
      </CardContent>
    </Card>
  );
}
