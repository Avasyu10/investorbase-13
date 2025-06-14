
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, ExternalLink } from "lucide-react";
import { format } from "date-fns";

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
  source: "email" | "email_pitch" | "public_form" | "barc_form";
  from_email?: string | null;
}

interface PublicSubmissionsTableProps {
  submissions: PublicSubmission[];
  onAnalyze: (submission: PublicSubmission) => void;
  analyzingSubmissions: Set<string>;
  isIITBombay?: boolean;
}

export function PublicSubmissionsTable({ 
  submissions, 
  onAnalyze, 
  analyzingSubmissions,
  isIITBombay = false 
}: PublicSubmissionsTableProps) {
  const getSourceBadgeColor = (source: string): string => {
    switch (source) {
      case "email":
        return "bg-blue-100 text-blue-800";
      case "email_pitch":
        return "bg-purple-100 text-purple-800";
      case "public_form":
        return "bg-green-100 text-green-800";
      case "barc_form":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getSourceLabel = (source: string): string => {
    switch (source) {
      case "email":
        return "Email";
      case "email_pitch":
        return "Email Pitch";
      case "public_form":
        return "Public Form";
      case "barc_form":
        return "BARC Form";
      default:
        return source;
    }
  };

  if (submissions.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-card/50">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">No applications found</h3>
        <p className="mt-2 text-muted-foreground">
          New applications will appear here when they are submitted.
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Title</TableHead>
              <TableHead className="font-semibold">Description</TableHead>
              {!isIITBombay && <TableHead className="font-semibold">Source</TableHead>}
              <TableHead className="font-semibold">Date Submitted</TableHead>
              <TableHead className="font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.map((submission) => (
              <TableRow key={submission.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span>{submission.title}</span>
                    {submission.pdf_url && (
                      <a
                        href={submission.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-md">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {submission.description || "No description available"}
                    </p>
                    {submission.from_email && (
                      <p className="text-xs text-muted-foreground mt-1">
                        From: {submission.from_email}
                      </p>
                    )}
                  </div>
                </TableCell>
                {!isIITBombay && (
                  <TableCell>
                    <Badge className={getSourceBadgeColor(submission.source)}>
                      {getSourceLabel(submission.source)}
                    </Badge>
                  </TableCell>
                )}
                <TableCell className="text-muted-foreground">
                  {format(new Date(submission.created_at), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell>
                  <Button
                    onClick={() => onAnalyze(submission)}
                    disabled={analyzingSubmissions.has(submission.id)}
                    size="sm"
                  >
                    {analyzingSubmissions.has(submission.id) ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      "Analyze"
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
