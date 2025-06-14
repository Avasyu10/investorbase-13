
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus } from "lucide-react";

interface CreateBarcFormButtonProps {
  onFormCreated: (formSlug: string) => void;
}

export const CreateBarcFormButton = ({ onFormCreated }: CreateBarcFormButtonProps) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [formName, setFormName] = useState("IIT Bombay BARC Applications");
  const [formSlug, setFormSlug] = useState("iit-bombay-barc-applications");
  const [isCreating, setIsCreating] = useState(false);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormName(name);
    setFormSlug(generateSlug(name));
  };

  const createForm = async () => {
    if (!user || !formName || !formSlug) return;

    setIsCreating(true);
    try {
      // First check if a form with this slug already exists
      const { data: existingForm } = await supabase
        .from('public_submission_forms')
        .select('id')
        .eq('form_slug', formSlug)
        .maybeSingle();

      if (existingForm) {
        toast.error("A form with this URL already exists. Please choose a different name.");
        setIsCreating(false);
        return;
      }

      const { data, error } = await supabase
        .from('public_submission_forms')
        .insert({
          form_name: formName,
          form_slug: formSlug,
          form_type: 'barc',
          auto_analyze: true,
          user_id: user.id,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("BARC form created successfully!");
      onFormCreated(formSlug);
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error creating BARC form:', error);
      toast.error(`Failed to create form: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Create BARC Form
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create IIT Bombay BARC Form</DialogTitle>
          <DialogDescription>
            Create a dedicated BARC application form for IIT Bombay submissions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="formName">Form Name</Label>
            <Input
              id="formName"
              value={formName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., IIT Bombay BARC Applications"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="formSlug">Form URL Slug</Label>
            <Input
              id="formSlug"
              value={formSlug}
              onChange={(e) => setFormSlug(e.target.value)}
              placeholder="e.g., iit-bombay-barc-applications"
            />
            <p className="text-sm text-muted-foreground">
              This will be used in the URL: /barc-submit/{formSlug}
            </p>
          </div>
          <Button 
            onClick={createForm}
            disabled={!formName || !formSlug || isCreating}
            className="w-full"
          >
            {isCreating ? "Creating..." : "Create Form"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
