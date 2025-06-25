
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import type { Company } from "@/types/company";

interface IITBombayCompaniesListProps {
  companies: Company[];
  onCompanyClick: (company: Company) => void;
}

export function IITBombayCompaniesList({ companies, onCompanyClick }: IITBombayCompaniesListProps) {
  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 60) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const getRecommendationBadge = (score: number) => {
    if (score >= 75) return <Badge className="bg-green-100 text-green-800 border-green-200">Accept</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Consider</Badge>;
    return <Badge className="bg-red-100 text-red-800 border-red-200">Reject</Badge>;
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company Name</TableHead>
            <TableHead>Industry</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Reason for Scoring</TableHead>
            <TableHead>Recommendation</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Submitted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => (
            <TableRow 
              key={company.id} 
              className="hover:bg-muted/50 cursor-pointer"
              onClick={() => onCompanyClick(company)}
            >
              <TableCell className="font-medium">
                {company.name}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {company.industry || 'Not specified'}
              </TableCell>
              <TableCell>
                <Badge 
                  variant="outline" 
                  className={getScoreBadgeColor(company.overall_score || 0)}
                >
                  {company.overall_score || 0}/100
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground max-w-xs">
                <div className="truncate" title={company.scoring_reason || 'No reason provided'}>
                  {company.scoring_reason || 'No reason provided'}
                </div>
              </TableCell>
              <TableCell>
                {getRecommendationBadge(company.overall_score || 0)}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="capitalize">
                  {company.source === 'eureka_form' ? 'Eureka Form' : company.source}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDistanceToNow(new Date(company.created_at), { addSuffix: true })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
