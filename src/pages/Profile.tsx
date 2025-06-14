import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InvestorPitchEmail } from "@/components/profile/InvestorPitchEmail";
import { ConditionalAlertsSection } from "@/components/profile/ConditionalAlertsSection";
import { CreateBarcFormButton } from "@/components/profile/CreateBarcFormButton";
import { ProfileNavigation } from "@/components/profile/ProfileNavigation";
import { Loader2, GraduationCap, Copy, ExternalLink, Building, Tag, Layers, Globe, Mail, Save, Plus, X, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { MultiSelect } from "@/components/ui/multi-select";
import { AreaOfInterestOptions } from "@/lib/constants";
import { FileUploadZone } from "@/components/reports/upload/FileUploadZone";
import { useToast } from "@/hooks/use-toast";

interface VCProfile {
  id: string;
  fund_name: string;
  fund_size: string;
  areas_of_interest: string[];
  investment_stage: string[];
  companies_invested: string[];
  fund_thesis_url: string | null;
  website_url: string | null;
  created_at: string;
  updated_at: string;
}

interface PublicForm {
  id: string;
  form_slug: string;
  form_name: string;
  created_at: string;
  auto_analyze: boolean;
}

const stageOptions = [
  { label: "Pre-seed", value: "Pre-seed" },
  { label: "Seed", value: "Seed" },
  { label: "Series A", value: "Series A" },
  { label: "Series B", value: "Series B" },
  { label: "Series C+", value: "Series C+" },
  { label: "Growth", value: "Growth" },
  { label: "Late Stage", value: "Late Stage" }
];

const Profile = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading, isIITBombay } = useProfile();
  const { toast: hookToast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  const [iitBombayFormSlug, setIitBombayFormSlug] = useState<string | null>(null);
  const [isCreatingForm, setIsCreatingForm] = useState(false);
  const [vcProfile, setVcProfile] = useState<VCProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [publicForm, setPublicForm] = useState<PublicForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [updatingAutoAnalyze, setUpdatingAutoAnalyze] = useState(false);
  
  // Edit form states
  const [fundName, setFundName] = useState('');
  const [fundSize, setFundSize] = useState('');
  const [areasOfInterest, setAreasOfInterest] = useState<string[]>([]);
  const [investmentStage, setInvestmentStage] = useState<string[]>([]);
  const [companiesInvested, setCompaniesInvested] = useState<string[]>([]);
  const [newCompany, setNewCompany] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [thesisFile, setThesisFile] = useState<File | null>(null);
  const [hasExistingThesis, setHasExistingThesis] = useState(false);
  const [thesisFilename, setThesisFilename] = useState<string | null>(null);
  const [deletingThesis, setDeletingThesis] = useState(false);

  // Fetch VC profile data
  useEffect(() => {
    const fetchVCProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('vc_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error && error.code !== 'PGRST116') {
          console.error("Error fetching VC profile:", error);
        } else if (data) {
          const profileData = data as VCProfile;
          setVcProfile(profileData);
          
          // Set form states
          setFundName(profileData.fund_name || '');
          setFundSize(profileData.fund_size || '');
          setAreasOfInterest(profileData.areas_of_interest || []);
          setInvestmentStage(profileData.investment_stage || []);
          setCompaniesInvested(profileData.companies_invested || []);
          setWebsiteUrl(profileData.website_url || '');
          
          if (profileData.fund_thesis_url) {
            setHasExistingThesis(true);
            setThesisFilename(profileData.fund_thesis_url.split('/').pop() || null);
          }
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVCProfile();
  }, [user]);

  // Fetch public form data
  useEffect(() => {
    const fetchPublicForm = async () => {
      if (!user) return;
      
      try {
        const { data: formData, error: formError } = await supabase
          .from('public_submission_forms')
          .select('id, form_slug, form_name, created_at, auto_analyze')
          .eq('user_id', user.id)
          .eq('form_type', 'general')
          .maybeSingle();
          
        if (formError) {
          console.error("Error fetching public form:", formError);
        } else if (formData) {
          setPublicForm(formData as PublicForm);
        }
      } catch (error) {
        console.error("Error:", error);
      }
    };

    fetchPublicForm();
  }, [user]);

  // Fetch the IIT Bombay form belonging to the current user
  useEffect(() => {
    const fetchOrCreateIITBombayForm = async () => {
      if (!user || !isIITBombay) return;

      try {
        console.log('Fetching IIT Bombay forms for user:', user.id);
        
        const { data: forms, error } = await supabase
          .from('public_submission_forms')
          .select('form_slug')
          .eq('user_id', user.id)
          .eq('form_type', 'barc')
          .eq('is_active', true)
          .limit(1);

        if (error) {
          console.error('Error fetching IIT Bombay form:', error);
          return;
        }

        if (forms && forms.length > 0) {
          setIitBombayFormSlug(forms[0].form_slug);
          console.log('Found IIT Bombay form slug:', forms[0].form_slug);
          
          // If the current slug contains "barc", update it to remove "barc"
          if (forms[0].form_slug.includes('barc')) {
            await updateFormSlugToRemoveBarc(forms[0].form_slug);
          }
        } else {
          console.log('No IIT Bombay form found for user, creating one automatically...');
          await createFormAutomatically();
        }
      } catch (error) {
        console.error('Error in fetchOrCreateIITBombayForm:', error);
      }
    };

    fetchOrCreateIITBombayForm();
  }, [user, isIITBombay]);

  const updateFormSlugToRemoveBarc = async (currentSlug: string) => {
    if (!user) return;

    try {
      // Create new slug without "barc"
      const newSlug = currentSlug.replace(/barc-?/gi, '').replace(/^-+|-+$/g, '');
      
      // Check if a form with the new slug already exists
      const { data: existingForm } = await supabase
        .from('public_submission_forms')
        .select('id')
        .eq('form_slug', newSlug)
        .neq('user_id', user.id) // Exclude current user's forms
        .maybeSingle();

      let finalSlug = newSlug;
      if (existingForm) {
        // If the slug exists, make it unique
        finalSlug = `${newSlug}-${user.id.substring(0, 8)}`;
      }

      // Update the form slug
      const { error } = await supabase
        .from('public_submission_forms')
        .update({ form_slug: finalSlug })
        .eq('user_id', user.id)
        .eq('form_type', 'barc')
        .eq('form_slug', currentSlug);

      if (error) throw error;

      setIitBombayFormSlug(finalSlug);
      console.log('Updated IIT Bombay form slug from', currentSlug, 'to', finalSlug);
      toast.success("Your IIT Bombay form URL has been updated!");
    } catch (error: any) {
      console.error('Error updating form slug:', error);
      toast.error(`Failed to update form URL: ${error.message}`);
    }
  };

  const createFormAutomatically = async () => {
    if (!user || isCreatingForm) return;

    setIsCreatingForm(true);
    try {
      const formName = "IIT Bombay Applications";
      const formSlug = "iit-bombay-applications";

      console.log('Creating IIT Bombay form automatically for user:', user.id);

      // Check if a form with this slug already exists
      const { data: existingForm } = await supabase
        .from('public_submission_forms')
        .select('id')
        .eq('form_slug', formSlug)
        .maybeSingle();

      let finalSlug = formSlug;
      if (existingForm) {
        // If the slug exists, append user ID to make it unique
        finalSlug = `${formSlug}-${user.id.substring(0, 8)}`;
      }

      const { data, error } = await supabase
        .from('public_submission_forms')
        .insert({
          form_name: formName,
          form_slug: finalSlug,
          form_type: 'barc',
          auto_analyze: true,
          user_id: user.id,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setIitBombayFormSlug(finalSlug);
      console.log('IIT Bombay form created automatically with slug:', finalSlug);
      toast.success("Your IIT Bombay form has been created automatically!");
    } catch (error: any) {
      console.error('Error creating IIT Bombay form automatically:', error);
      toast.error(`Failed to create form: ${error.message}`);
    } finally {
      setIsCreatingForm(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleFormCreated = (formSlug: string) => {
    setIitBombayFormSlug(formSlug);
    toast.success("Your new IIT Bombay form has been created!");
  };

  const toggleAutoAnalyze = async () => {
    if (!user || !publicForm) return;
    
    try {
      setUpdatingAutoAnalyze(true);
      
      const newValue = !publicForm.auto_analyze;
      
      const { error } = await supabase
        .from('public_submission_forms')
        .update({ auto_analyze: newValue })
        .eq('id', publicForm.id);
        
      if (error) {
        throw error;
      }
      
      setPublicForm({
        ...publicForm,
        auto_analyze: newValue
      });
      
      hookToast({
        title: newValue ? "Auto-analyze enabled" : "Auto-analyze disabled",
        description: newValue 
          ? "Pitch decks submitted through your form will be automatically analyzed" 
          : "You'll need to manually analyze submitted pitch decks",
      });
    } catch (error: any) {
      hookToast({
        title: "Error updating setting",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingAutoAnalyze(false);
    }
  };

  const handleAddCompany = () => {
    if (newCompany.trim() !== '') {
      setCompaniesInvested([...companiesInvested, newCompany.trim()]);
      setNewCompany('');
    }
  };

  const handleRemoveCompany = (index: number) => {
    const updatedCompanies = [...companiesInvested];
    updatedCompanies.splice(index, 1);
    setCompaniesInvested(updatedCompanies);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCompany();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setThesisFile(e.target.files[0]);
    }
  };

  const handleDeleteThesis = async () => {
    if (!user || !vcProfile?.fund_thesis_url) return;
    
    try {
      setDeletingThesis(true);
      
      const { error: storageError } = await supabase.storage
        .from('vc-documents')
        .remove([vcProfile.fund_thesis_url]);
        
      if (storageError) throw storageError;
      
      const { error: updateError } = await supabase
        .from('vc_profiles')
        .update({ fund_thesis_url: null })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      
      setHasExistingThesis(false);
      setThesisFilename(null);
      
      hookToast({
        title: "Thesis deleted",
        description: "Your fund thesis PDF has been deleted",
      });
      
    } catch (error: any) {
      hookToast({
        title: "Error deleting thesis",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingThesis(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      setSaving(true);
      
      let fundThesisUrl = vcProfile?.fund_thesis_url || null;
      
      if (thesisFile) {
        if (vcProfile?.fund_thesis_url) {
          try {
            const { error: removeError } = await supabase.storage
              .from('vc-documents')
              .remove([vcProfile.fund_thesis_url]);
              
            if (removeError) {
              console.error('Error removing existing thesis:', removeError);
            }
          } catch (removeErr) {
            console.error('Error during thesis removal:', removeErr);
          }
        }
        
        const fileExt = thesisFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        
        console.log('Attempting to upload thesis to path:', filePath);
        
        try {
          const { error: uploadError } = await supabase.storage
            .from('vc-documents')
            .upload(filePath, thesisFile, {
              cacheControl: '3600',
              upsert: true
            });
            
          if (uploadError) {
            console.error('Error with structured path upload:', uploadError);
            throw uploadError;
          }
          
          fundThesisUrl = filePath;
          console.log('File uploaded successfully to:', filePath);
        } catch (uploadErr) {
          console.error('Upload failed with structured path, trying simple filename:', uploadErr);
          
          const simpleFilePath = fileName;
          
          const { error: fallbackError } = await supabase.storage
            .from('vc-documents')
            .upload(simpleFilePath, thesisFile, {
              cacheControl: '3600',
              upsert: true
            });
            
          if (fallbackError) {
            console.error('Error with simple path upload:', fallbackError);
            throw fallbackError;
          }
          
          fundThesisUrl = simpleFilePath;
          console.log('File uploaded successfully with simple path:', simpleFilePath);
        }
      }
      
      console.log('Updating profile with thesis URL:', fundThesisUrl);
      
      const { error } = await supabase
        .from('vc_profiles')
        .update({
          fund_name: fundName,
          fund_size: fundSize,
          areas_of_interest: areasOfInterest,
          investment_stage: investmentStage,
          companies_invested: companiesInvested,
          website_url: websiteUrl,
          fund_thesis_url: fundThesisUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
        
      if (error) {
        console.error('Error updating profile:', error);
        throw error;
      }
      
      hookToast({
        title: "Profile updated",
        description: "Your profile has been successfully updated",
      });
      
      // Refresh the VC profile data
      const { data: updatedProfile } = await supabase
        .from('vc_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (updatedProfile) {
        setVcProfile(updatedProfile);
      }
      
    } catch (error: any) {
      console.error('Profile update error:', error);
      hookToast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const downloadThesis = async () => {
    if (!vcProfile?.fund_thesis_url) return;
    
    try {
      const { data, error } = await supabase.storage
        .from('vc-documents')
        .download(vcProfile.fund_thesis_url);
        
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = vcProfile.fund_thesis_url.split('/').pop() || 'fund_thesis.pdf';
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error: any) {
      hookToast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Generate the IIT Bombay form URL using the user's actual form slug
  const iitBombayFormUrl = iitBombayFormSlug 
    ? `${window.location.origin}/submit/${iitBombayFormSlug}`
    : null;

  // Generate the public submission URL for the VC profile
  const publicSubmissionUrl = publicForm 
    ? `${window.location.origin}/public-upload?form=${publicForm.form_slug}`
    : null;

  if (authLoading || profileLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        {isIITBombay && <GraduationCap className="h-8 w-8 text-primary" />}
        <h1 className="text-3xl font-bold tracking-tight">
          {isIITBombay ? "IIT Bombay Profile" : "Profile"}
        </h1>
      </div>
      
      {isIITBombay && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-blue-800">
            <GraduationCap className="h-5 w-5" />
            <span className="font-medium">IIT Bombay Alumni Access</span>
          </div>
          <p className="text-blue-700 text-sm mt-1">
            You have access to enhanced features and alumni network insights.
          </p>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Profile Details</TabsTrigger>
          {!isIITBombay && (
            <>
              <TabsTrigger value="email">Investor Pitch Email</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="profile">
          <Card className="border-none shadow-lg bg-card">
            <form onSubmit={handleSubmit}>
              <CardHeader className="pb-2 border-b border-border/30">
                <CardTitle className="text-2xl text-foreground/90 font-bold">Edit Profile</CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-8 pt-6">
                <div>
                  <div className="flex items-center mb-3">
                    <Building className="h-5 w-5 text-primary mr-2" />
                    <h3 className="text-base font-semibold text-foreground/80">Fund Details</h3>
                  </div>
                  <Separator className="mb-4" />
                  
                  <div className="grid gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="fund-name" className="text-foreground/80">Fund Name</Label>
                      <Input
                        id="fund-name"
                        value={fundName}
                        onChange={(e) => setFundName(e.target.value)}
                        placeholder="Your Fund Name"
                        className="bg-secondary/20 border-border/20 focus-visible:ring-primary"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="fund-size" className="text-foreground/80">Fund Size</Label>
                      <Input
                        id="fund-size"
                        value={fundSize}
                        onChange={(e) => setFundSize(e.target.value)}
                        placeholder="e.g. $10M-$50M"
                        className="bg-secondary/20 border-border/20 focus-visible:ring-primary"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="website-url" className="text-foreground/80">Website URL</Label>
                      <Input
                        id="website-url"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="https://yourfund.com"
                        className="bg-secondary/20 border-border/20 focus-visible:ring-primary"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-foreground/80">Fund Thesis PDF</Label>
                      {hasExistingThesis ? (
                        <div className="border bg-secondary/10 border-border/20 rounded-md p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <FileText className="h-5 w-5 text-primary mr-2" />
                              <span className="text-foreground">{thesisFilename || "Fund Thesis.pdf"}</span>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={downloadThesis}
                                className="border-border/30 hover:bg-secondary/50 hover:text-foreground"
                              >
                                Download
                              </Button>
                              <Button 
                                type="button" 
                                variant="destructive" 
                                size="sm"
                                onClick={handleDeleteThesis}
                                disabled={deletingThesis}
                              >
                                {deletingThesis ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                ) : (
                                  <Trash2 className="h-4 w-4 mr-1" />
                                )}
                                Delete
                              </Button>
                            </div>
                          </div>
                          <div className="mt-4">
                            <FileUploadZone
                              id="thesis-upload"
                              label="Replace with a new thesis"
                              file={thesisFile}
                              onFileChange={handleFileChange}
                              accept=".pdf"
                              description="PDF files only, max 10MB"
                              buttonText="Choose new file"
                            />
                          </div>
                        </div>
                      ) : (
                        <FileUploadZone
                          id="thesis-upload"
                          label="Upload Fund Thesis"
                          file={thesisFile}
                          onFileChange={handleFileChange}
                          accept=".pdf"
                          description="PDF files only, max 10MB"
                          buttonText="Choose file"
                        />
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center mb-3">
                    <Tag className="h-5 w-5 text-primary mr-2" />
                    <h3 className="text-base font-semibold text-foreground/80">Investment Focus</h3>
                  </div>
                  <Separator className="mb-4" />
                  
                  <div className="grid gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="areas" className="text-foreground/80">Areas of Interest</Label>
                      <MultiSelect
                        placeholder="Select areas of interest"
                        selected={areasOfInterest}
                        options={AreaOfInterestOptions}
                        onChange={setAreasOfInterest}
                        className="bg-secondary/20 border-border/20"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="stages" className="text-foreground/80">Investment Stages</Label>
                      <MultiSelect
                        placeholder="Select investment stages"
                        selected={investmentStage}
                        options={stageOptions}
                        onChange={setInvestmentStage}
                        className="bg-secondary/20 border-border/20"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center mb-3">
                    <Layers className="h-5 w-5 text-primary mr-2" />
                    <h3 className="text-base font-semibold text-foreground/80">Portfolio</h3>
                  </div>
                  <Separator className="mb-4" />
                  
                  <div className="space-y-3">
                    <Label htmlFor="companies" className="text-foreground/80">Companies Invested</Label>
                    
                    <div className="flex gap-2 items-center mb-2">
                      <Input
                        id="new-company"
                        value={newCompany}
                        onChange={(e) => setNewCompany(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Add a company"
                        className="flex-1 bg-secondary/20 border-border/20 focus-visible:ring-primary"
                      />
                      <Button 
                        type="button" 
                        onClick={handleAddCompany}
                        size="sm"
                        variant="secondary"
                        className="hover:bg-primary hover:text-primary-foreground"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                    
                    <div className="bg-secondary/10 rounded-md p-4 min-h-[120px]">
                      {companiesInvested.length === 0 ? (
                        <p className="text-muted-foreground text-sm py-2 px-3">
                          No companies added yet. Add companies to your portfolio above.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {companiesInvested.map((company, index) => (
                            <div 
                              key={index} 
                              className="bg-background px-3 py-1.5 rounded-md text-sm flex items-center group border border-border/20"
                            >
                              {company}
                              <button
                                type="button"
                                onClick={() => handleRemoveCompany(index)}
                                className="ml-2 text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center mb-3">
                    <Globe className="h-5 w-5 text-primary mr-2" />
                    <h3 className="text-base font-semibold text-foreground/80">Public Submission URL</h3>
                  </div>
                  <Separator className="mb-4" />
                  
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground mb-3">
                      This URL creates a public portal where founders can submit their pitch decks directly to your dashboard. 
                      Share this link with your network to streamline the submission process and maintain all potential investments in one organized location.
                    </p>
                    
                    {/* IIT Bombay Form URL - only for IIT Bombay users */}
                    {isIITBombay && (
                      <div className="space-y-2 mb-4">
                        <Label className="text-sm font-medium">IIT Bombay Form</Label>
                        <p className="text-xs text-muted-foreground">
                          For IIT Bombay applications
                        </p>
                        {isCreatingForm ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Creating your IIT Bombay form...</span>
                          </div>
                        ) : iitBombayFormUrl ? (
                          <div className="flex items-center space-x-2">
                            <Input
                              value={iitBombayFormUrl}
                              readOnly
                              className="font-mono text-sm"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(iitBombayFormUrl)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(iitBombayFormUrl, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">No IIT Bombay form found.</p>
                            <CreateBarcFormButton onFormCreated={handleFormCreated} />
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* General Public Submission URL */}
                    {publicForm ? (
                      <div className="space-y-4 bg-secondary/10 p-4 rounded-md">
                        <div>
                          <Label className="text-foreground/80 mb-2 block">
                            {isIITBombay ? "General Submissions" : "Your Public URL"}
                          </Label>
                          {isIITBombay && (
                            <p className="text-xs text-muted-foreground mb-2">
                              For general pitch deck submissions
                            </p>
                          )}
                          <div className="flex items-center space-x-2">
                            <Input
                              value={publicSubmissionUrl}
                              readOnly
                              className="font-mono text-sm"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(publicSubmissionUrl!)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(publicSubmissionUrl!, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between space-x-2 pt-4 border-t border-border/10">
                          <div className="flex-1">
                            <Label htmlFor="auto-analyze" className="text-foreground/80">
                              Auto-analyze Submissions
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              {publicForm.auto_analyze ? 
                                "Pitch decks will be automatically analyzed when submitted" : 
                                "Submitted pitch decks will require manual approval for analysis"}
                            </p>
                          </div>
                          <div className="flex items-center">
                            <Switch
                              checked={publicForm.auto_analyze}
                              onCheckedChange={toggleAutoAnalyze}
                              disabled={updatingAutoAnalyze}
                              id="auto-analyze"
                            />
                            {updatingAutoAnalyze && <Loader2 className="ml-2 h-4 w-4 animate-spin text-muted-foreground" />}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-secondary/10 p-4 rounded-md">
                        <p className="text-sm text-muted-foreground">
                          No public submission URL has been generated yet.
                          Contact support to get your public submission form set up.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Only show InvestorBase Pitch Email section for non-IIT Bombay users */}
                {!isIITBombay && (
                  <div>
                    <div className="flex items-center mb-3">
                      <Mail className="h-5 w-5 text-primary mr-2" />
                      <h3 className="text-base font-semibold text-foreground/80">InvestorBase Pitch Email</h3>
                    </div>
                    <Separator className="mb-4" />
                    
                    <InvestorPitchEmail />
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="flex justify-end border-t border-border/30 pt-6 pb-6">
                <Button 
                  type="submit"
                  disabled={saving}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving Changes
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {!isIITBombay && (
          <>
            <TabsContent value="email">
              <InvestorPitchEmail />
            </TabsContent>
            <TabsContent value="alerts">
              <ConditionalAlertsSection />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};

export default Profile;
