
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import type { CombinedSubmission } from "./types";

interface IITBombaySubmissionsTableProps {
  submissions: CombinedSubmission[];
}

export function IITBombaySubmissionsTable({ submissions }: IITBombaySubmissionsTableProps) {
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

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company Name</TableHead>
            <TableHead>From</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.map((submission) => (
            <TableRow key={submission.id} className="hover:bg-muted/50">
              <TableCell className="font-medium">
                {submission.company_name}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {submission.submitter_email}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })}
              </TableCell>
              <TableCell>
                {getStatusBadge(submission.analysis_status)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
