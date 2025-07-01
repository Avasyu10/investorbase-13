import { useState, useEffect } from "react"; // Added useEffect for resetting status
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// Removed Input import as it's no longer needed
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EditCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  // currentTeamMember is removed as it's no longer relevant
  currentStatus: string;
  // onUpdate now only expects status
  onUpdate: (status: string) => void;
}

const STATUS_OPTIONS = [
  "New",
  "Contacted",
  "Meeting Scheduled",
  "Under Review",
  "Interested",
  "Passed",
  "Partner Meeting",
  "Term Sheet Offer",
  "Due Diligence",
  "Closing",
  "Exit",
  "Deck Evaluated"
];

export function EditCompanyDialog({
  open,
  onOpenChange,
  companyId,
  // currentTeamMember prop is removed
  currentStatus,
  onUpdate,
}: EditCompanyDialogProps) {
  // teamMember state is removed
  const [status, setStatus] = useState(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  // Reset status when dialog opens or currentStatus changes
  useEffect(() => {
    if (open) {
      setStatus(currentStatus);
    }
  }, [open, currentStatus]);

  const handleSave = async () => {
    if (isUpdating) return;

    setIsUpdating(true);

    try {
      // Check if company_details record exists
      const { data: existingDetails, error: fetchError } = await supabase
        .from('company_details')
        .select('id')
        .eq('company_id', companyId)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (existingDetails) {
        // Update existing record, only changing status and status_date
        const { error: updateError } = await supabase
          .from('company_details')
          .update({
            status: status,
            status_date: new Date().toISOString(),
            // teammember_name is removed from update payload
          })
          .eq('company_id', companyId);

        if (updateError) throw updateError;
      } else {
        // Create new record if it doesn't exist, only inserting status and status_date
        const { error: insertError } = await supabase
          .from('company_details')
          .insert({
            company_id: companyId,
            status: status,
            status_date: new Date().toISOString(),
            // teammember_name is removed from insert payload
          });

        if (insertError) throw insertError;
      }

      toast({
        title: "Company updated",
        description: "Status has been updated successfully", // Updated description
      });

      // Call the callback to update parent component state, only passing status
      onUpdate(status);
      onOpenChange(false);

    } catch (error: any) {
      console.error('Error updating company:', error);
      toast({
        title: "Error",
        description: "Failed to update company details",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Company Status</DialogTitle> {/* Updated title */}
          <DialogDescription>
            Update the status for this company. {/* Updated description */}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Removed the Team POC input field */}
          {/*
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="team-member" className="text-right">
              Team POC
            </Label>
            <Input
              id="team-member"
              value={teamMember}
              onChange={(e) => setTeamMember(e.target.value)}
              className="col-span-3"
              placeholder="Enter team member name"
            />
          </div>
          */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((statusOption) => (
                  <SelectItem key={statusOption} value={statusOption}>
                    {statusOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isUpdating}>
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
