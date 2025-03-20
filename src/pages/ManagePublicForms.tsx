
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { FormCard } from "@/components/forms/FormCard";
import { CreatePublicFormModal } from "@/components/forms/CreatePublicFormModal";
import { ChevronLeft, Loader2, Plus } from "lucide-react";

interface PublicForm {
  id: string;
  form_name: string;
  form_slug: string;
  created_at: string;
}

const ManagePublicForms = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [forms, setForms] = useState<PublicForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { state: { from: '/manage-forms' } });
    }
    
    if (user) {
      loadForms();
    }
  }, [user, authLoading, navigate]);

  const loadForms = async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('public_submission_forms')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      setForms(data || []);
    } catch (error) {
      console.error("Error loading forms:", error);
      toast.error("Failed to load your forms");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormCreated = (formSlug: string) => {
    loadForms();
    toast.success("Form created successfully", {
      action: {
        label: "View Form",
        onClick: () => window.open(`/public-form/${formSlug}`, '_blank')
      }
    });
  };

  const handleBackClick = () => {
    navigate(-1); // Navigate to the previous page
  };

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) return null; // Will redirect in useEffect

  return (
    <div className="animate-fade-in">
      <div className="container mx-auto px-4 py-6">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBackClick}
          className="mb-6"
        >
          <ChevronLeft className="mr-1" /> Back
        </Button>
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Manage Public Submission Forms</h1>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Create Form
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : forms.length === 0 ? (
          <div className="bg-muted rounded-lg p-8 text-center">
            <h3 className="text-lg font-medium mb-2">No forms created yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first public submission form to allow others to submit pitch decks to you.
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create Form
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map((form) => (
              <FormCard
                key={form.id}
                id={form.id}
                name={form.form_name}
                slug={form.form_slug}
                createdAt={form.created_at}
                onDelete={loadForms}
              />
            ))}
          </div>
        )}
        
        <CreatePublicFormModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          onSuccess={handleFormCreated}
        />
      </div>
    </div>
  );
};

export default ManagePublicForms;
