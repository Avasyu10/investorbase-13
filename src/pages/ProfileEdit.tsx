
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Plus, X, FileText, Trash2 } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";
import { AreaOfInterestOptions } from "@/lib/constants";
import { FileUploadZone } from "@/components/reports/upload/FileUploadZone";

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
}

// Available options for the investment stage multiselect field
const stageOptions = [
  { label: "Pre-seed", value: "Pre-seed" },
  { label: "Seed", value: "Seed" },
  { label: "Series A", value: "Series A" },
  { label: "Series B", value: "Series B" },
  { label: "Series C+", value: "Series C+" },
  { label: "Growth", value: "Growth" },
  { label: "Late Stage", value: "Late Stage" }
];

const ProfileEdit = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<VCProfile | null>(null);
  const [publicForm, setPublicForm] = useState<PublicForm | null>(null);
  
  // Form state
  const [fundName, setFundName] = useState('');
  const [fundSize, setFundSize] = useState('');
  const [areasOfInterest, setAreasOfInterest] = useState<string[]>([]);
  const [investmentStage, setInvestmentStage] = useState<string[]>([]);
  const [companiesInvested, setCompaniesInvested] = useState<string[]>([]);
  const [newCompany, setNewCompany] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // PDF thesis state
  const [thesisFile, setThesisFile] = useState<File | null>(null);
  const [hasExistingThesis, setHasExistingThesis] = useState(false);
  const [thesisFilename, setThesisFilename] = useState<string | null>(null);
  const [deletingThesis, setDeletingThesis] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    fetchProfile();
  }, [user, navigate]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vc_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.error("Error fetching profile:", error);
        if (error.code === 'PGRST116') {
          navigate('/profile/setup');
        }
        return;
      }
      
      const profileData = data as VCProfile;
      setProfile(profileData);
      
      // Set form state
      setFundName(profileData.fund_name || '');
      setFundSize(profileData.fund_size || '');
      setAreasOfInterest(profileData.areas_of_interest || []);
      setInvestmentStage(profileData.investment_stage || []);
      setCompaniesInvested(profileData.companies_invested || []);
      setWebsiteUrl(profileData.website_url || '');
      
      // Set thesis state
      if (profileData.fund_thesis_url) {
        setHasExistingThesis(true);
        setThesisFilename(profileData.fund_thesis_url.split('/').pop() || null);
      }
      
      // Check if user has a public form
      const { data: formData, error: formError } = await supabase
        .from('public_submission_forms')
        .select('id, form_slug, form_name, created_at')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (formError) {
        console.error("Error fetching public form:", formError);
      } else if (formData) {
        setPublicForm(formData as PublicForm);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
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
    if (!user || !profile?.fund_thesis_url) return;
    
    try {
      setDeletingThesis(true);
      
      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('vc-documents')
        .remove([profile.fund_thesis_url]);
        
      if (storageError) throw storageError;
      
      // Update profile to remove reference
      const { error: updateError } = await supabase
        .from('vc_profiles')
        .update({ fund_thesis_url: null })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      
      // Update state
      setHasExistingThesis(false);
      setThesisFilename(null);
      
      toast({
        title: "Thesis deleted",
        description: "Your fund thesis PDF has been deleted",
      });
      
    } catch (error: any) {
      toast({
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
      
      let fundThesisUrl = profile?.fund_thesis_url || null;
      
      // Upload new thesis file if provided
      if (thesisFile) {
        // Delete existing thesis if there is one
        if (profile?.fund_thesis_url) {
          const { error: removeError } = await supabase.storage
            .from('vc-documents')
            .remove([profile.fund_thesis_url]);
            
          if (removeError) throw removeError;
        }
        
        // Upload new file
        const fileExt = thesisFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `fund-thesis/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('vc-documents')
          .upload(filePath, thesisFile);
          
        if (uploadError) throw uploadError;
        
        fundThesisUrl = filePath;
      }
      
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
        
      if (error) throw error;
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated",
      });
      
      navigate('/profile');
    } catch (error: any) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const downloadThesis = async () => {
    if (!profile?.fund_thesis_url) return;
    
    try {
      const { data, error } = await supabase.storage
        .from('vc-documents')
        .download(profile.fund_thesis_url);
        
      if (error) throw error;
      
      // Create a blob URL and trigger download
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = profile.fund_thesis_url.split('/').pop() || 'fund_thesis.pdf';
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const publicSubmissionUrl = publicForm 
    ? `${window.location.origin}/submit/${publicForm.form_slug}`
    : null;

  if (loading) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-8 flex justify-center dark">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="dark bg-background min-h-screen">
      <div className="container max-w-3xl mx-auto px-4 py-8">
        <Card className="border-none shadow-lg bg-card">
          <form onSubmit={handleSubmit}>
            <CardHeader className="border-b border-border/30">
              <CardTitle className="text-xl text-foreground">Edit Profile</CardTitle>
              <CardDescription className="text-muted-foreground">Update your investor profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-primary">Fund Details</h3>
                <Separator className="mb-4 bg-border/30" />
                
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fund-name" className="text-foreground">Fund Name</Label>
                    <Input
                      id="fund-name"
                      value={fundName}
                      onChange={(e) => setFundName(e.target.value)}
                      placeholder="Your Fund Name"
                      className="bg-secondary/30 border-border/30 focus-visible:ring-primary"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fund-size" className="text-foreground">Fund Size</Label>
                    <Input
                      id="fund-size"
                      value={fundSize}
                      onChange={(e) => setFundSize(e.target.value)}
                      placeholder="e.g. $10M-$50M"
                      className="bg-secondary/30 border-border/30 focus-visible:ring-primary"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-foreground">Fund Thesis PDF</Label>
                    {hasExistingThesis ? (
                      <div className="border bg-secondary/30 border-border/30 rounded-md p-4">
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
              
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-primary">Investment Focus</h3>
                <Separator className="mb-4 bg-border/30" />
                
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="areas" className="text-foreground">Areas of Interest</Label>
                    <MultiSelect
                      placeholder="Select areas"
                      selected={areasOfInterest}
                      options={AreaOfInterestOptions}
                      onChange={setAreasOfInterest}
                      className="bg-secondary/30 border-border/30"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="stages" className="text-foreground">Investment Stages</Label>
                    <MultiSelect
                      placeholder="Select stages"
                      selected={investmentStage}
                      options={stageOptions}
                      onChange={setInvestmentStage}
                      className="bg-secondary/30 border-border/30"
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-primary">Portfolio</h3>
                <Separator className="mb-4 bg-border/30" />
                
                <div className="space-y-2">
                  <Label htmlFor="companies" className="text-foreground">Companies Invested</Label>
                  
                  <div className="flex gap-2 items-center mb-2">
                    <Input
                      id="new-company"
                      value={newCompany}
                      onChange={(e) => setNewCompany(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Add a company"
                      className="flex-1 bg-secondary/30 border-border/30 focus-visible:ring-primary"
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
                  
                  <div className="bg-secondary/20 rounded-md p-2 min-h-[120px]">
                    {companiesInvested.length === 0 ? (
                      <p className="text-muted-foreground text-sm py-2 px-3">
                        No companies added yet. Add companies to your portfolio above.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {companiesInvested.map((company, index) => (
                          <div 
                            key={index} 
                            className="bg-secondary/40 text-foreground px-3 py-1.5 rounded-md text-sm flex items-center group border border-border/30"
                          >
                            {company}
                            <button
                              type="button"
                              onClick={() => handleRemoveCompany(index)}
                              className="ml-2 text-muted-foreground hover:text-primary transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add companies you've invested in to your portfolio
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-primary">Public Submission URL</h3>
                <Separator className="mb-4 bg-border/30" />
                
                <div className="space-y-2">
                  {publicForm ? (
                    <div>
                      <Label className="text-foreground mb-2 block">Your Public URL</Label>
                      <div className="bg-secondary/20 p-3 rounded-md break-all">
                        {publicSubmissionUrl}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        This URL is generated for you to receive pitch deck submissions.
                        It cannot be edited directly, but you can copy it from your profile page.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        No public submission URL has been generated yet.
                        You can generate one from your profile page.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t border-border/30 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/profile')}
                className="border-border/30 hover:bg-secondary/50 hover:text-foreground"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={saving}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving
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
      </div>
    </div>
  );
};

export default ProfileEdit;
