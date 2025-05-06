
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CompanyListItem } from "@/lib/api/apiContract";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Edit2 } from "lucide-react";

interface CrmData {
  point_of_contact: string | null;
  contact_email: string | null;
  source_of_introduction: string | null;
  linkedin_url: string | null;
  industry: string | null;
  status: string;
  status_date: string;
  account_manager: string | null;
  notes: string | null;
}

interface CompanyCrmTableProps {
  companies: CompanyListItem[];
  onCompanyClick: (companyId: number) => void;
}

const INDUSTRY_OPTIONS = [
  "SaaS", "Fintech", "Healthcare", "E-commerce", "AI/ML", 
  "Education", "Enterprise", "Consumer", "Hardware", "Clean Tech", "Other"
];

const STATUS_OPTIONS = [
  "New", "Contacted", "Meeting Scheduled", "In Review", "Interested", "Not Interested", "Passed"
];

export function CompanyCrmTable({ companies, onCompanyClick }: CompanyCrmTableProps) {
  const [editingCompany, setEditingCompany] = useState<{ id: string, crmData: CrmData } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const { toast } = useToast();

  const handleEditClick = async (company: CompanyListItem, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click when clicking on edit button
    
    try {
      // Fetch existing CRM data for this company
      const { data, error } = await supabase
        .from('company_details')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching company details:", error);
        throw error;
      }
      
      // Set the editing company with existing data or default values
      setEditingCompany({
        id: company.id.toString(),
        crmData: {
          point_of_contact: data?.point_of_contact || "",
          contact_email: data?.contact_email || "",
          source_of_introduction: data?.source_of_introduction || "",
          linkedin_url: data?.linkedin_url || "",
          industry: data?.industry || "",
          status: data?.status || "New",
          status_date: data?.status_date || new Date().toISOString(),
          account_manager: data?.account_manager || "",
          notes: data?.notes || ""
        }
      });
      
      setIsDialogOpen(true);
    } catch (err) {
      console.error("Failed to load company details for editing:", err);
      toast({
        title: "Error",
        description: "Failed to load company details",
        variant: "destructive"
      });
    }
  };
  
  const handleSave = async () => {
    if (!editingCompany) return;
    
    try {
      // Check if we need to update status_date (only if status has changed)
      const { data: existingData } = await supabase
        .from('company_details')
        .select('status')
        .eq('company_id', editingCompany.id)
        .maybeSingle();
        
      const updateData = { ...editingCompany.crmData };
      
      // If status has changed, update the status_date
      if (existingData?.status !== updateData.status) {
        updateData.status_date = new Date().toISOString();
      }
      
      // First check if there is an existing record
      const { data: existingRecord } = await supabase
        .from('company_details')
        .select('id')
        .eq('company_id', editingCompany.id)
        .maybeSingle();
      
      let result;
      
      if (existingRecord) {
        // Update existing record
        result = await supabase
          .from('company_details')
          .update({
            ...updateData
          })
          .eq('company_id', editingCompany.id);
      } else {
        // Insert new record
        result = await supabase
          .from('company_details')
          .insert({
            company_id: editingCompany.id,
            ...updateData
          });
      }
      
      const { error } = result;
      
      if (error) {
        console.error("Error updating company details:", error);
        throw error;
      }
      
      setIsDialogOpen(false);
      setEditingCompany(null);
      
      // Trigger a refresh of the CRM fields
      setRefreshTrigger(prev => prev + 1);
      
      toast({
        title: "Success",
        description: "Company details updated successfully",
      });
      
    } catch (err) {
      console.error("Failed to save company details:", err);
      toast({
        title: "Error",
        description: "Failed to save company details",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return dateString;
    }
  };

  if (!companies || companies.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No companies found</p>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">Company</TableHead>
              <TableHead className="w-[120px]">Contact</TableHead>
              <TableHead className="w-[150px]">Email</TableHead>
              <TableHead className="w-[120px]">Source</TableHead>
              <TableHead className="w-[100px]">Industry</TableHead>
              <TableHead className="w-[120px]">LinkedIn</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[120px]">Status Date</TableHead>
              <TableHead className="w-[120px]">Account Manager</TableHead>
              <TableHead className="w-[150px]">Notes</TableHead>
              <TableHead className="w-[50px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => (
              <TableRow
                key={company.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onCompanyClick(company.id)}
              >
                <TableCell className="font-medium">{company.name}</TableCell>
                <TableCell className="max-w-[120px] truncate" title="Point of Contact">
                  <CompanyCrmField 
                    companyId={company.id.toString()} 
                    field="point_of_contact" 
                    refreshTrigger={refreshTrigger}
                  />
                </TableCell>
                <TableCell className="max-w-[150px] truncate" title="Contact Email">
                  <CompanyCrmField 
                    companyId={company.id.toString()} 
                    field="contact_email"
                    isEmail={true}
                    refreshTrigger={refreshTrigger}
                  />
                </TableCell>
                <TableCell className="max-w-[120px] truncate" title="Source of Introduction">
                  <CompanyCrmField 
                    companyId={company.id.toString()} 
                    field="source_of_introduction"
                    refreshTrigger={refreshTrigger}
                  />
                </TableCell>
                <TableCell title="Industry">
                  <CompanyCrmField 
                    companyId={company.id.toString()} 
                    field="industry"
                    refreshTrigger={refreshTrigger}
                  />
                </TableCell>
                <TableCell title="LinkedIn URL">
                  <CompanyCrmField 
                    companyId={company.id.toString()} 
                    field="linkedin_url"
                    isUrl={true}
                    refreshTrigger={refreshTrigger}
                  />
                </TableCell>
                <TableCell title="Status">
                  <CompanyCrmField 
                    companyId={company.id.toString()} 
                    field="status"
                    refreshTrigger={refreshTrigger}
                  />
                </TableCell>
                <TableCell title="Status Date">
                  <CompanyCrmField 
                    companyId={company.id.toString()} 
                    field="status_date"
                    isDate={true}
                    refreshTrigger={refreshTrigger}
                  />
                </TableCell>
                <TableCell className="max-w-[120px] truncate" title="Account Manager">
                  <CompanyCrmField 
                    companyId={company.id.toString()} 
                    field="account_manager"
                    refreshTrigger={refreshTrigger}
                  />
                </TableCell>
                <TableCell className="max-w-[150px] truncate" title="Notes">
                  <CompanyCrmField 
                    companyId={company.id.toString()} 
                    field="notes"
                    refreshTrigger={refreshTrigger}
                  />
                </TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => handleEditClick(company, e)}
                  >
                    <Edit2 className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md md:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Company Details</DialogTitle>
          </DialogHeader>
          {editingCompany && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="point_of_contact" className="text-sm font-medium">
                    Point of Contact
                  </label>
                  <Input
                    id="point_of_contact"
                    value={editingCompany.crmData.point_of_contact || ""}
                    onChange={(e) => setEditingCompany({
                      ...editingCompany,
                      crmData: { ...editingCompany.crmData, point_of_contact: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="contact_email" className="text-sm font-medium">
                    Contact Email
                  </label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={editingCompany.crmData.contact_email || ""}
                    onChange={(e) => setEditingCompany({
                      ...editingCompany,
                      crmData: { ...editingCompany.crmData, contact_email: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="source_of_introduction" className="text-sm font-medium">
                    Source of Introduction
                  </label>
                  <Input
                    id="source_of_introduction"
                    value={editingCompany.crmData.source_of_introduction || ""}
                    onChange={(e) => setEditingCompany({
                      ...editingCompany,
                      crmData: { ...editingCompany.crmData, source_of_introduction: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="linkedin_url" className="text-sm font-medium">
                    LinkedIn URL
                  </label>
                  <Input
                    id="linkedin_url"
                    value={editingCompany.crmData.linkedin_url || ""}
                    onChange={(e) => setEditingCompany({
                      ...editingCompany,
                      crmData: { ...editingCompany.crmData, linkedin_url: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="industry" className="text-sm font-medium">
                    Industry
                  </label>
                  <Select
                    value={editingCompany.crmData.industry || ""}
                    onValueChange={(value) => setEditingCompany({
                      ...editingCompany,
                      crmData: { ...editingCompany.crmData, industry: value }
                    })}
                  >
                    <SelectTrigger id="industry">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRY_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="status" className="text-sm font-medium">
                    Status
                  </label>
                  <Select
                    value={editingCompany.crmData.status}
                    onValueChange={(value) => setEditingCompany({
                      ...editingCompany,
                      crmData: { ...editingCompany.crmData, status: value }
                    })}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="account_manager" className="text-sm font-medium">
                  Account Manager
                </label>
                <Input
                  id="account_manager"
                  value={editingCompany.crmData.account_manager || ""}
                  onChange={(e) => setEditingCompany({
                    ...editingCompany,
                    crmData: { ...editingCompany.crmData, account_manager: e.target.value }
                  })}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="notes" className="text-sm font-medium">
                  Notes
                </label>
                <Textarea
                  id="notes"
                  rows={3}
                  value={editingCompany.crmData.notes || ""}
                  onChange={(e) => setEditingCompany({
                    ...editingCompany,
                    crmData: { ...editingCompany.crmData, notes: e.target.value }
                  })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Helper component to display CRM fields with data fetched from the database
function CompanyCrmField({ 
  companyId, 
  field, 
  isUrl = false, 
  isEmail = false,
  isDate = false,
  refreshTrigger = 0
}: { 
  companyId: string; 
  field: keyof CrmData; 
  isUrl?: boolean;
  isEmail?: boolean;
  isDate?: boolean;
  refreshTrigger?: number;
}) {
  const [value, setValue] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the field value when the component mounts or when refreshTrigger changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('company_details')
          .select(field)
          .eq('company_id', companyId)
          .maybeSingle();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          console.error(`Error fetching ${field}:`, error);
        }
        
        setValue(data?.[field] || null);
      } catch (err) {
        console.error(`Error in ${field} fetch:`, err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [companyId, field, refreshTrigger]);

  if (isLoading) {
    return <span className="text-muted-foreground italic">Loading...</span>;
  }

  if (!value) {
    return <span className="text-muted-foreground italic">—</span>;
  }

  if (isUrl) {
    try {
      return (
        <a 
          href={value.startsWith('http') ? value : `https://${value}`}
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline flex items-center"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="truncate">{new URL(value.startsWith('http') ? value : `https://${value}`).hostname}</span>
          <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
        </a>
      );
    } catch {
      return (
        <a 
          href={value.startsWith('http') ? value : `https://${value}`}
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline flex items-center"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="truncate">{value}</span>
          <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
        </a>
      );
    }
  }

  if (isEmail) {
    return (
      <a 
        href={`mailto:${value}`}
        className="text-blue-500 hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {value}
      </a>
    );
  }

  if (isDate && value) {
    try {
      return <span>{formatDistanceToNow(new Date(value), { addSuffix: true })}</span>;
    } catch {
      return <span>{value}</span>;
    }
  }

  return <span className="truncate">{value}</span>;
}

