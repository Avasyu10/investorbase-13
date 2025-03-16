
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { CompanyListItem } from "@/lib/api/apiContract";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useState } from "react";

interface CompaniesTableProps {
  companies: CompanyListItem[];
  onCompanyClick: (companyId: number) => void;
}

export function CompaniesTable({ companies, onCompanyClick }: CompaniesTableProps) {
  // Track both the sort field and direction
  const [sortField, setSortField] = useState<'overallScore' | 'name' | 'createdAt'>('overallScore');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  if (companies.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No companies found</p>
      </div>
    );
  }

  const toggleSort = (field: 'overallScore' | 'name' | 'createdAt') => {
    if (sortField === field) {
      // If clicking the same field, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // If clicking a new field, set it and use default direction
      setSortField(field);
      // Default to desc for score, asc for name, desc for date
      if (field === 'name') {
        setSortDirection('asc');
      } else {
        setSortDirection('desc');
      }
    }
  };

  // Fix sorting logic
  const sortedCompanies = [...companies].sort((a, b) => {
    if (sortField === 'overallScore') {
      return sortDirection === 'desc' 
        ? b.overallScore - a.overallScore 
        : a.overallScore - b.overallScore;
    } else if (sortField === 'name') {
      // Fix name sorting - ensure case insensitive comparison
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      return sortDirection === 'asc'
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    } else { // createdAt
      // Fix date sorting by ensuring proper date comparison
      // First convert string dates to Date objects then to timestamps
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      
      // Ensure proper date comparison
      return sortDirection === 'desc'
        ? dateB - dateA
        : dateA - dateB;
    }
  });

  // Helper to render sort arrows
  const renderSortArrow = (field: 'overallScore' | 'name' | 'createdAt') => {
    if (sortField !== field) return null;
    
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    );
  };

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <div className="flex items-center cursor-pointer" onClick={() => toggleSort('name')}>
                Name
                {renderSortArrow('name')}
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center cursor-pointer" onClick={() => toggleSort('overallScore')}>
                Score
                {renderSortArrow('overallScore')}
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center cursor-pointer" onClick={() => toggleSort('createdAt')}>
                Date Added
                {renderSortArrow('createdAt')}
              </div>
            </TableHead>
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
              <TableCell>{new Date(company.createdAt).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
