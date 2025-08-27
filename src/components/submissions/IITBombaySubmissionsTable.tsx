
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { CombinedSubmission } from "./types";

interface IITBombaySubmissionsTableProps {
  submissions: CombinedSubmission[];
}

export function IITBombaySubmissionsTable({ submissions }: IITBombaySubmissionsTableProps) {
  const [rerunningSubmissions, setRerunningSubmissions] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const getStatusBadge = (status?: string) => {
    if (!status || status === 'pending') {
      return <Badge variant="secondary">Processing</Badge>;
    }
    
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Analyzed</Badge>;
      case 'processing':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800 border-yellow-200">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Processing</Badge>;
    }
  };

  const shouldShowRerunButton = (submission: CombinedSubmission): boolean => {
    // Show for failed, processing, pending, or completed with low score (rejected)
    const status = submission.analysis_status?.toLowerCase();
    if (status === 'failed' || status === 'processing' || !status || status === 'pending') {
      return true;
    }
    
    // For completed submissions, check if they have a low score (rejected)
    if (status === 'completed' && submission.analysis_result) {
      try {
        const result = typeof submission.analysis_result === 'string' 
          ? JSON.parse(submission.analysis_result) 
          : submission.analysis_result;
        return result.overall_score && result.overall_score < 60;
      } catch (e) {
        console.error('Error parsing analysis result:', e);
        return false;
      }
    }
    
    return false;
  };

  const handleRerunAnalysis = async (submission: CombinedSubmission) => {
    if (rerunningSubmissions.has(submission.id)) {
      return;
    }

    setRerunningSubmissions(prev => new Set(prev).add(submission.id));

    try {
      // Determine which edge function to call based on submission source
      let functionName = '';
      let submissionId = submission.id;

      if (submission.source === 'eureka_form') {
        functionName = 'analyze-eureka-form';
      } else if (submission.source === 'barc_form') {
        functionName = 'analyze-barc-form';
      } else if (submission.source === 'email') {
        functionName = 'analyze-email-pitch-pdf';
      } else {
        toast({
          title: "Error",
          description: "Cannot rerun analysis for this submission type.",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase.functions.invoke(functionName, {
        body: { submissionId }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Analysis Restarted",
        description: `Re-analysis initiated for ${submission.company_name}`,
      });
    } catch (error: any) {
      console.error('Failed to rerun analysis:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to restart analysis. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRerunningSubmissions(prev => {
        const newSet = new Set(prev);
        newSet.delete(submission.id);
        return newSet;
      });
    }
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company Name</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.map((submission) => {
            const isRerunning = rerunningSubmissions.has(submission.id);
            const showRerunButton = shouldShowRerunButton(submission);
            
            return (
              <TableRow key={submission.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">
                  {submission.company_name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })}
                </TableCell>
                <TableCell>
                  {getStatusBadge(submission.analysis_status)}
                </TableCell>
                <TableCell>
                  {showRerunButton && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRerunAnalysis(submission)}
                      disabled={isRerunning}
                      className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                      title="Rerun analysis"
                    >
                      <RefreshCw className={`h-4 w-4 ${isRerunning ? 'animate-spin' : ''}`} />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
