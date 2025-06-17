import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
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
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Plus, X, FileText, Trash2, Building, Tag, Layers, Globe, ArrowLeft, Mail, Copy, ExternalLink } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";
import { AreaOfInterestOptions } from "@/lib/constants";
import { FileUploadZone } from "@/components/reports/upload/FileUploadZone";
import { InvestorPitchEmail } from "@/components/profile/InvestorPitchEmail";
import { toast } from "sonner";

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

const ProfileEdit = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const { toast: hookToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vcProfile, setVcProfile] = useState<VCProfile | null>(null);
  const [publicForm, setPublicForm] = useState<PublicForm | null>(null);
  const [updatingAutoAnalyze, setUpdatingAutoAnalyze] = useState(false);
  
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

  // Check if user is a founder (signed up through general signup)
  const isFounder = profile?.signup_source === 'founder_signup';
  
  // Founder's public form URL
  const founderPublicFormUrl = "https://adca497b-fbd1-4bcc-8352-b3c550bc9790.lovableproject.com/public-upload?form=m92a7cet-l698ke";

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
      
      // Only fetch VC profile if user is not a founder
      if (!isFounder) {
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
        setVcProfile(profileData);
        
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
      
      // Only fetch public form if user is not a founder
      if (!isFounder) {
        const { data: formData, error: formError } = await supabase
          .from('public_submission_forms')
          .select('id, form_slug, form_name, created_at, auto_analyze')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (formError) {
          console.error("Error fetching public form:", formError);
        } else if (formData) {
          setPublicForm(formData as PublicForm);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    hookToast({
      title: "Copied to clipboard!",
    });
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
    
    if (!user || isFounder) return;
    
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
      
      navigate('/profile');
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

  const publicSubmissionUrl = publicForm 
    ? `${window.location.origin}/public-upload?form=${publicForm.form_slug}`
    : null;

  if (loading) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-12 flex justify-center items-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading profile information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8">
      <Card className="border-none shadow-lg bg-card">
        <form onSubmit={handleSubmit}>
          <CardHeader className="pb-2 border-b border-border/30">
            <div className="flex items-center justify-between mb-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/profile')}
                className="flex items-center text-muted-foreground hover:text-foreground -ml-3"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to Profile
              </Button>
            </div>
            <CardTitle className="text-2xl text-foreground/90 font-bold">
              {isFounder ? "Founder Profile" : "Edit Profile"}
            </CardTitle>
            <CardDescription className="text-muted-foreground/80">
              {isFounder ? "View your founder profile and submission details" : "Update your investor profile and preferences"}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-8 pt-6">
            {!isFounder && (
              <>
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
              </>
            )}
            
            <div>
              <div className="flex items-center mb-3">
                <Globe className="h-5 w-5 text-primary mr-2" />
                <h3 className="text-base font-semibold text-foreground/80">Public Submission URL</h3>
              </div>
              <Separator className="mb-4" />
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-3">
                  {isFounder 
                    ? "This URL allows you to submit your pitch deck directly to our platform for review and analysis."
                    : "This URL creates a public portal where founders can submit their pitch decks directly to your dashboard. Share this link with your network to streamline the submission process and maintain all potential investments in one organized location."
                  }
                </p>
                
                {isFounder ? (
                  <div className="space-y-4 bg-secondary/10 p-4 rounded-md">
                    <div>
                      <Label className="text-foreground/80 mb-2 block">Your Submission URL</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          value={founderPublicFormUrl}
                          readOnly
                          className="font-mono text-sm bg-background"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(founderPublicFormUrl)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(founderPublicFormUrl, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : publicForm ? (
                  <div className="space-y-4 bg-secondary/10 p-4 rounded-md">
                    <div>
                      <Label className="text-foreground/80 mb-2 block">Your Public URL</Label>
                      <div className="bg-background p-3 rounded-md break-all border border-border/20">
                        {publicSubmissionUrl}
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
                      You can generate one from your profile page.
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {!isFounder && (
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
          
          <CardFooter className="flex justify-between border-t border-border/30 pt-6 pb-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/profile')}
              className="border-border/30 hover:bg-secondary/50 hover:text-foreground"
            >
              {isFounder ? "Back" : "Cancel"}
            </Button>
            {!isFounder && (
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
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ProfileEdit;
