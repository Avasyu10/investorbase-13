
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit3, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TeamMemberInputProps {
  companyId: string;
  currentTeamMember?: string;
  onTeamMemberUpdate?: (newTeamMember: string) => void;
}

export function TeamMemberInput({ companyId, currentTeamMember = "", onTeamMemberUpdate }: TeamMemberInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [teamMemberName, setTeamMemberName] = useState(currentTeamMember);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (isUpdating) return;

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
          .update({ teammember_name: teamMemberName.trim() || null })
          .eq('company_id', companyId);

        if (updateError) throw updateError;
      } else {
        // Create new record if it doesn't exist
        const { error: insertError } = await supabase
          .from('company_details')
          .insert({
            company_id: companyId,
            teammember_name: teamMemberName.trim() || null
          });

        if (insertError) throw insertError;
      }

      toast({
        title: "Team member updated",
        description: `Team member set to ${teamMemberName.trim() || 'None'}`,
      });

      // Call the callback to update parent component state
      onTeamMemberUpdate?.(teamMemberName.trim());
      setIsEditing(false);

    } catch (error) {
      console.error('Error updating team member:', error);
      toast({
        title: "Error",
        description: "Failed to update team member",
        variant: "destructive",
      });
      // Reset to original value on error
      setTeamMemberName(currentTeamMember);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setTeamMemberName(currentTeamMember);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 w-full">
        <Input
          value={teamMemberName}
          onChange={(e) => setTeamMemberName(e.target.value)}
          placeholder="Enter team member name"
          className="h-8 text-xs"
          disabled={isUpdating}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSave}
          disabled={isUpdating}
          className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
        >
          {isUpdating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={isUpdating}
          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 group">
      <span className="text-sm text-muted-foreground min-w-0 flex-1">
        {currentTeamMember || "—"}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsEditing(true)}
        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
      >
        <Edit3 className="h-3 w-3" />
      </Button>
    </div>
  );
}
