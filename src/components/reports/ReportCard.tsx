
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
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg animate-slide-up h-[300px] flex flex-col bg-card dark:bg-card/90">
        <CardHeader className="pb-2 pt-4 flex-none">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center mb-1">
              <FileText className="h-6 w-6 text-muted-foreground mr-3" />
              <CardTitle className="text-xl font-semibold line-clamp-1">{report.title}</CardTitle>
            </div>
            
            <div className="flex items-center">
              {report.is_public_submission ? (
                <Badge 
                  variant="green"
                  className="text-xs px-3 py-1 font-medium"
                >
                  Public
                </Badge>
              ) : (
                <Badge 
                  variant="gold"
                  className="text-xs px-3 py-1 font-medium"
                >
                  Dashboard
                </Badge>
              )}
              <CardDescription className="flex items-center ml-auto text-xs">
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                {formatDate(report.created_at)}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 pt-2">
          <p className="text-sm text-muted-foreground line-clamp-4">{report.description}</p>
        </CardContent>
        
        <CardFooter className="flex-none pb-5 pt-2">
          <Button 
            onClick={() => setShowReportModal(true)} 
            className="w-full transition-all duration-200 hover:shadow-md flex items-center justify-center bg-primary/90 hover:bg-primary"
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
