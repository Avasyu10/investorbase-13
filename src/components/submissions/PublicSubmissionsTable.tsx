
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface PublicSubmission {
  id: string;
  title: string;
  description: string | null;
  company_stage: string | null;
  industry: string | null;
  website_url: string | null;
  created_at: string;
  form_slug: string;
  pdf_url: string | null;
  report_id: string | null;
  source?: string;
}

interface PublicSubmissionsTableProps {
  submissions: PublicSubmission[];
  onAnalyze: (submission: PublicSubmission) => void;
}

export function PublicSubmissionsTable({ submissions, onAnalyze }: PublicSubmissionsTableProps) {
  if (!submissions || submissions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No submissions found</p>
      </div>
    );
  }

  const truncateText = (text: string | null, maxLength: number) => {
    if (!text) return "—";
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return dateString;
    }
  };

  const getSourceBadge = (submission: PublicSubmission) => {
    if (submission.form_slug === 'email-submission' || submission.source === 'Email') {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          Email
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
        Form
      </Badge>
    );
  };

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[3%]">Source</TableHead>
            <TableHead className="w-[25%]">Title</TableHead>
            <TableHead className="w-[15%]">Industry</TableHead>
            <TableHead className="w-[15%]">Stage</TableHead>
            <TableHead className="w-[15%]">Website</TableHead>
            <TableHead className="w-[15%]">Submitted</TableHead>
            <TableHead className="w-[12%] text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.map((submission) => (
            <TableRow key={submission.id}>
              <TableCell>
                {getSourceBadge(submission)}
              </TableCell>
              <TableCell className="font-medium">
                {truncateText(submission.title, 30)}
              </TableCell>
              <TableCell>
                {submission.industry || "—"}
              </TableCell>
              <TableCell>
                {submission.company_stage || "—"}
              </TableCell>
              <TableCell>
                {submission.website_url ? (
                  <a 
                    href={submission.website_url.startsWith('http') ? submission.website_url : `https://${submission.website_url}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {new URL(submission.website_url.startsWith('http') ? submission.website_url : `https://${submission.website_url}`).hostname}
                  </a>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>
                {formatDate(submission.created_at)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  className="bg-gold text-gold-foreground hover:bg-gold/90"
                  size="sm"
                  onClick={() => onAnalyze(submission)}
                  disabled={!submission.report_id}
                >
                  Analyze
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
