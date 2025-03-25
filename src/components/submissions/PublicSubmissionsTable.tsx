
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
  // Add detailed logging to see exactly what's coming in
  
  if (!submissions) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No submissions provided</p>
      </div>
    );
  }

  if (!Array.isArray(submissions)) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Invalid submissions data</p>
      </div>
    );
  }
  
  // Check if each type exists
  const emailCount = submissions.filter(s => s.source === 'email').length;
  const pitchCount = submissions.filter(s => s.source === 'email_pitch').length;
  const formCount = submissions.filter(s => s.source === 'public_form').length;
  
  console.log(`Sources breakdown - Email: ${emailCount}, Pitch: ${pitchCount}, Form: ${formCount}`);
  
  if (submissions.length === 0) {
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
      console.error("Date formatting error:", error, "for date:", dateString);
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
            variant="pink"
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
          {submissions.map((submission) => (
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
