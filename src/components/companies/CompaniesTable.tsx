
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Company } from "@/lib/api/apiContract";
import { format, formatDistanceToNow } from "date-fns";
import { Star, Trash, Phone, Mail, Globe } from "lucide-react";
import { StatusDropdown } from "./StatusDropdown";
import { TeamMemberInput } from "./TeamMemberInput";
import { useState, useEffect } from "react";

interface CompaniesTableProps {
  companies: Company[];
  onCompanyClick: (companyId: string) => void;
  onDeleteCompany?: (companyId: string) => void;
  isIITBombay?: boolean;
}

export function CompaniesTable({ companies, onCompanyClick, onDeleteCompany, isIITBombay = false }: CompaniesTableProps) {
  const [localCompanies, setLocalCompanies] = useState(companies);

  // Update local state when companies prop changes
  useEffect(() => {
    setLocalCompanies(companies);
  }, [companies]);

  const getScoreColor = (score: number): string => {
    if (score >= 90) return "text-emerald-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 50) return "text-amber-600";
    if (score >= 30) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBadgeColor = (score: number): string => {
    if (score >= 90) return "bg-emerald-100 text-emerald-800";
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

  const getSummaryPoints = (assessmentPoints?: string[]): string[] => {
    if (!assessmentPoints || assessmentPoints.length === 0) {
      return [
        "Assessment analysis is being generated for this company.",
        "Initial evaluation shows potential for growth opportunities."
      ];
    }
    return assessmentPoints.slice(0, 2);
  };

  const handleDeleteClick = (e: React.MouseEvent, companyId: string) => {
    e.stopPropagation(); // Prevent row click event
    if (onDeleteCompany) {
      onDeleteCompany(companyId);
    }
  };

  const formatStatusChanged = (statusDate?: string, createdAt?: string) => {
    const dateToUse = statusDate || createdAt;
    if (!dateToUse) return "—";
    
    try {
      return formatDistanceToNow(new Date(dateToUse), { addSuffix: true });
    } catch (error) {
      return "—";
    }
  };

  const handleStatusUpdate = (companyId: string, newStatus: string) => {
    // Update local state to reflect the change immediately
    setLocalCompanies(prev => prev.map(company => {
      if (company.id === companyId) {
        return {
          ...company,
          company_details: {
            ...(company as any).company_details,
            status: newStatus,
            status_date: new Date().toISOString()
          }
        };
      }
      return company;
    }));
  };

  const handleTeamMemberUpdate = (companyId: string, newTeamMember: string) => {
    // Update local state to reflect the change immediately
    setLocalCompanies(prev => prev.map(company => {
      if (company.id === companyId) {
        return {
          ...company,
          company_details: {
            ...(company as any).company_details,
            teammember_name: newTeamMember
          }
        };
      }
      return company;
    }));
  };

  if (isIITBombay) {
    return (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Company Name</TableHead>
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Phone Number</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Industry</TableHead>
                <TableHead className="font-semibold">Score</TableHead>
                <TableHead className="font-semibold">Summary</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {localCompanies.map((company) => {
                const formattedScore = Math.round(company.overall_score);
                const summaryPoints = getSummaryPoints(company.assessment_points);
                
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
                      <div className="space-y-1">
                        {summaryPoints.map((point, index) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <span className="text-primary mt-1">•</span>
                            <span className="text-muted-foreground line-clamp-2">{point}</span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDeleteClick(e, company.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
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
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold w-[160px]">Company</TableHead>
              <TableHead className="font-semibold w-[140px]">Contact</TableHead>
              <TableHead className="font-semibold w-[160px]">Email</TableHead>
              <TableHead className="font-semibold w-[100px]">Source</TableHead>
              <TableHead className="font-semibold w-[120px]">Industry</TableHead>
              <TableHead className="font-semibold w-[100px]">Score</TableHead>
              <TableHead className="font-semibold w-[120px]">Status</TableHead>
              <TableHead className="font-semibold w-[140px]">Status Changed</TableHead>
              <TableHead className="font-semibold w-[160px]">Team Member Interacting</TableHead>
              <TableHead className="font-semibold">Notes</TableHead>
              <TableHead className="font-semibold w-[80px]">Edit Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {localCompanies.map((company) => {
              const formattedScore = Math.round(company.overall_score);
              const companyDetails = (company as any).company_details;
              // Fix: Use 'New' as default only if no company_details exist or status is null/undefined
              const status = companyDetails?.status || 'New';
              const contactInfo = companyDetails?.point_of_contact || (company as any).poc_name || '';
              const contactEmail = companyDetails?.contact_email || (company as any).email || '';
              // Display industry directly from public_form_submissions
              const industry = company.industry || "—";
              const assessmentPoints = getSummaryPoints(company.assessment_points);
              const teamMemberName = companyDetails?.teammember_name || '';
              
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
                    <div className="flex flex-col gap-1">
                      {contactInfo && (
                        <span className="text-sm">{contactInfo}</span>
                      )}
                      {(company as any).phonenumber && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{(company as any).phonenumber}</span>
                        </div>
                      )}
                      {!contactInfo && !(company as any).phonenumber && (
                        <span className="text-sm">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {contactEmail ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate">{contactEmail}</span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs">
                      {company.source || 'Dashboard'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{industry}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
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
                    <span className="text-xs text-muted-foreground">
                      {formatStatusChanged(companyDetails?.status_date, company.created_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div 
                      className="w-full"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <TeamMemberInput
                        companyId={company.id}
                        currentTeamMember={teamMemberName}
                        onTeamMemberUpdate={(newTeamMember) => handleTeamMemberUpdate(company.id, newTeamMember)}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px]">
                      {assessmentPoints.length > 0 ? (
                        <div className="space-y-1">
                          {assessmentPoints.map((point, index) => (
                            <div key={index} className="flex items-start gap-1 text-xs">
                              <span className="text-primary mt-1">•</span>
                              <span className="text-muted-foreground line-clamp-2">{point}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No assessment points</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div 
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <StatusDropdown
                        companyId={company.id}
                        currentStatus={status}
                        onStatusUpdate={(newStatus) => handleStatusUpdate(company.id, newStatus)}
                      />
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
