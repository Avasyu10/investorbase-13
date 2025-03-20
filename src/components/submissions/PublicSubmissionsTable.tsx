
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/5">Title</TableHead>
            <TableHead className="w-1/6">Industry</TableHead>
            <TableHead className="w-1/6">Stage</TableHead>
            <TableHead className="w-1/6">Website</TableHead>
            <TableHead className="w-1/6">Submitted</TableHead>
            <TableHead className="w-1/6 text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.map((submission) => (
            <TableRow key={submission.id}>
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
                  variant="outline"
                  size="sm"
                  onClick={() => onAnalyze(submission)}
                  disabled={!submission.report_id}
                >
                  <Play className="h-4 w-4 mr-1" />
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
