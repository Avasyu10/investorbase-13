import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Copy, ExternalLink, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const PublicForms = () => {
  const { user } = useAuth();
  const [newFormName, setNewFormName] = useState("");
  const [newFormSlug, setNewFormSlug] = useState("");
  const [newFormType, setNewFormType] = useState("general");
  const [autoAnalyze, setAutoAnalyze] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch user's public forms - only forms owned by the current user
  const { data: forms, isLoading } = useQuery({
    queryKey: ['public-forms', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('public_submission_forms')
        .select('*')
        .eq('user_id', user.id) // Only fetch forms owned by current user
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Create new form mutation
  const createFormMutation = useMutation({
    mutationFn: async ({ name, slug, formType, autoAnalyze }: { name: string, slug: string, formType: string, autoAnalyze: boolean }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('public_submission_forms')
        .insert({
          form_name: name,
          form_slug: slug,
          form_type: formType,
          auto_analyze: autoAnalyze,
          user_id: user.id,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-forms'] });
      setNewFormName("");
      setNewFormSlug("");
      setNewFormType("general");
      setAutoAnalyze(false);
      setIsCreateDialogOpen(false);
      toast.success("Form created successfully!");
    },
    onError: (error: any) => {
      toast.error(`Failed to create form: ${error.message}`);
    }
  });

  // Delete form mutation
  const deleteFormMutation = useMutation({
    mutationFn: async (formId: string) => {
      const { error } = await supabase
        .from('public_submission_forms')
        .delete()
        .eq('id', formId)
        .eq('user_id', user?.id); // Ensure user can only delete their own forms

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-forms'] });
      toast.success("Form deleted successfully!");
    },
    onError: (error: any) => {
      toast.error(`Failed to delete form: ${error.message}`);
    }
  });

  // Toggle form active status
  const toggleFormMutation = useMutation({
    mutationFn: async ({ formId, isActive }: { formId: string, isActive: boolean }) => {
      const { error } = await supabase
        .from('public_submission_forms')
        .update({ is_active: isActive })
        .eq('id', formId)
        .eq('user_id', user?.id); // Ensure user can only update their own forms

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-forms'] });
      toast.success("Form status updated!");
    },
    onError: (error: any) => {
      toast.error(`Failed to update form: ${error.message}`);
    }
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (name: string) => {
    setNewFormName(name);
    setNewFormSlug(generateSlug(name));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const getFormUrl = (slug: string, formType: string) => {
    if (formType === 'barc') {
      return `${window.location.origin}/barc-submit/${slug}`;
    }
    return `${window.location.origin}/public-upload/${slug}`;
  };

  const getFormTypeLabel = (formType: string) => {
    switch (formType) {
      case 'barc':
        return 'BARC Application';
      case 'general':
      default:
        return 'General Submission';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-secondary rounded"></div>
          <div className="h-32 w-full bg-secondary rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Public Submission Forms</h1>
          <p className="text-muted-foreground">Create and manage forms for receiving pitch deck submissions</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Form
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Submission Form</DialogTitle>
              <DialogDescription>
                Create a new form that others can use to submit their information to you.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="formType">Form Type</Label>
                <Select value={newFormType} onValueChange={setNewFormType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select form type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Submission</SelectItem>
                    <SelectItem value="barc">BARC Application</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="formName">Form Name</Label>
                <Input
                  id="formName"
                  value={newFormName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Investment Submissions"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="formSlug">Form Slug (URL)</Label>
                <Input
                  id="formSlug"
                  value={newFormSlug}
                  onChange={(e) => setNewFormSlug(e.target.value)}
                  placeholder="e.g., investment-submissions"
                />
                <p className="text-sm text-muted-foreground">
                  This will be used in the URL: {newFormType === 'barc' ? '/barc-submit/' : '/public-upload/'}{newFormSlug}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="autoAnalyze"
                  checked={autoAnalyze}
                  onCheckedChange={setAutoAnalyze}
                />
                <Label htmlFor="autoAnalyze">Automatically analyze submissions</Label>
              </div>
              <Button 
                onClick={() => createFormMutation.mutate({ 
                  name: newFormName, 
                  slug: newFormSlug, 
                  formType: newFormType,
                  autoAnalyze 
                })}
                disabled={!newFormName || !newFormSlug || createFormMutation.isPending}
                className="w-full"
              >
                {createFormMutation.isPending ? "Creating..." : "Create Form"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {forms?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <h3 className="text-lg font-semibold mb-2">No forms created yet</h3>
              <p className="text-muted-foreground mb-4">Create your first submission form to get started</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Form
              </Button>
            </CardContent>
          </Card>
        ) : (
          forms?.map((form) => (
            <Card key={form.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {form.form_name}
                      <span className="text-xs bg-secondary px-2 py-1 rounded">
                        {getFormTypeLabel(form.form_type)}
                      </span>
                    </CardTitle>
                    <CardDescription>
                      Created {new Date(form.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={form.is_active}
                      onCheckedChange={(checked) => 
                        toggleFormMutation.mutate({ formId: form.id, isActive: checked })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteFormMutation.mutate(form.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Label className="text-sm font-medium">Status:</Label>
                    <span className={`text-sm ${form.is_active ? 'text-green-600' : 'text-red-600'}`}>
                      {form.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label className="text-sm font-medium">Auto-analyze:</Label>
                    <span className="text-sm">
                      {form.auto_analyze ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Public URL:</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        value={getFormUrl(form.form_slug, form.form_type)}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(getFormUrl(form.form_slug, form.form_type))}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(getFormUrl(form.form_slug, form.form_type), '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default PublicForms;
