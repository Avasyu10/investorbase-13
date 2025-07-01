
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { CompanyListItem } from "@/lib/api/apiContract";
import { Trash2 } from "lucide-react";

interface BitsCrmTableProps {
  companies: CompanyListItem[];
  onCompanyClick: (companyId: string) => void;
  onDeleteCompany: (companyId: string) => void;
}

function extractStageFromResponse(responseReceived: string | null): string {
  if (!responseReceived) return "Unknown";
  
  // Simple extraction logic - look for common stage keywords
  const response = responseReceived.toLowerCase();
  
  if (response.includes("seed") || response.includes("pre-seed")) {
    return "Seed";
  } else if (response.includes("series a") || response.includes("series-a")) {
    return "Series A";
  } else if (response.includes("series b") || response.includes("series-b")) {
    return "Series B";
  } else if (response.includes("growth") || response.includes("expansion")) {
    return "Growth";
  } else if (response.includes("early") || response.includes("startup")) {
    return "Early Stage";
  } else if (response.includes("late") || response.includes("mature")) {
    return "Late Stage";
  }
  
  return "Unknown";
}

export function BitsCrmTable({ companies, onCompanyClick, onDeleteCompany }: BitsCrmTableProps) {
  const navigate = useNavigate();

  if (!companies || companies.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No companies found</p>
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Company</TableHead>
            <TableHead className="w-[150px]">Industry</TableHead>
            <TableHead className="w-[120px]">Stage</TableHead>
            <TableHead className="w-[100px]">Score</TableHead>
            <TableHead className="w-[120px]">Status</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => {
            // Extract stage from response_received (this would come from the company data)
            const stage = extractStageFromResponse(company.scoring_reason); // Using scoring_reason as proxy for response_received
            const status = company.company_details?.status || "New";
            
            return (
              <TableRow
                key={company.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onCompanyClick(company.id)}
              >
                <TableCell className="font-medium">{company.name}</TableCell>
                <TableCell>
                  {company.industry || company.company_details?.industry || "—"}
                </TableCell>
                <TableCell>{stage}</TableCell>
                <TableCell>
                  <span className={`font-medium ${
                    company.overall_score > 70 ? 'text-green-600' :
                    company.overall_score >= 50 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {company.overall_score.toFixed(1)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    status === 'Interested' ? 'bg-green-100 text-green-800' :
                    status === 'Contacted' ? 'bg-blue-100 text-blue-800' :
                    status === 'In Review' ? 'bg-yellow-100 text-yellow-800' :
                    status === 'Not Interested' ? 'bg-red-100 text-red-800' :
                    status === 'Passed' ? 'bg-gray-100 text-gray-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {status}
                  </span>
                </TableCell>
                <TableCell>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Company</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{company.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDeleteCompany(company.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
