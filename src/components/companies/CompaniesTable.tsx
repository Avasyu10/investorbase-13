import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Company } from "@/lib/api/apiContract";
// import { formatDistanceToNow } from "date-fns"; // This import is still unused, consider removing
import { Star, Trash2, Phone, Mail, Globe, Download, Edit } from "lucide-react"; // Added Edit icon back
import { EditCompanyDialog } from "./EditCompanyDialog"; // Re-added EditCompanyDialog import
import { useState, useEffect } from "react";
import { useDeleteCompany } from "@/hooks/useDeleteCompany";
import { toast } from "@/hooks/use-toast";
import { usePdfDownload } from "@/hooks/usePdfDownload";
import { supabase } from "@/integrations/supabase/client"; // Ensure supabase is imported if you're using it directly here

interface CompaniesTableProps {
  companies: Company[];
  onCompanyClick: (companyId: string) => void;
  onDeleteCompany?: (companyId: string) => void;
  isIITBombay?: boolean;
  isBits?: boolean;
  isVC?: boolean;
}

export function CompaniesTable({ companies, onCompanyClick, onDeleteCompany, isIITBombay = false, isBits = false, isVC = false }: CompaniesTableProps) {
  const [localCompanies, setLocalCompanies] = useState(companies);
  const [deletingCompanies, setDeletingCompanies] = useState<Set<string>>(new Set());

  // Re-added state for EditCompanyDialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCompanyForEdit, setSelectedCompanyForEdit] = useState<{
    id: string;
    teamMember: string;
    status: string;
  } | null>(null);

  const { deleteCompany, isDeleting } = useDeleteCompany();
  const { downloadCompaniesAsPdf } = usePdfDownload();

  // Update local state when companies prop changes
  useEffect(() => {
    setLocalCompanies(companies);
  }, [companies]);

  const getScoreColor = (score: number): string => {
    if (score >= 75) return "text-green-700";
    if (score >= 70) return "text-blue-500";
    if (score >= 50) return "text-amber-600";
    if (score >= 30) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBadgeColor = (score: number): string => {
    if (score >= 75) return "bg-green-300 text-green-900";
    if (score >= 70) return "bg-blue-100 text-blue-800";
    if (score >= 50) return "bg-amber-100 text-amber-800";
    if (score >= 30) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  const getStatusBadgeColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'new':
        return "bg-blue-100 text-blue-800";
      case 'contacted':
        return "bg-yellow-100 text-yellow-800";
      case 'meeting scheduled':
        return "bg-purple-100 text-purple-800";
      case 'under review':
        return "bg-orange-100 text-orange-800";
      case 'interested':
        return "bg-green-100 text-green-800";
      case 'passed':
        return "bg-red-100 text-red-800";
      case 'partner meeting':
        return "bg-indigo-100 text-indigo-800";
      case 'term sheet offer':
        return "bg-cyan-100 text-cyan-800";
      case 'due diligence':
        return "bg-amber-100 text-amber-800";
      case 'closing':
        return "bg-emerald-100 text-emerald-800";
      case 'exit':
        return "bg-slate-100 text-slate-800";
      case 'deck evaluated':
        return "bg-lime-100 text-lime-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleDeleteClick = async (e: React.MouseEvent, companyId: string) => {
    e.stopPropagation(); // Prevent row click event

    if (deletingCompanies.has(companyId)) {
      console.log('Company deletion already in progress:', companyId);
      return;
    }

    setDeletingCompanies(prev => new Set(prev).add(companyId));

    try {
      await deleteCompany(companyId);
      setLocalCompanies(prev => prev.filter(company => company.id !== companyId));
      if (onDeleteCompany) {
        onDeleteCompany(companyId);
      }
      toast({
        title: "Company Deleted",
        description: "The company has been successfully removed.",
      });
    } catch (error: any) {
      console.error('Failed to delete company:', error);
      toast({
        title: "Error deleting company",
        description: error.message || "Failed to delete the company. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingCompanies(prev => {
        const newSet = new Set(prev);
        newSet.delete(companyId);
        return newSet;
      });
    }
  };

  // Re-added handleEditClick function
  const handleEditClick = (e: React.MouseEvent, company: Company) => {
    e.stopPropagation(); // Prevent row click event
    const companyDetails = (company as any).company_details;
    const teamMemberName = companyDetails?.teammember_name || '';
    const status = companyDetails?.status || 'New';

    setSelectedCompanyForEdit({
      id: company.id,
      teamMember: teamMemberName,
      status: status
    });
    setEditDialogOpen(true);
  };

  // Modified handleCompanyUpdate to interact with Supabase
  const handleCompanyUpdate = async (companyId: string, newTeamMember: string, newStatus: string) => {
    try {
      // Update the database
      const { data, error } = await supabase
        .from('companies') // Replace 'companies' with your actual table name
        .update({
          company_details: {
            // Merge existing company_details to preserve other fields
            ...(localCompanies.find(c => c.id === companyId) as any)?.company_details,
            status: newStatus,
            status_date: new Date().toISOString(),
            teammember_name: newTeamMember
          }
        })
        .eq('id', companyId)
        .select(); // Select the updated row to get the latest data

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        // Update local state to reflect the change immediately
        setLocalCompanies(prev => prev.map(company => {
          if (company.id === companyId) {
            return {
              ...company,
              company_details: data[0].company_details // Use the updated details from the database response
            };
          }
          return company;
        }));
        toast({
          title: "Company Updated",
          description: "Company status and team member updated successfully.",
        });
      } else {
        throw new Error("Failed to update company in database.");
      }
    } catch (error: any) {
      console.error("Error updating company:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Could not update company details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setEditDialogOpen(false); // Close the dialog after update attempt
    }
  };


  const handleDownloadPdf = () => {
    const title = isIITBombay ? 'IIT Bombay Companies Prospects' : 'Companies Prospects';
    downloadCompaniesAsPdf(localCompanies, {
      filename: `${title.toLowerCase().replace(/\s+/g, '-')}.pdf`,
      title
    });

    toast({
      title: "PDF Downloaded",
      description: "Companies table has been downloaded successfully.",
    });
  };

  if (isIITBombay) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Companies Prospects</h3>
              <p className="text-sm text-muted-foreground">
                {localCompanies.length} companies found
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold w-[140px]">Company Name</TableHead>
                <TableHead className="font-semibold w-[100px]">Name</TableHead>
                <TableHead className="font-semibold w-[110px]">Phone Number</TableHead>
                <TableHead className="font-semibold w-[120px]">Email</TableHead>
                <TableHead className="font-semibold w-[100px]">Industry</TableHead>
                <TableHead className="font-semibold w-[80px]">Score</TableHead>
                <TableHead className="font-semibold">Reason for Scoring</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead> {/* Increased width for Actions if adding Edit */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {localCompanies.map((company) => {
                const formattedScore = Math.round(company.overall_score);
                const isCompanyDeleting = deletingCompanies.has(company.id);

                return (
                  <TableRow
                    key={company.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onCompanyClick(company.id)}
                  >
                    <TableCell className="font-medium">
                      {company.name}
                    </TableCell>
                    <TableCell>
                      {(company as any).poc_name || "—"}
                    </TableCell>
                    <TableCell>
                      {(company as any).phonenumber || "—"}
                    </TableCell>
                    <TableCell>
                      {(company as any).email || "—"}
                    </TableCell>
                    <TableCell>
                      {company.industry || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <Badge className={getScoreBadgeColor(formattedScore)}>
                          <span className={`font-semibold ${getScoreColor(formattedScore)}`}>
                            {formattedScore}/100
                          </span>
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-none">
                        <span className="text-sm text-muted-foreground">
                          {company.scoring_reason || "Scoring analysis is being generated for this company."}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Edit Button for IITBombay */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleEditClick(e, company)}
                          className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteClick(e, company.id)}
                          disabled={isCompanyDeleting || isDeleting}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }
  // New table format for non-IIT Bombay users
  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Companies Prospects</h3>
              <p className="text-sm text-muted-foreground">
                {localCompanies.length} companies found
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold w-[100px]">Company</TableHead>
                <TableHead className="font-semibold w-[100px]">Industry</TableHead>
                <TableHead className="font-semibold w-[80px]">Score</TableHead>
                <TableHead className="font-semibold w-[100px]">Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {localCompanies.map((company) => {
                const formattedScore = Math.round(company.overall_score);
                const companyDetails = (company as any).company_details;
                const status = companyDetails?.status || 'New';
                const isCompanyDeleting = deletingCompanies.has(company.id);
                const industry = company.industry || "—";

                return (
                  <TableRow
                    key={company.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onCompanyClick(company.id)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{company.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{industry}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge className={getScoreBadgeColor(formattedScore)}>
                          <span className={`font-semibold text-xs ${getScoreColor(formattedScore)}`}>
                            {formattedScore}
                          </span>
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(status)}>
                        <span className="text-xs font-medium">{status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Edit Button for non-IITBombay users */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleEditClick(e, company)}
                          className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteClick(e, company.id)}
                          disabled={isCompanyDeleting || isDeleting}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Re-added EditCompanyDialog component */}
      <EditCompanyDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        companyId={selectedCompanyForEdit?.id || ""}
        currentTeamMember={selectedCompanyForEdit?.teamMember || ""}
        currentStatus={selectedCompanyForEdit?.status || "New"}
        onUpdate={(teamMember, status) => {
          if (selectedCompanyForEdit) {
            handleCompanyUpdate(selectedCompanyForEdit.id, teamMember, status);
          }
        }}
      />
    </>
  );
}
