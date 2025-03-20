
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreatePublicFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (formSlug: string) => void;
}

export function CreatePublicFormModal({ 
  open, 
  onOpenChange, 
  onSuccess 
}: CreatePublicFormModalProps) {
  const [formName, setFormName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  const handleCreateForm = async () => {
    if (!formName.trim()) {
      toast.error("Please enter a form name");
      return;
    }

    setIsCreating(true);

    try {
      // Generate a slug from the form name
      const formSlug = formName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        + '-' + Date.now().toString().slice(-6);

      // Create the form in the database
      const { data, error } = await supabase
        .from('public_submission_forms')
        .insert({
          form_name: formName,
          form_slug: formSlug
        })
        .select('id, form_slug')
        .single();

      if (error) {
        console.error("Error creating form:", error);
        toast.error("Failed to create form", {
          description: error.message
        });
        return;
      }

      toast.success("Form created successfully", {
        description: "Your public submission form is now ready to share"
      });

      onOpenChange(false);
      
      if (onSuccess) {
        onSuccess(data.form_slug);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Public Submission Form</DialogTitle>
          <DialogDescription>
            Create a custom form that others can use to submit pitch decks to you.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="form-name">Form Name</Label>
            <Input
              id="form-name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="E.g., Startup Pitch Form"
            />
            <p className="text-sm text-muted-foreground">
              This name will be displayed on the submission form
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateForm} 
            disabled={isCreating || !formName.trim()}
          >
            {isCreating ? "Creating..." : "Create Form"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
