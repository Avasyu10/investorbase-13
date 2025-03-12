
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Report } from "@/lib/supabase";
import { FileText, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

interface ReportCardProps {
  report: Report;
}

export function ReportCard({ report }: ReportCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }).format(date);
  };

  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg animate-slide-up h-[280px] flex flex-col">
      <CardHeader className="pb-2 flex-none">
        <div className="flex items-start gap-2">
          <FileText className="h-5 w-5 text-muted-foreground flex-none mt-1" />
          <CardTitle className="line-clamp-5 min-h-[120px] text-lg">{report.title}</CardTitle>
        </div>
        <CardDescription className="flex items-center gap-1 text-xs">
          <Calendar className="h-3 w-3" />
          <span>{formatDate(report.created_at)}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="text-sm text-muted-foreground line-clamp-2">{report.description}</p>
      </CardContent>
      <CardFooter className="flex-none pb-4">
        <Button asChild className="w-full transition-all duration-200 hover:shadow-md">
          <Link to={`/reports/${report.id}`}>
            View Report
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
