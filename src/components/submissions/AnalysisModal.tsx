
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, Mail, FileText, Globe, Building2, User, Phone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { CombinedSubmission } from "./types";

interface AnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: CombinedSubmission | null;
}

export function AnalysisModal({ open, onOpenChange, submission }: AnalysisModalProps) {
  if (!submission) return null;

  const isPublicSubmission = submission.source === 'public_form';
  const isEmailSubmission = submission.source === 'email';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {submission.company_name}
            <Badge variant="outline" className="ml-2">
              {submission.source === 'public_form' ? 'Public Form' : 'Email'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Contact Information
              </h3>
              <p className="text-sm text-muted-foreground">
                Email: {submission.submitter_email}
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Submitted: {formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })}
              </p>
            </div>

            {submission.analysis_status && (
              <div className="space-y-2">
                <h3 className="font-semibold">Analysis Status</h3>
                <Badge 
                  variant={
                    submission.analysis_status === 'completed' ? 'default' : 
                    submission.analysis_status === 'processing' ? 'secondary' : 
                    'destructive'
                  }
                >
                  {submission.analysis_status}
                </Badge>
              </div>
            )}
          </div>

          {/* Public Form Specific Fields */}
          {isPublicSubmission && 'title' in submission && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Submission Details</h3>
                <p className="text-sm"><strong>Title:</strong> {submission.title}</p>
                {submission.description && (
                  <p className="text-sm mt-2"><strong>Description:</strong> {submission.description}</p>
                )}
              </div>

              {(submission.company_stage || submission.industry) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {submission.company_stage && (
                    <div>
                      <h4 className="font-medium mb-1">Company Stage</h4>
                      <p className="text-sm text-muted-foreground">{submission.company_stage}</p>
                    </div>
                  )}
                  {submission.industry && (
                    <div>
                      <h4 className="font-medium mb-1">Industry</h4>
                      <p className="text-sm text-muted-foreground">{submission.industry}</p>
                    </div>
                  )}
                </div>
              )}

              {(submission.founder_name || submission.founder_email) && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Founder Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {submission.founder_name && (
                      <p className="text-sm"><strong>Name:</strong> {submission.founder_name}</p>
                    )}
                    {submission.founder_email && (
                      <p className="text-sm"><strong>Email:</strong> {submission.founder_email}</p>
                    )}
                  </div>
                </div>
              )}

              {submission.website_url && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Website
                  </h3>
                  <a 
                    href={submission.website_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    {submission.website_url}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Email Submission Specific Fields */}
          {isEmailSubmission && 'sender_email' in submission && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Email Details</h3>
                <p className="text-sm"><strong>Sender:</strong> {submission.sender_email}</p>
                {submission.has_attachment && (
                  <Badge variant="outline" className="mt-2">
                    Has Attachment
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Form Slug */}
          {submission.form_slug && (
            <div>
              <h3 className="font-semibold mb-2">Form</h3>
              <p className="text-sm text-muted-foreground">{submission.form_slug}</p>
            </div>
          )}

          {/* Analysis Result */}
          {submission.analysis_result && (
            <div>
              <h3 className="font-semibold mb-2">Analysis Result</h3>
              <div className="bg-muted p-4 rounded-lg">
                <pre className="text-sm whitespace-pre-wrap overflow-auto">
                  {JSON.stringify(submission.analysis_result, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
