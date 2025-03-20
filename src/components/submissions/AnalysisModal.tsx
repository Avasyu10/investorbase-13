
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

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

interface AnalysisModalProps {
  isOpen: boolean;
  isAnalyzing: boolean;
  submission: PublicSubmission | null;
  onClose: () => void;
}

export function AnalysisModal({ isOpen, isAnalyzing, submission, onClose }: AnalysisModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Analyzing Submission</DialogTitle>
          <DialogDescription>
            {submission?.title ? `Analyzing "${submission.title}"` : "Processing your request"}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-6">
          {isAnalyzing ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-center text-sm text-muted-foreground">
                This may take a minute or two. Please don't close this window.
              </p>
            </>
          ) : (
            <p className="text-center">Analysis complete!</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
