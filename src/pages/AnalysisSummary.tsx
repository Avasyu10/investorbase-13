
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, FileText, BarChart2, Lightbulb, Download, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FundThesisAlignment } from "@/components/companies/FundThesisAlignment";

interface AnalysisSummary {
  id: string;
  title: string;
  description: string;
  created_at: string;
  analysis_text: string;
  analysis_sections: {
    title: string;
    content: string;
  }[];
  key_points: string[];
  company_id: string;
  company_name: string;
  company_website: string;
  company_stage: string;
  company_industry: string;
  company_description: string;
  company_logo_url: string;
  company_score: number;
  company_assessment_points: string[];
}

export default function AnalysisSummary() {
  const params = useParams();
  const [summary, setSummary] = useState<AnalysisSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [isFundThesisModalOpen, setIsFundThesisModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasFundThesis, setHasFundThesis] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get the current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setError("You need to be logged in to view this page");
          setIsLoading(false);
          return;
        }
        
        setUserId(user.id);
        
        // Check if user has a fund thesis
        const { data: profileData, error: profileError } = await supabase
          .from('vc_profiles')
          .select('fund_thesis_url')
          .eq('id', user.id)
          .single();
          
        if (!profileError && profileData && profileData.fund_thesis_url) {
          setHasFundThesis(true);
        }

        // Fetch the analysis summary using RPC or custom endpoint
        const summaryId = params.id;
        if (!summaryId) {
          setError("No analysis ID provided");
          setIsLoading(false);
          return;
        }

        // Use a direct fetch to an API endpoint since the table might not be accessible via Supabase client
        const response = await fetch(`https://jhtnruktmtjqrfoiyrep.supabase.co/rest/v1/analysis_summaries?id=eq.${summaryId}`, {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpodG5ydWt0bXRqcXJmb2l5cmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3NTczMzksImV4cCI6MjA1NzMzMzMzOX0._HZzAtVcTH_cdXZoxIeERNYqS6_hFEjcWbgHK3vxQBY',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          }
        });

        if (!response.ok) {
          console.error("Error fetching analysis summary:", response.statusText);
          setError("Failed to load analysis summary");
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        if (data && data.length > 0) {
          setSummary(data[0] as AnalysisSummary);
        } else {
          setError("Analysis summary not found");
        }
      } catch (err) {
        console.error("Error in fetchSummary:", err);
        setError("An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, [params.id]);

  const handleDownloadPDF = async () => {
    if (!summary) return;
    
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("You need to be logged in to download this report");
        return;
      }
      
      // Get the report ID associated with this analysis
      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .select('id, pdf_url')
        .eq('company_id', summary.company_id)
        .single();
        
      if (reportError || !reportData) {
        console.error("Error fetching report:", reportError);
        toast.error("Could not find the associated report");
        return;
      }
      
      // Create a signed URL for the PDF
      const { data, error } = await supabase.storage
        .from('report_pdfs')
        .createSignedUrl(`${user.id}/${reportData.pdf_url}`, 60);
        
      if (error || !data?.signedUrl) {
        console.error("Error creating signed URL:", error);
        toast.error("Failed to generate download link");
        return;
      }
      
      // Create a temporary anchor element to download the file
      const downloadLink = document.createElement('a');
      downloadLink.href = data.signedUrl;
      downloadLink.download = `${summary.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      toast.success("Download started");
    } catch (err) {
      console.error("Error downloading PDF:", err);
      toast.error("Failed to download the report");
    }
  };
  
  const handleOpenFundThesisModal = () => {
    if (!summary || !userId) return;
    setIsFundThesisModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading analysis summary...</p>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="bg-destructive/10 p-4 rounded-md">
          <h2 className="text-lg font-semibold text-destructive">Error</h2>
          <p>{error || "Failed to load analysis summary"}</p>
          <Button asChild className="mt-4">
            <Link to="/dashboard">Return to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Format score to 1 decimal place
  const formattedScore = summary.company_score.toFixed(1);
  
  // Get score color class
  const getScoreColor = (score: number) => {
    if (score >= 4.5) return "text-emerald-600";
    if (score >= 3.5) return "text-blue-600";
    if (score >= 2.5) return "text-amber-600";
    if (score >= 1.5) return "text-orange-600";
    return "text-red-600";
  };

  return (
    <div className="container max-w-6xl py-8 animate-fade-in">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4 -ml-3 text-muted-foreground">
          <Link to="/dashboard" className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{summary.title}</h1>
            <p className="text-muted-foreground mt-1">
              Analysis created on {new Date(summary.created_at).toLocaleDateString()}
            </p>
          </div>
          
          <div className="flex gap-3">
            {hasFundThesis && (
              <Button 
                variant="outline" 
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                onClick={handleOpenFundThesisModal}
              >
                <Lightbulb className="mr-2 h-4 w-4" />
                Fund Thesis Alignment
              </Button>
            )}
            
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="mr-2 h-4 w-4" />
              Download Report
            </Button>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-medium">Company Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4">
                  {summary.company_logo_url && (
                    <div className="flex-shrink-0">
                      <img 
                        src={summary.company_logo_url} 
                        alt={`${summary.company_name} logo`}
                        className="w-16 h-16 object-contain"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">{summary.company_name}</h3>
                    
                    <div className="flex flex-wrap gap-2">
                      {summary.company_industry && (
                        <Badge variant="outline" className="bg-primary/10">
                          {summary.company_industry}
                        </Badge>
                      )}
                      
                      {summary.company_stage && (
                        <Badge variant="outline" className="bg-secondary/10">
                          {summary.company_stage}
                        </Badge>
                      )}
                    </div>
                    
                    {summary.company_website && (
                      <a 
                        href={summary.company_website.startsWith('http') ? summary.company_website : `https://${summary.company_website}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary flex items-center gap-1 hover:underline"
                      >
                        {summary.company_website.replace(/^https?:\/\/(www\.)?/, '')}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="flex-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-medium">Overall Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="h-5 w-5 text-primary" />
                    <span className="font-medium">Investment Score</span>
                  </div>
                  <span className={`text-2xl font-bold ${getScoreColor(summary.company_score)}`}>
                    {formattedScore}/5
                  </span>
                </div>
                
                <Separator className="my-3" />
                
                <div className="space-y-2">
                  {summary.company_assessment_points && summary.company_assessment_points.length > 0 ? (
                    summary.company_assessment_points.slice(0, 2).map((point, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <Lightbulb className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        <p className="text-sm text-muted-foreground">{point}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No assessment points available</p>
                  )}
                  
                  {summary.company_assessment_points && summary.company_assessment_points.length > 2 && (
                    <Link 
                      to={`/company/${summary.company_id}`}
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      View all assessment points
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="full-analysis">Full Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Key Insights
              </CardTitle>
              <CardDescription>
                The most important points from the analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {summary.key_points && summary.key_points.length > 0 ? (
                  summary.key_points.map((point, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary flex-shrink-0">
                        <span className="text-sm font-medium">{index + 1}</span>
                      </div>
                      <p className="text-sm">{point}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No key points available</p>
                )}
              </div>
            </CardContent>
          </Card>
          
          {summary.analysis_sections && summary.analysis_sections.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Analysis Sections</CardTitle>
                <CardDescription>
                  Detailed breakdown of the company analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {summary.analysis_sections.map((section, index) => (
                    <div key={index}>
                      <h3 className="text-lg font-semibold mb-2">{section.title}</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{section.content}</p>
                      {index < summary.analysis_sections.length - 1 && (
                        <Separator className="my-4" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" onClick={() => setActiveTab("full-analysis")}>
                  View Full Analysis
                </Button>
              </CardFooter>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="full-analysis">
          <Card>
            <CardHeader>
              <CardTitle>Complete Analysis</CardTitle>
              <CardDescription>
                The full detailed analysis of {summary.company_name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-line">{summary.analysis_text}</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Fund Thesis Alignment Modal */}
      <Dialog open={isFundThesisModalOpen} onOpenChange={setIsFundThesisModalOpen}>
        <DialogContent className="max-w-4xl w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-emerald-600" />
              Fund Thesis Alignment
            </DialogTitle>
            <DialogDescription>
              Analysis of how well this company aligns with your investment thesis
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            {summary && userId && (
              <FundThesisAlignment 
                companyId={String(summary.company_id)}
                companyName={summary.company_name}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
