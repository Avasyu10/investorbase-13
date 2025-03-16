
import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Report } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { Calendar, FileText } from "lucide-react";

interface ReportCardProps {
  report: Report;
}

export function ReportCard({ report }: ReportCardProps) {
  // Format the date as "X days/months ago"
  const formattedDate = formatDistanceToNow(new Date(report.created_at), { 
    addSuffix: true 
  });
  
  // Add status handling
  let statusDisplay;
  
  if (report.analysis_status === 'completed') {
    statusDisplay = (
      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
        Completed
      </span>
    );
  } else if (report.analysis_status === 'error') {
    statusDisplay = (
      <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800">
        Error
      </span>
    );
  } else if (report.analysis_status === 'pending') {
    statusDisplay = (
      <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
        Processing
      </span>
    );
  }
  
  return (
    <Link to={`/reports/${report.id}`} className="block h-full">
      <Card className="h-full transition-all duration-200 hover:shadow-md border-2 hover:border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-2">
            <FileText className="h-5 w-5 mt-0.5 text-muted-foreground" />
            <div>
              <h3 className="font-medium leading-tight">{report.title}</h3>
              
              {report.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {report.description}
                </p>
              )}
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between pt-2">
          <div className="flex items-center text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 mr-1" />
            {formattedDate}
          </div>
          
          {statusDisplay}
        </CardFooter>
      </Card>
    </Link>
  );
}
