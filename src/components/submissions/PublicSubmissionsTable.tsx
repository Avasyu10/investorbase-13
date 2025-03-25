
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, FileText, Mail, Globe } from "lucide-react";
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
  source: "email" | "public_form";
  from_email?: string | null;
}

interface PublicSubmissionsTableProps {
  submissions: PublicSubmission[];
  onAnalyze: (submission: PublicSubmission) => void;
}

export function PublicSubmissionsTable({ submissions, onAnalyze }: PublicSubmissionsTableProps) {
  // Helper function to get source icon
  const getSourceIcon = (source: "email" | "public_form") => {
    if (source === "email") return <Mail className="h-4 w-4 mr-1" />;
    return <Globe className="h-4 w-4 mr-1" />;
  };

  // Helper function to get source label
  const getSourceLabel = (source: "email" | "public_form") => {
    if (source === "email") return "Email";
    return "Public Form";
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Source</TableHead>
            <TableHead>Company</TableHead>
            <TableHead className="hidden md:table-cell">Info</TableHead>
            <TableHead className="hidden lg:table-cell">Received</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.map((submission) => (
            <TableRow key={submission.id}>
              <TableCell>
                <div className="flex items-center">
                  <Badge variant="outline" className="flex items-center">
                    {getSourceIcon(submission.source)}
                    {getSourceLabel(submission.source)}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span className="truncate max-w-[200px]">{submission.title}</span>
                  {submission.from_email && (
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {submission.from_email}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="flex flex-col">
                  {submission.industry && (
                    <span className="text-sm">{submission.industry}</span>
                  )}
                  {submission.company_stage && (
                    <span className="text-xs text-muted-foreground">
                      {submission.company_stage}
                    </span>
                  )}
                  {!submission.industry && !submission.company_stage && (
                    <span className="text-xs text-muted-foreground italic">
                      No additional info
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="hidden lg:table-cell text-muted-foreground">
                {formatDistanceToNow(new Date(submission.created_at), {
                  addSuffix: true,
                })}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => onAnalyze(submission)}
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Analyze</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
