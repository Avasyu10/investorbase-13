
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Rocket, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function EurekaSampleButton() {
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFormSlug, setSelectedFormSlug] = useState<string>("");

  // Fetch available BARC forms that can be used for Eureka sample
  const { data: forms, isLoading } = useQuery({
    queryKey: ['barc-forms-for-eureka'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_submission_forms')
        .select('*')
        .eq('form_type', 'barc')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const handleNavigateToForm = () => {
    if (!selectedFormSlug) {
      toast.error("Please select a form first");
      return;
    }
    
    setIsDialogOpen(false);
    navigate(`/eureka-sample/${selectedFormSlug}`);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Rocket className="h-4 w-4" />
          Eureka Sample
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Eureka Sample Form</DialogTitle>
          <DialogDescription>
            Choose which form template you'd like to use for the Eureka sample application.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium">Available Forms:</label>
              <Select value={selectedFormSlug} onValueChange={setSelectedFormSlug}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a form template" />
                </SelectTrigger>
                <SelectContent>
                  {forms?.map((form) => (
                    <SelectItem key={form.id} value={form.form_slug}>
                      {form.form_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleNavigateToForm} disabled={!selectedFormSlug || isLoading}>
              Go to Form
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
