
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Trash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface FormCardProps {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  onDelete: () => void;
}

export function FormCard({ id, name, slug, createdAt, onDelete }: FormCardProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const formattedDate = new Date(createdAt).toLocaleDateString();
  const baseUrl = window.location.origin;
  const formUrl = `${baseUrl}/public-form/${slug}`;

  const copyFormUrl = () => {
    navigator.clipboard.writeText(formUrl);
    toast.success("Form URL copied to clipboard");
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      const { error } = await supabase
        .from('public_submission_forms')
        .delete()
        .eq('id', id);
        
      if (error) {
        throw error;
      }
      
      toast.success("Form deleted successfully");
      onDelete();
    } catch (error) {
      console.error("Error deleting form:", error);
      toast.error("Failed to delete form");
    } finally {
      setIsDeleting(false);
      setIsConfirmOpen(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="line-clamp-1">{name}</CardTitle>
          <CardDescription>Created on {formattedDate}</CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="text-sm text-muted-foreground mb-2">Form URL:</div>
          <div className="flex items-center gap-2">
            <div className="bg-muted px-3 py-1 rounded text-sm truncate flex-1">
              {formUrl}
            </div>
            <Button variant="outline" size="icon" onClick={copyFormUrl}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
        
        <CardFooter className="justify-end">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsConfirmOpen(true)}
          >
            <Trash className="h-4 w-4 mr-2" />
            Delete Form
          </Button>
        </CardFooter>
      </Card>
      
      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title="Delete Form"
        description="Are you sure you want to delete this form? All related submissions will remain in your account."
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </>
  );
}
