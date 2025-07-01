
import { useState, useEffect } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { CompanyListItem } from "@/lib/api/apiContract";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

interface BitsCrmTableProps {
  companies: CompanyListItem[];
  onCompanyClick: (companyId: string) => void;
  onDeleteCompany: (companyId: string) => void;
}

export function BitsCrmTable({ companies, onCompanyClick, onDeleteCompany }: BitsCrmTableProps) {
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; companyId: string; companyName: string }>({
    isOpen: false,
    companyId: '',
    companyName: ''
  });
  const { toast } = useToast();

  const handleDeleteClick = (company: CompanyListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteDialog({
      isOpen: true,
      companyId: company.id,
      companyName: company.name
    });
  };

  const confirmDelete = async () => {
    try {
      await onDeleteCompany(deleteDialog.companyId);
      toast({
        title: "Success",
        description: "Company deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete company",
        variant: "destructive"
      });
    } finally {
      setDeleteDialog({ isOpen: false, companyId: '', companyName: '' });
    }
  };

  // Helper function to extract stage from response_received
  const extractStage = (responseReceived: string | null) => {
    if (!responseReceived) return "Unknown";
    
    // Look for common stage indicators in the response
    const stageKeywords = {
      'pre-seed': ['pre-seed', 'preseed', 'pre seed'],
      'seed': ['seed'],
      'series a': ['series a', 'series-a'],
      'series b': ['series b', 'series-b'],
      'growth': ['growth', 'late stage'],
      'mvp': ['mvp', 'minimum viable product'],
      'prototype': ['prototype', 'proof of concept', 'poc'],
      'revenue': ['revenue', 'paying customers'],
      'early': ['early stage', 'startup', 'early'],
    };

    const lowerResponse = responseReceived.toLowerCase();
    
    for (const [stage, keywords] of Object.entries(stageKeywords)) {
      if (keywords.some(keyword => lowerResponse.includes(keyword))) {
        return stage.charAt(0).toUpperCase() + stage.slice(1);
      }
    }
    
    return "Early Stage";
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
              return (
                <TableRow
                  key={company.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onCompanyClick(company.id)}
                >
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell>
                    <CompanyCrmField 
                      companyId={company.id.toString()} 
                      field="industry"
                      refreshTrigger={refreshTrigger}
                      fallback={company.industry || "Unknown"}
                    />
                  </TableCell>
                  <TableCell>
                    <CompanyStageField 
                      companyId={company.id.toString()}
                      refreshTrigger={refreshTrigger}
                    />
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {company.overall_score ? company.overall_score.toFixed(1) : "N/A"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <CompanyCrmField 
                      companyId={company.id.toString()} 
                      field="status"
                      refreshTrigger={refreshTrigger}
                      fallback="New"
                    />
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => handleDeleteClick(company, e)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={deleteDialog.isOpen} onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Company</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog.companyName}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ isOpen: false, companyId: '', companyName: '' })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Helper component to display CRM fields
function CompanyCrmField({ 
  companyId, 
  field, 
  refreshTrigger = 0,
  fallback = ""
}: { 
  companyId: string; 
  field: string;
  refreshTrigger?: number;
  fallback?: string;
}) {
  const [value, setValue] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('company_details')
          .select(field)
          .eq('company_id', companyId)
          .maybeSingle();
        
        if (error && error.code !== 'PGRST116') {
          console.error(`Error fetching ${field}:`, error);
        }
        
        setValue(data?.[field] || fallback || null);
      } catch (err) {
        console.error(`Error in ${field} fetch:`, err);
        setValue(fallback || null);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [companyId, field, refreshTrigger, fallback]);

  if (isLoading) {
    return <span className="text-muted-foreground italic">Loading...</span>;
  }

  if (!value) {
    return <span className="text-muted-foreground italic">—</span>;
  }

  return <span className="truncate">{value}</span>;
}

// Helper component to display stage extracted from response_received
function CompanyStageField({ 
  companyId, 
  refreshTrigger = 0
}: { 
  companyId: string;
  refreshTrigger?: number;
}) {
  const [stage, setStage] = useState<string>("Unknown");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('companies')
          .select('response_received')
          .eq('id', companyId)
          .maybeSingle();
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching response_received:', error);
        }
        
        const extractedStage = extractStage(data?.response_received);
        setStage(extractedStage);
      } catch (err) {
        console.error('Error in stage fetch:', err);
        setStage("Unknown");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [companyId, refreshTrigger]);

  // Helper function to extract stage from response_received
  const extractStage = (responseReceived: string | null) => {
    if (!responseReceived) return "Unknown";
    
    const stageKeywords = {
      'Pre-Seed': ['pre-seed', 'preseed', 'pre seed'],
      'Seed': ['seed'],
      'Series A': ['series a', 'series-a'],
      'Series B': ['series b', 'series-b'],
      'Growth': ['growth', 'late stage'],
      'MVP': ['mvp', 'minimum viable product'],
      'Prototype': ['prototype', 'proof of concept', 'poc'],
      'Revenue': ['revenue', 'paying customers'],
      'Early Stage': ['early stage', 'startup', 'early'],
    };

    const lowerResponse = responseReceived.toLowerCase();
    
    for (const [stage, keywords] of Object.entries(stageKeywords)) {
      if (keywords.some(keyword => lowerResponse.includes(keyword))) {
        return stage;
      }
    }
    
    return "Early Stage";
  };

  if (isLoading) {
    return <span className="text-muted-foreground italic">Loading...</span>;
  }

  return <span className="truncate">{stage}</span>;
}
