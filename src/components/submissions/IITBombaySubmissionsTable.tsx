
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
  const [rerunningIds, setRerunningIds] = useState<Set<string>>(new Set());
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

  const isRejected = (submission: CombinedSubmission) => {
    if (submission.analysis_status !== 'completed' || !submission.analysis_result) {
      return false;
    }
    
    const result = submission.analysis_result;
    return result.recommendation === 'Reject' || 
           (result.overall_recommendation && result.overall_recommendation.toLowerCase().includes('reject'));
  };

  const canRerun = (submission: CombinedSubmission) => {
    return submission.analysis_status === 'failed' || isRejected(submission);
  };

  const handleRerunAnalysis = async (submissionId: string) => {
    setRerunningIds(prev => new Set(prev).add(submissionId));
    
    try {
      const { data, error } = await supabase.functions.invoke('rerun-eureka-analysis', {
        body: { submissionIds: [submissionId] }
      });

      if (error) {
        console.error('Error rerunning analysis:', error);
        toast({
          title: "Error",
          description: "Failed to rerun analysis. Please try again.",
          variant: "destructive",
        });
      } else {
        const result = data.results[0];
        if (result.success) {
          toast({
            title: "Success",
            description: "Analysis has been restarted successfully.",
          });
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to rerun analysis.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error rerunning analysis:', error);
      toast({
        title: "Error",
        description: "Failed to rerun analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRerunningIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(submissionId);
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
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.map((submission) => (
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
                {canRerun(submission) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRerunAnalysis(submission.id)}
                    disabled={rerunningIds.has(submission.id)}
                    className="h-8 px-2"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${rerunningIds.has(submission.id) ? 'animate-spin' : ''}`} />
                    {rerunningIds.has(submission.id) ? 'Rerunning...' : 'Re-run'}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
