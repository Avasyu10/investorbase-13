
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Company } from "@/lib/api/apiContract";
import { format } from "date-fns";
import { Star, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface CompaniesTableProps {
  companies: Company[];
  onCompanyClick: (companyId: number) => void;
}

export function CompaniesTable({ companies, onCompanyClick }: CompaniesTableProps) {
  const [expandedCompanies, setExpandedCompanies] = useState<Set<number>>(new Set());

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

  const toggleExpanded = (companyId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedCompanies);
    if (newExpanded.has(companyId)) {
      newExpanded.delete(companyId);
    } else {
      newExpanded.add(companyId);
    }
    setExpandedCompanies(newExpanded);
  };

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold w-8"></TableHead>
              <TableHead className="font-semibold">Company</TableHead>
              <TableHead className="font-semibold">Core Score</TableHead>
              <TableHead className="font-semibold">Source</TableHead>
              <TableHead className="font-semibold">Date Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => {
              const formattedScore = Math.round(company.overallScore);
              const isExpanded = expandedCompanies.has(company.id);
              
              return (
                <>
                  <TableRow 
                    key={company.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onCompanyClick(company.id)}
                  >
                    <TableCell>
                      <button
                        onClick={(e) => toggleExpanded(company.id, e)}
                        className="p-1 hover:bg-muted rounded"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </TableCell>
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
                  {isExpanded && (
                    <TableRow key={`${company.id}-summary`}>
                      <TableCell colSpan={5} className="bg-muted/20 p-4">
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Assessment Summary</h4>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {company.assessmentPoints && company.assessmentPoints.length > 0 ? (
                              company.assessmentPoints.slice(0, 3).map((point, index) => (
                                <div key={index} className="flex items-start gap-2">
                                  <span className="text-primary">•</span>
                                  <span>{point}</span>
                                </div>
                              ))
                            ) : (
                              <div className="flex items-start gap-2">
                                <span className="text-primary">•</span>
                                <span>Assessment analysis is being generated for this company.</span>
                              </div>
                            )}
                          </div>
                          {company.assessmentPoints && company.assessmentPoints.length > 3 && (
                            <button
                              onClick={() => onCompanyClick(company.id)}
                              className="text-xs text-primary hover:underline"
                            >
                              View full analysis →
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
