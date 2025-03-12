
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Section } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";

interface SectionCardProps {
  section: Section;
  companyId: string;
}

export function SectionCard({ section, companyId }: SectionCardProps) {
  return (
    <Link to={`/companies/${companyId}/sections/${section.id}`} className="block hover:no-underline">
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="font-semibold">{section.name}</h3>
          <div className="text-2xl font-bold">{section.score}</div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Score</span>
              <span>{section.score}/{section.max_score}</span>
            </div>
            <Progress value={(section.score / section.max_score) * 100} className="h-2" />
            {section.description && (
              <p className="text-sm text-muted-foreground mt-2">{section.description}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
