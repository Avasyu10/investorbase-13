
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { CompanyListItem } from "@/lib/api/apiContract";
import { cn } from "@/lib/utils";

interface CompaniesTableProps {
  companies: CompanyListItem[];
  onCompanyClick: (companyId: number) => void;
}

export function CompaniesTable({ companies, onCompanyClick }: CompaniesTableProps) {
  if (!companies || companies.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No companies found</p>
      </div>
    );
  }

  // Helper to get score color class
  const getScoreColorClass = (score: number) => {
    if (score >= 4) return "text-green-600 font-medium";
    if (score >= 3) return "text-blue-600";
    if (score >= 2) return "text-yellow-600"; 
    return "text-red-600";
  };

  // Helper to get assessment summary
  const getAssessmentSummary = (company: CompanyListItem) => {
    // First check if there is a summary in the description field of the first report
    // Fall back to assessment points if available
    if ('assessmentPoints' in company && company.assessmentPoints && company.assessmentPoints.length > 0) {
      // Return up to 2 assessment points with ellipsis if more exist
      const points = company.assessmentPoints.slice(0, 2);
      const summary = points.join(', ');
      return company.assessmentPoints.length > 2 
        ? `${summary}, ...` 
        : summary;
    }
    
    return "No summary available";
  };

  // Helper to get source info with appropriate styling
  const getSourceInfo = (source: string | undefined) => {
    if (source === 'public_form') {
      return {
        label: "Public URL",
        className: "text-sm text-green-600 font-medium"
      };
    }
    if (source === 'email') {
      return {
        label: "Email", 
        className: "text-sm text-blue-600 font-medium"
      };
    }
    
    // Default to Dashboard (gold color)
    return {
      label: "Dashboard",
      className: "text-sm text-gold font-medium"
    };
  };

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/5">
              Name
            </TableHead>
            <TableHead className="w-1/6">
              Score
            </TableHead>
            <TableHead className="w-1/6">
              Source
            </TableHead>
            <TableHead className="w-1/6">
              Date Added
            </TableHead>
            <TableHead className="w-2/5">
              Summary
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => {
            const sourceInfo = getSourceInfo(company.source);
            return (
              <TableRow 
                key={company.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onCompanyClick(company.id)}
              >
                <TableCell className="font-medium">{company.name}</TableCell>
                <TableCell className={getScoreColorClass(company.overallScore)}>
                  {company.overallScore}/5
                </TableCell>
                <TableCell>
                  <span className={sourceInfo.className}>{sourceInfo.label}</span>
                </TableCell>
                <TableCell>{new Date(company.createdAt).toLocaleDateString()}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {getAssessmentSummary(company)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
