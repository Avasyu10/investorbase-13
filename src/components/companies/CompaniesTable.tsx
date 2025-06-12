
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Company } from "@/lib/api/apiContract";
import { format } from "date-fns";
import { Star } from "lucide-react";

interface CompaniesTableProps {
  companies: Company[];
  onCompanyClick: (companyId: number) => void;
}

export function CompaniesTable({ companies, onCompanyClick }: CompaniesTableProps) {
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

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Company</TableHead>
              <TableHead className="font-semibold">Core Score</TableHead>
              <TableHead className="font-semibold">Source</TableHead>
              <TableHead className="font-semibold">Date Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => {
              const formattedScore = Math.round(company.overallScore);
              
              return (
                <TableRow 
                  key={company.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => onCompanyClick(company.id)}
                >
                  <TableCell>
                    <div>
                      <div className="font-medium text-foreground">{company.name}</div>
                    </div>
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
                    <Badge variant="outline" className="capitalize">
                      {company.source || 'Dashboard'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(company.createdAt), 'MMM dd, yyyy')}
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
