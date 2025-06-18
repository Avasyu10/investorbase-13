
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, Mail, Building2, User, Phone, Globe } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { CombinedSubmission } from "./types";

interface BarcAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: CombinedSubmission | null;
}

export function BarcAnalysisModal({ open, onOpenChange, submission }: BarcAnalysisModalProps) {
  if (!submission) return null;

  const isBarcSubmission = submission.source === 'barc_form';
  const isEurekaSubmission = submission.source === 'eureka_form';

  // Type guard to check if submission has BARC/Eureka specific fields
  const hasBarcFields = (sub: CombinedSubmission): sub is CombinedSubmission & {
    company_type?: string;
    company_registration_type?: string;
    executive_summary?: string;
    question_1?: string;
    question_2?: string;
    question_3?: string;
    question_4?: string;
    question_5?: string;
    poc_name?: string;
    phoneno?: string;
    company_linkedin_url?: string;
    founder_linkedin_urls?: string[];
  } => {
    return isBarcSubmission || isEurekaSubmission;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {submission.company_name}
            <Badge variant="outline" className="ml-2">
              {submission.source === 'barc_form' ? 'BARC Form' : 'Eureka Form'}
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

          {/* BARC/Eureka Specific Fields */}
          {hasBarcFields(submission) && (
            <>
              {/* Company Information */}
              <div className="space-y-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Company Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {submission.company_type && (
                    <div>
                      <h4 className="font-medium mb-1">Company Type</h4>
                      <p className="text-sm text-muted-foreground">{submission.company_type}</p>
                    </div>
                  )}
                  {submission.company_registration_type && (
                    <div>
                      <h4 className="font-medium mb-1">Registration Type</h4>
                      <p className="text-sm text-muted-foreground">{submission.company_registration_type}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Executive Summary */}
              {submission.executive_summary && (
                <div>
                  <h3 className="font-semibold mb-2">Executive Summary</h3>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{submission.executive_summary}</p>
                  </div>
                </div>
              )}

              {/* Contact Information */}
              {(submission.poc_name || submission.phoneno) && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Point of Contact
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {submission.poc_name && (
                      <p className="text-sm"><strong>Name:</strong> {submission.poc_name}</p>
                    )}
                    {submission.phoneno && (
                      <p className="text-sm flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <strong>Phone:</strong> {submission.phoneno}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* LinkedIn Information */}
              {(submission.company_linkedin_url || (submission.founder_linkedin_urls && submission.founder_linkedin_urls.length > 0)) && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    LinkedIn Profiles
                  </h3>
                  <div className="space-y-2">
                    {submission.company_linkedin_url && (
                      <div>
                        <h4 className="font-medium mb-1">Company LinkedIn</h4>
                        <a 
                          href={submission.company_linkedin_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          {submission.company_linkedin_url}
                        </a>
                      </div>
                    )}
                    {submission.founder_linkedin_urls && submission.founder_linkedin_urls.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-1">Founder LinkedIn Profiles</h4>
                        <div className="space-y-1">
                          {submission.founder_linkedin_urls.map((url, index) => (
                            <a 
                              key={index}
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm block"
                            >
                              {url}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Questions */}
              <div className="space-y-4">
                <h3 className="font-semibold mb-2">Form Responses</h3>
                {[1, 2, 3, 4, 5].map(num => {
                  const questionKey = `question_${num}` as keyof typeof submission;
                  const questionValue = submission[questionKey];
                  if (!questionValue) return null;
                  
                  return (
                    <div key={num} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Question {num}</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {String(questionValue)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
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

          {/* System Information */}
          <div className="border-t pt-4 text-xs text-muted-foreground space-y-1">
            {submission.user_id && <p>User ID: {submission.user_id}</p>}
            {submission.company_id && <p>Company ID: {submission.company_id}</p>}
            {'report_id' in submission && submission.report_id && <p>Report ID: {submission.report_id}</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
