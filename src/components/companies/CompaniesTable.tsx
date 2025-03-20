import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RatingDisplay } from "@/components/ui/rating";
import { CompanyActionButton } from "./CompanyActionButton";

interface Company {
  id: string;
  name: string;
  overall_score: number;
  created_at: string;
  report_id: string | null;
  reports?: {
    analysis_status: string;
  };
}

export function CompaniesTable() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [sortBy, setSortBy] = useState<keyof Company>("name");
  const [isLoading, setIsLoading] = useState(true);

  // Mock data for now
  useState(() => {
    const mockCompanies: Company[] = [
      {
        id: "1",
        name: "Acme Corp",
        overall_score: 4,
        created_at: new Date().toLocaleDateString(),
        report_id: null,
      },
      {
        id: "2",
        name: "Beta Co",
        overall_score: 3,
        created_at: new Date().toLocaleDateString(),
        report_id: null,
      },
      {
        id: "3",
        name: "Charlie Inc",
        overall_score: 5,
        created_at: new Date().toLocaleDateString(),
        report_id: null,
      },
    ];

    setCompanies(mockCompanies);
    setIsLoading(false);
  }, []);

  const handleSort = (column: keyof Company) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const sortedCompanies = [...companies].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    }

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortOrder === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return 0;
  });

  const filteredCompanies = sortedCompanies.filter((company) =>
    company.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center py-4">
        <Input
          type="search"
          placeholder="Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="ml-4">
          <Select onValueChange={(value) => handleSort(value as keyof Company)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="overall_score">Score</SelectItem>
              <SelectItem value="created_at">Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center">
                Loading...
              </TableCell>
            </TableRow>
          ) : filteredCompanies.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center">
                No companies found.
              </TableCell>
            </TableRow>
          ) : (
            filteredCompanies.map((company) => {
              // Get the report associated with this company
              const report = company.report_id ? {
                id: company.report_id,
                status: company.reports?.analysis_status || 'complete'
              } : null;
              
              return (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell>
                    {report?.status === 'pending' ? (
                      <Badge variant="outline">Pending Analysis</Badge>
                    ) : (
                      <RatingDisplay rating={company.overall_score} />
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(company.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <CompanyActionButton 
                      companyId={company.id} 
                      reportId={company.report_id}
                      status={report?.status}
                    />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
