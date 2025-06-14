
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Company } from "@/lib/api/apiContract";
import { format } from "date-fns";
import { Star } from "lucide-react";

interface CompaniesTableProps {
  companies: Company[];
  onCompanyClick: (companyId: string) => void;
  isIITBombay?: boolean;
}

export function CompaniesTable({ companies, onCompanyClick, isIITBombay = false }: CompaniesTableProps) {
  const getScoreColor = (score: number): string => {
    if (score >= 90) return "text-emerald-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 50) return "text-amber-600";
    if (score >= 30) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBadgeColor = (score: number): string => {
    if (score >= 90) return "bg-emerald-100 text-emerald-800";
    if (score >= 70) return "bg-blue-100 text-blue-800";
    if (score >= 50) return "bg-amber-100 text-amber-800";
    if (score >= 30) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  const getSummaryPoints = (assessmentPoints?: string[]): string[] => {
    if (!assessmentPoints || assessmentPoints.length === 0) {
      return [
        "Assessment analysis is being generated for this company.",
        "Initial evaluation shows potential for growth opportunities."
      ];
    }
    return assessmentPoints.slice(0, 2);
  };

  if (isIITBombay) {
    return (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Company Name</TableHead>
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Phone Number</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Industry</TableHead>
                <TableHead className="font-semibold">Score</TableHead>
                <TableHead className="font-semibold">Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => {
                const formattedScore = Math.round(company.overall_score);
                const summaryPoints = getSummaryPoints(company.assessment_points);
                
                return (
                  <TableRow 
                    key={company.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onCompanyClick(company.id)}
                  >
                    <TableCell className="font-medium">
                      {company.name}
                    </TableCell>
                    <TableCell>
                      {(company as any).poc_name || "—"}
                    </TableCell>
                    <TableCell>
                      {(company as any).phonenumber || "—"}
                    </TableCell>
                    <TableCell>
                      {(company as any).email || "—"}
                    </TableCell>
                    <TableCell>
                      {(company as any).industry || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <Badge className={getScoreBadgeColor(formattedScore)}>
                          <span className={`font-semibold ${getScoreColor(formattedScore)}`}>
                            {formattedScore}/100
                          </span>
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {summaryPoints.map((point, index) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <span className="text-primary mt-1">•</span>
                            <span className="text-muted-foreground line-clamp-2">{point}</span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  // Original table for non-IIT Bombay users
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold w-[120px]">Company</TableHead>
              <TableHead className="font-semibold w-[120px]">Core Score</TableHead>
              <TableHead className="font-semibold w-[100px]">Source</TableHead>
              <TableHead className="font-semibold w-[120px]">Date Added</TableHead>
              <TableHead className="font-semibold">Summary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => {
              const formattedScore = Math.round(company.overall_score);
              const summaryPoints = getSummaryPoints(company.assessment_points);
              
              return (
                <TableRow 
                  key={company.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => onCompanyClick(company.id)}
                >
                  <TableCell className="w-[200px]">
                    <div>
                      <div className="font-medium text-foreground">{company.name}</div>
                    </div>
                  </TableCell>
                  <TableCell className="w-[120px]">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <Badge className={getScoreBadgeColor(formattedScore)}>
                        <span className={`font-semibold ${getScoreColor(formattedScore)}`}>
                          {formattedScore}/100
                        </span>
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="w-[100px]">
                    <Badge variant="outline" className="capitalize">
                      {company.source || 'Dashboard'}
                    </Badge>
                  </TableCell>
                  <TableCell className="w-[120px] text-muted-foreground">
                    {format(new Date(company.created_at || ''), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {summaryPoints.map((point, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <span className="text-primary mt-1">•</span>
                          <span className="text-muted-foreground line-clamp-2">{point}</span>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
