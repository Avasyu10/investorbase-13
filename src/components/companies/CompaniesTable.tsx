
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
import { useEffect, useState } from "react";

interface CompaniesTableProps {
  companies: CompanyListItem[];
  onCompanyClick: (companyId: number) => void;
}

export function CompaniesTable({ companies, onCompanyClick }: CompaniesTableProps) {
  // Track both the sort field and direction
  const [sortField, setSortField] = useState<'overallScore' | 'name' | 'createdAt'>('overallScore');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [sortedCompanies, setSortedCompanies] = useState<CompanyListItem[]>([]);

  // Apply sorting whenever companies, sortField, or sortDirection change
  useEffect(() => {
    if (!companies || companies.length === 0) {
      setSortedCompanies([]);
      return;
    }

    const sorted = [...companies].sort((a, b) => {
      if (sortField === 'name') {
        // Handle name sorting (case-insensitive)
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return sortDirection === 'asc' 
          ? nameA.localeCompare(nameB) 
          : nameB.localeCompare(nameA);
      } 
      
      if (sortField === 'overallScore') {
        // Handle score sorting
        const scoreA = a.overallScore || 0;
        const scoreB = b.overallScore || 0;
        return sortDirection === 'desc' ? scoreB - scoreA : scoreA - scoreB;
      }
      
      // Handle date sorting
      try {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
      } catch (error) {
        console.error("Date sorting error:", error, a.createdAt, b.createdAt);
        return 0;
      }
    });

    setSortedCompanies(sorted);
  }, [companies, sortField, sortDirection]);

  if (!companies || companies.length === 0) {
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
      // Default to desc for score and date, asc for name
      setSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  };

  // Helper to render sort arrows
  const renderSortArrow = (field: 'overallScore' | 'name' | 'createdAt') => {
    if (sortField !== field) return null;
    
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    );
  };

  // Helper to get score color class
  const getScoreColorClass = (score: number) => {
    if (score >= 4) return "text-green-600 font-medium";
    if (score >= 3) return "text-blue-600";
    if (score >= 2) return "text-yellow-600"; 
    return "text-red-600";
  };

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/4">
              <div 
                className="flex items-center cursor-pointer" 
                onClick={() => toggleSort('name')}
              >
                Name
                {renderSortArrow('name')}
              </div>
            </TableHead>
            <TableHead className="w-2/5">
              About
            </TableHead>
            <TableHead className="w-1/6">
              <div 
                className="flex items-center cursor-pointer" 
                onClick={() => toggleSort('overallScore')}
              >
                Score
                {renderSortArrow('overallScore')}
              </div>
            </TableHead>
            <TableHead className="w-1/6">
              <div 
                className="flex items-center cursor-pointer" 
                onClick={() => toggleSort('createdAt')}
              >
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
              <TableCell className="text-sm text-muted-foreground">
                {company.description || "No description available"}
              </TableCell>
              <TableCell className={getScoreColorClass(company.overallScore)}>
                {company.overallScore}/5
              </TableCell>
              <TableCell>{new Date(company.createdAt).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
