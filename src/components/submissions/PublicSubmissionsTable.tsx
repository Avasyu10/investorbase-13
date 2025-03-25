
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
import { FileText, Mail, Send, ExternalLink } from "lucide-react";

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
  source: "email" | "email_pitch" | "public_form";
  from_email?: string | null;
}

interface PublicSubmissionsTableProps {
  submissions: PublicSubmission[];
  onAnalyze: (submission: PublicSubmission) => void;
}

export function PublicSubmissionsTable({ submissions, onAnalyze }: PublicSubmissionsTableProps) {
  // Add logging to see what we receive
  console.log("PublicSubmissionsTable - All submissions received:", submissions.map(s => ({
    id: s.id,
    title: s.title,
    source: s.source,
    created_at: s.created_at
  })));
  
  // Check if each type exists
  const emailCount = submissions.filter(s => s.source === 'email').length;
  const pitchCount = submissions.filter(s => s.source === 'email_pitch').length;
  const formCount = submissions.filter(s => s.source === 'public_form').length;
  
  console.log(`PublicSubmissionsTable - Submission counts by type: email=${emailCount}, email_pitch=${pitchCount}, public_form=${formCount}`);
  
  // Create a copy of submissions to ensure nothing is lost
  const submissionsToRender = [...submissions];
  
  console.log("PublicSubmissionsTable - Submissions to render:", submissionsToRender.length);
  
  if (!submissionsToRender || submissionsToRender.length === 0) {
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

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'email':
        return (
          <Badge 
            variant="blue"
            className="flex items-center gap-1 font-medium px-2 py-1 w-fit"
          >
            <Mail className="h-3 w-3" />
            <span>Email</span>
          </Badge>
        );
      case 'email_pitch':
        return (
          <Badge 
            variant="gold"
            className="flex items-center gap-1 font-medium px-2 py-1 w-fit"
          >
            <Send className="h-3 w-3" />
            <span>Pitch Email</span>
          </Badge>
        );
      case 'public_form':
      default:
        return (
          <Badge 
            variant="green"
            className="flex items-center gap-1 font-medium px-2 py-1 w-fit"
          >
            <FileText className="h-3 w-3" />
            <span>Public Form</span>
          </Badge>
        );
    }
  };

  // Add more logging right before rendering
  console.log("PublicSubmissionsTable - Final render - Submissions count:", submissionsToRender.length);
  console.log("PublicSubmissionsTable - Email pitch submissions to render:", 
    submissionsToRender.filter(s => s.source === 'email_pitch').length);
  
  // Log each email pitch submission to verify they're properly formatted
  submissionsToRender.filter(s => s.source === 'email_pitch').forEach((submission, index) => {
    console.log(`PublicSubmissionsTable - Email pitch ${index} for render:`, {
      id: submission.id,
      title: submission.title,
      source: submission.source,
      created_at: submission.created_at,
      report_id: submission.report_id
    });
  });

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/6">Source</TableHead>
            <TableHead className="w-1/5">Title</TableHead>
            <TableHead className="w-1/6">Industry</TableHead>
            <TableHead className="w-1/6">Stage</TableHead>
            <TableHead className="w-1/6">Website</TableHead>
            <TableHead className="w-1/6">Submitted</TableHead>
            <TableHead className="w-1/6 text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissionsToRender.map((submission) => {
            console.log(`Rendering row for submission: ${submission.id}, source: ${submission.source}, title: ${submission.title}`);
            return (
              <TableRow key={submission.id}>
                <TableCell>
                  {getSourceBadge(submission.source)}
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
                      className="text-blue-500 hover:underline flex items-center gap-1"
                    >
                      {new URL(submission.website_url.startsWith('http') ? submission.website_url : `https://${submission.website_url}`).hostname}
                      <ExternalLink className="h-3 w-3" />
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
                  >
                    Analyze
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
