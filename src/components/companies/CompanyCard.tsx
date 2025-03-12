
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Company } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";

interface CompanyCardProps {
  company: Company;
}

export function CompanyCard({ company }: CompanyCardProps) {
  return (
    <Link to={`/companies/${company.id}`} className="block hover:no-underline">
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-3">
            {company.logo_url && (
              <img 
                src={company.logo_url}
                alt={`${company.name} logo`}
                className="w-10 h-10 rounded-full object-cover"
              />
            )}
            <h3 className="font-semibold">{company.name}</h3>
          </div>
          <div className="text-2xl font-bold">{company.total_score}</div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Score</span>
              <span>{company.total_score}/100</span>
            </div>
            <Progress value={company.total_score} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
