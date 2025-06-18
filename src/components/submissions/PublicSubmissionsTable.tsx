
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Mail, FileText, Calendar, GraduationCap, Building2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AnalysisModal } from "./AnalysisModal";
import { BarcAnalysisModal } from "./BarcAnalysisModal";
import type { CombinedSubmission } from "./types";

interface PublicSubmissionsTableProps {
  submissions: CombinedSubmission[];
}

export function PublicSubmissionsTable({ submissions }: PublicSubmissionsTableProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<CombinedSubmission | null>(null);
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [barcAnalysisModalOpen, setBarcAnalysisModalOpen] = useState(false);

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'barc_form':
        return <Building2 className="h-4 w-4" />;
      case 'eureka_form':
        return <GraduationCap className="h-4 w-4" />;
      case 'public_form':
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'email':
        return 'Email';
      case 'barc_form':
        return 'BARC Form';
      case 'eureka_form':
        return 'Eureka Form';
      case 'public_form':
      default:
        return 'Public Form';
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'email':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'barc_form':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'eureka_form':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'public_form':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAnalysisStatusBadge = (status?: string) => {
    if (!status) return null;
    
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Analyzed</Badge>;
      case 'processing':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800 border-yellow-200">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const handleViewSubmission = (submission: CombinedSubmission) => {
    setSelectedSubmission(submission);
    
    // Open appropriate modal based on source
    if (submission.source === 'barc_form' || submission.source === 'eureka_form') {
      setBarcAnalysisModalOpen(true);
    } else {
      setAnalysisModalOpen(true);
    }
  };

  return (
    <>
      <div className="grid gap-4">
        {submissions.map((submission) => (
          <Card key={submission.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-lg">{submission.company_name}</CardTitle>
                  <CardDescription className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {submission.submitter_email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })}
                    </span>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {getAnalysisStatusBadge(submission.analysis_status)}
                  <Badge 
                    variant="outline" 
                    className={`flex items-center gap-1 ${getSourceColor(submission.source)}`}
                  >
                    {getSourceIcon(submission.source)}
                    {getSourceLabel(submission.source)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {submission.form_slug && (
                    <span>Form: {submission.form_slug}</span>
                  )}
                  {submission.has_attachment && (
                    <Badge variant="outline" className="text-xs">
                      Has Attachment
                    </Badge>
                  )}
                  {submission.user_id && (
                    <span className="text-xs">User ID: {submission.user_id.substring(0, 8)}...</span>
                  )}
                  {submission.company_id && (
                    <span className="text-xs">Company ID: {submission.company_id.substring(0, 8)}...</span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewSubmission(submission)}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analysis Modal for public forms and email submissions */}
      <AnalysisModal
        open={analysisModalOpen}
        onOpenChange={setAnalysisModalOpen}
        submission={selectedSubmission}
      />

      {/* BARC/Eureka Analysis Modal */}
      <BarcAnalysisModal
        open={barcAnalysisModalOpen}
        onOpenChange={setBarcAnalysisModalOpen}
        submission={selectedSubmission}
      />
    </>
  );
}
