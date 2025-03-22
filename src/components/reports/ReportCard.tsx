
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Report } from "@/lib/supabase/reports";
import { FileText, Calendar, Maximize } from "lucide-react";
import { useState } from "react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReportViewer } from "./ReportViewer";
import { Badge } from "@/components/ui/badge";

interface ReportCardProps {
  report: Report;
}

export function ReportCard({ report }: ReportCardProps) {
  const [showReportModal, setShowReportModal] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }).format(date);
  };

  return (
    <>
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg animate-slide-up h-[300px] flex flex-col">
        <CardHeader className="pb-2 flex-none">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2">
              <FileText className="h-5 w-5 text-muted-foreground flex-none mt-1" />
              <CardTitle className="line-clamp-5 text-lg">{report.title}</CardTitle>
            </div>
            {report.is_public_submission ? (
              <Badge variant="green" className="ml-2 flex-shrink-0">
                Public Submission
              </Badge>
            ) : (
              <Badge variant="gold" className="ml-2 flex-shrink-0">
                Dashboard
              </Badge>
            )}
          </div>
          <CardDescription className="flex items-center gap-1 text-xs mt-2">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(report.created_at)}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <p className="text-sm text-muted-foreground line-clamp-2">{report.description}</p>
        </CardContent>
        <CardFooter className="flex-none pb-6">
          <Button 
            onClick={() => setShowReportModal(true)} 
            className="w-full transition-all duration-200 hover:shadow-md"
          >
            <Maximize className="mr-2 h-4 w-4" />
            View Deck
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{report.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-1">
            <ReportViewer reportId={report.id} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
