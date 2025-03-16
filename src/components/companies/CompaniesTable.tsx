
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { CompanyListItem } from "@/lib/api/apiContract";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useState } from "react";

interface CompaniesTableProps {
  companies: CompanyListItem[];
  onCompanyClick: (companyId: number) => void;
}

export function CompaniesTable({ companies, onCompanyClick }: CompaniesTableProps) {
  // Default to 'desc' for showing higher scores first
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  if (companies.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No companies found</p>
      </div>
    );
  }

  const toggleSortDirection = () => {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  };

  const sortedCompanies = [...companies].sort((a, b) => {
    if (sortDirection === 'desc') {
      return b.overallScore - a.overallScore; // Higher scores first (desc order)
    } else {
      return a.overallScore - b.overallScore; // Lower scores first (asc order)
    }
  });

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>
              <div className="flex items-center cursor-pointer" onClick={toggleSortDirection}>
                Score
                {sortDirection === 'asc' ? (
                  <ArrowUp className="h-4 w-4 ml-1" />
                ) : (
                  <ArrowDown className="h-4 w-4 ml-1" />
                )}
              </div>
            </TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Date Added</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedCompanies.map((company) => (
            <TableRow 
              key={company.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onCompanyClick(company.id)}
            >
              <TableCell className="font-medium">{company.name}</TableCell>
              <TableCell>{company.overallScore}/5</TableCell>
              <TableCell>
                <Progress value={company.overallScore * 20} className="h-2 w-32" />
              </TableCell>
              <TableCell>{new Date(company.createdAt).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
