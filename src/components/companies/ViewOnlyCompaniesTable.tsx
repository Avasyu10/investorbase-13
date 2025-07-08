
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Company } from "@/lib/api/apiContract";
import { formatDistanceToNow } from "date-fns";
import { Star, ArrowUpDown, ArrowUp, ArrowDown, FileText, ExternalLink } from "lucide-react";

interface ViewOnlyCompaniesTableProps {
  companies: Company[];
  onCompanyClick: (companyId: string) => void;
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  currentSort?: {
    field: string;
    order: 'asc' | 'desc';
  };
}

export function ViewOnlyCompaniesTable({
  companies,
  onCompanyClick,
  onSortChange,
  currentSort
}: ViewOnlyCompaniesTableProps) {
  const getScoreColor = (score: number): string => {
    if (score >= 75) return "text-green-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 50) return "text-amber-600";
    if (score >= 30) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBadgeColor = (score: number): string => {
    if (score >= 75) return "bg-green-100 text-green-900";
    if (score >= 70) return "bg-blue-100 text-blue-800";
    if (score >= 50) return "bg-amber-100 text-amber-800";
    if (score >= 30) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  const getSourceBadgeColor = (source: string): string => {
    switch (source) {
      case 'IIT Bombay':
        return "bg-blue-100 text-blue-800";
      case 'BITS':
        return "bg-purple-100 text-purple-800";
      case 'Founder':
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleSortClick = (field: string) => {
    if (!onSortChange) return;
    let newOrder: 'asc' | 'desc' = 'desc';
    if (currentSort?.field === field && currentSort?.order === 'desc') {
      newOrder = 'asc';
    }
    onSortChange(field, newOrder);
  };

  const getSortIcon = (field: string) => {
    if (!currentSort || currentSort.field !== field) {
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    }
    return currentSort.order === 'asc' ? <ArrowUp className="h-4 w-4 text-primary" /> : <ArrowDown className="h-4 w-4 text-primary" />;
  };

  const handlePdfClick = async (company: Company, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering company click
    
    if (!company.report_id) {
      console.log('No report ID available for company:', company.name);
      return;
    }

    try {
      // Use the report ID to construct the proper report viewer URL
      window.open(`/report/${report.pdf_url}`, '_blank');
    } catch (error) {
      console.error('Error opening deck:', error);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">All Companies</h3>
            <p className="text-sm text-muted-foreground">
              {companies.length} companies found from IIT Bombay, BITS, and Founder sources
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold w-[200px]">
                <Button variant="ghost" onClick={() => handleSortClick('name')} className="h-auto p-0 font-semibold hover:bg-transparent flex items-center gap-1">
                  Company Name
                  {getSortIcon('name')}
                </Button>
              </TableHead>
              <TableHead className="font-semibold w-[120px]">Source</TableHead>
              <TableHead className="font-semibold w-[150px]">Industry</TableHead>
              <TableHead className="font-semibold w-[100px]">
                <Button variant="ghost" onClick={() => handleSortClick('overall_score')} className="h-auto p-0 font-semibold hover:bg-transparent flex items-center gap-1">
                  Score
                  {getSortIcon('overall_score')}
                </Button>
              </TableHead>
              <TableHead className="font-semibold w-[100px]">Deck</TableHead>
              <TableHead className="font-semibold w-[120px]">
                <Button variant="ghost" onClick={() => handleSortClick('created_at')} className="h-auto p-0 font-semibold hover:bg-transparent flex items-center gap-1">
                  Created
                  {getSortIcon('created_at')}
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map(company => {
              const formattedScore = Math.round(company.overall_score);
              const industry = company.industry || "—";
              // Only show deck if company has a report_id (which means there's a report with PDF data)
              const showDeck = company.report_id;
              
              return (
                <TableRow key={company.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onCompanyClick(company.id)}>
                  <TableCell className="font-medium">
                    <span className="font-semibold text-foreground">{company.name}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={getSourceBadgeColor(company.source || 'Founder')}>
                      {company.source || 'Founder'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{industry}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge className={getScoreBadgeColor(formattedScore)}>
                        <span className={`font-semibold text-xs ${getScoreColor(formattedScore)}`}>
                          {formattedScore}
                        </span>
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {showDeck ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handlePdfClick(company, e)}
                        className="h-8 px-2 flex items-center gap-1 text-blue-600 hover:text-blue-800"
                      >
                        <FileText className="h-4 w-4" />
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(company.created_at!), {
                        addSuffix: true
                      })}
                    </span>
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
