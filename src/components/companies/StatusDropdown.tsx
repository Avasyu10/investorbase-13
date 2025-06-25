
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit3, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StatusDropdownProps {
  companyId: string;
  currentStatus: string;
  onStatusChange: (companyId: string, newStatus: string) => void; // FIXED: Add this prop
}

const STATUS_OPTIONS = [
  "Partner Meeting",
  "Term Sheet Offer", 
  "Due Diligence",
  "Closing",
  "Exit"
];

export function StatusDropdown({ companyId, currentStatus, onStatusChange }: StatusDropdownProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleStatusUpdate = async (newStatus: string) => {
    if (newStatus === currentStatus || isUpdating) return;

    setIsUpdating(true);

    try {
      // First, check if company_details record exists
      const { data: existingDetails, error: fetchError } = await supabase
        .from('company_details')
        .select('id')
        .eq('company_id', companyId)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (existingDetails) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('company_details')
          .update({ 
            status: newStatus,
            status_date: new Date().toISOString()
          })
          .eq('company_id', companyId);

        if (updateError) throw updateError;
      } else {
        // Create new record if it doesn't exist
        const { error: insertError } = await supabase
          .from('company_details')
          .insert({
            company_id: companyId,
            status: newStatus,
            status_date: new Date().toISOString()
          });

        if (insertError) throw insertError;
      }

      toast({
        title: "Status updated",
        description: `Company status changed to ${newStatus}`,
      });

      // FIXED: Call the callback to update parent component state
      onStatusChange(companyId, newStatus);

    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update company status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={isUpdating}
          className="h-8 w-8 p-0 hover:bg-muted"
        >
          {isUpdating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Edit3 className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {STATUS_OPTIONS.map((status) => (
          <DropdownMenuItem
            key={status}
            onClick={() => handleStatusUpdate(status)}
            className="flex items-center justify-between cursor-pointer"
          >
            <span>{status}</span>
            {currentStatus === status && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
