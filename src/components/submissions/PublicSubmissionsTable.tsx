import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { FileText, Mail, ExternalLink, Sparkles, Loader2, Building } from "lucide-react";
import { analyzeBarcSubmission } from "@/lib/api/barc";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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
  source: "email" | "email_pitch" | "public_form" | "barc_form";
  from_email?: string | null;
  submitter_email?: string | null;
}

interface PublicSubmissionsTableProps {
  submissions: PublicSubmission[];
  onAnalyze: (submission: PublicSubmission) => void;
  analyzingSubmissions?: Set<string>;
  isIITBombay?: boolean;
}

export function PublicSubmissionsTable({ submissions, onAnalyze, analyzingSubmissions = new Set(), isIITBombay = false }: PublicSubmissionsTableProps) {
  const navigate = useNavigate();

  if (!submissions) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No submissions provided</p>
      </div>
    );
  }

  if (!Array.isArray(submissions)) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Invalid submissions data</p>
      </div>
    );
  }
  
  if (submissions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No submissions found</p>
      </div>
    );
  }

  const handleAnalyze = async (submission: PublicSubmission) => {
    console.log('PublicSubmissionsTable handleAnalyze called with:', submission);
    
    // For BARC submissions, handle the complete analysis flow
    if (submission.source === "barc_form") {
      console.log('Handling BARC submission analysis for:', submission.id);
      
      try {
        // Call the passed onAnalyze callback to handle loading state
        onAnalyze(submission);
        
        console.log('Starting BARC analysis and waiting for completion...');
        
        // Call the BARC analysis function and wait for completion
        const result = await analyzeBarcSubmission(submission.id);
        
        console.log('BARC analysis result:', result);
        
        if (result?.success && result?.companyId) {
          toast.success("Analysis completed successfully!", {
            description: "Company has been created and analyzed."
          });
          
          // Navigate directly to the company details page
          console.log('Navigating to company:', result.companyId);
          navigate(`/company/${result.companyId}`);
        } else {
          throw new Error(result?.message || 'Analysis failed - no company created');
        }
        
      } catch (error) {
        console.error('BARC analysis failed:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
        toast.error("Analysis failed", {
          description: errorMessage
        });
        
        // Re-throw to let parent component handle cleanup
        throw error;
      }
      return;
    }

    // Handle other submission types
    if (!submission.report_id) {
      throw new Error("No report ID found for this submission");
    }

    // Call the original onAnalyze callback for other submission types
    onAnalyze(submission);
  };

  const truncateText = (text: string | null, maxLength: number) => {
    if (!text) return "—";
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return dateString;
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'email':
        return (
          <Badge 
            variant="outline"
            className="flex items-center gap-1 font-medium px-2 py-1 w-fit bg-blue-50 text-blue-700 border-blue-200"
          >
            <Mail className="h-3 w-3" />
            <span>Email</span>
          </Badge>
        );
      case 'email_pitch':
        return (
          <Badge 
            variant="outline"
            className="flex items-center gap-1 font-medium px-2 py-1 w-fit bg-blue-50 text-blue-700 border-blue-200"
          >
            <Mail className="h-3 w-3" />
            <span>Email Pitch</span>
          </Badge>
        );
      case 'barc_form':
        return (
          <Badge 
            variant="outline"
            className="flex items-center gap-1 font-medium px-2 py-1 w-fit bg-purple-50 text-purple-700 border-purple-200"
          >
            <Building className="h-3 w-3" />
            <span>BARC Form</span>
          </Badge>
        );
      case 'public_form':
      default:
        return (
          <Badge 
            variant="outline"
            className="flex items-center gap-1 font-medium px-2 py-1 w-fit bg-green-50 text-green-700 border-green-200"
          >
            <FileText className="h-3 w-3" />
            <span>Public Form</span>
          </Badge>
        );
    }
  };

  const getSubmissionEmail = (submission: PublicSubmission) => {
    return submission.submitter_email || submission.from_email || "—";
  };
  
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            {!isIITBombay && <TableHead className="w-1/6">Source</TableHead>}
            <TableHead className="w-1/5">Title</TableHead>
            {isIITBombay && <TableHead className="w-1/6">Email</TableHead>}
            {!isIITBombay && <TableHead className="w-1/6">Industry</TableHead>}
            {!isIITBombay && <TableHead className="w-1/6">Stage</TableHead>}
            {!isIITBombay && <TableHead className="w-1/6">Website</TableHead>}
            <TableHead className="w-1/6">Submitted</TableHead>
            <TableHead className="w-1/6 text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.map((submission) => {
            const isAnalyzing = analyzingSubmissions.has(submission.id);
            
            try {
              return (
                <TableRow key={submission.id}>
                  {!isIITBombay && (
                    <TableCell>
                      {getSourceBadge(submission.source)}
                    </TableCell>
                  )}
                  <TableCell className="font-medium">
                    {truncateText(submission.title, 30)}
                  </TableCell>
                  {isIITBombay && (
                    <TableCell>
                      {getSubmissionEmail(submission)}
                    </TableCell>
                  )}
                  {!isIITBombay && (
                    <TableCell>
                      {submission.industry || "—"}
                    </TableCell>
                  )}
                  {!isIITBombay && (
                    <TableCell>
                      {submission.company_stage || "—"}
                    </TableCell>
                  )}
                  {!isIITBombay && (
                    <TableCell>
                      {submission.website_url ? (
                        <a 
                          href={submission.website_url.startsWith('http') ? submission.website_url : `https://${submission.website_url}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline flex items-center gap-1"
                        >
                          {new URL(submission.website_url.startsWith('http') ? submission.website_url : `https://${submission.website_url}`).hostname}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    {formatDate(submission.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleAnalyze(submission)}
                      disabled={isAnalyzing || (submission.source !== "barc_form" && !submission.report_id)}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[80px]"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-1 h-3 w-3" />
                          Analyze
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            } catch (error) {
              return null;
            }
          })}
        </TableBody>
      </Table>
    </div>
  );
}
