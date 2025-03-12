
import { useQuery } from "@tanstack/react-query";
import { getReportById, downloadReport, Report } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Download, Loader, Calendar, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReportViewerProps {
  reportId: string;
}

export function ReportViewer({ reportId }: ReportViewerProps) {
  const { toast } = useToast();
  
  const { data: report, isLoading, error } = useQuery({
    queryKey: ["report", reportId],
    queryFn: () => getReportById(reportId),
  });

  const handleDownload = async () => {
    if (!report) return;
    
    try {
      const blob = await downloadReport(report.pdf_url);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download started",
        description: `${report.title}.pdf is downloading`,
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "There was an error downloading the report",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center space-y-2">
          <Loader className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">Failed to load report</p>
          <p className="text-sm text-muted-foreground">
            There was an error loading this report. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">{report.title}</h1>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(report.created_at)}</span>
          </div>
        </div>
        <Button 
          onClick={handleDownload} 
          className="transition-all duration-200 hover:shadow-md"
        >
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
      </div>
      
      <p className="text-muted-foreground">{report.description}</p>
      
      <Separator className="my-6" />
      
      {report.sections && report.sections.length > 0 ? (
        <Tabs defaultValue={report.sections[0]} className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 mb-6">
            {report.sections.map((section) => (
              <TabsTrigger key={section} value={section} className="transition-all duration-200">
                {section}
              </TabsTrigger>
            ))}
          </TabsList>
          {report.sections.map((section) => (
            <TabsContent key={section} value={section} className="animate-fade-in">
              <Card>
                <CardContent className="pt-6">
                  {/* This would be replaced with actual content from the PDF */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">{section}</h3>
                    <p className="text-sm text-muted-foreground">
                      This section preview would display content extracted from the PDF.
                      In a production environment, you would use a PDF parsing library to
                      extract and display the content of this section.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              This report doesn't have any extracted sections. You can still download
              the full PDF using the button above.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
