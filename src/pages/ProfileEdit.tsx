import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
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
import { Loader2, Save, Plus, X, Globe, Trash, FileUp } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";
import { FileUploadZone } from "@/components/reports/upload/FileUploadZone";
import { AreaOfInterestOptions } from "@/lib/constants";

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
  
  // Form state
  const [fundName, setFundName] = useState('');
  const [fundSize, setFundSize] = useState('');
  const [areasOfInterest, setAreasOfInterest] = useState<string[]>([]);
  const [investmentStage, setInvestmentStage] = useState<string[]>([]);
  const [companiesInvested, setCompaniesInvested] = useState<string[]>([]);
  const [newCompany, setNewCompany] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  
  // File upload state
  const [thesisFile, setThesisFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [deleteThesis, setDeleteThesis] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const files = e.target.files;
    if (files && files.length > 0) {
      setThesisFile(files[0]);
      setDeleteThesis(false);
    }
  };

  const handleDeleteThesis = () => {
    setDeleteThesis(true);
    setThesisFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast({
      title: "File will be deleted",
      description: "The file will be deleted when you save changes",
    });
  };

  const uploadThesisFile = async (): Promise<string | null> => {
    if (!user || !thesisFile) return null;

    setIsUploadingFile(true);
    try {
      if (profile?.fund_thesis_url && !deleteThesis && !thesisFile) {
        return profile.fund_thesis_url;
      }

      if (deleteThesis || !thesisFile) {
        if (profile?.fund_thesis_url) {
          const { error: deleteError } = await supabase.storage
            .from('vc-documents')
            .remove([profile.fund_thesis_url]);
            
          if (deleteError) {
            console.error("Error deleting file:", deleteError);
            throw deleteError;
          }
        }
        return null;
      }

      if (profile?.fund_thesis_url) {
        const { error: deleteError } = await supabase.storage
          .from('vc-documents')
          .remove([profile.fund_thesis_url]);
          
        if (deleteError) {
          console.error("Error deleting existing file:", deleteError);
        }
      }

      const fileExt = thesisFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('vc-documents')
        .upload(fileName, thesisFile, {
          cacheControl: '3600',
          upsert: true
        });
        
      if (uploadError) {
        console.error("Error uploading file:", uploadError);
        throw uploadError;
      }
      
      return fileName;
    } catch (error) {
      console.error("Error handling file:", error);
      throw error;
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      setSaving(true);
      
      let fundThesisUrl = profile?.fund_thesis_url || null;
      
      if (thesisFile || deleteThesis) {
        fundThesisUrl = await uploadThesisFile();
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
                    <Label htmlFor="fund-thesis" className="text-foreground">Fund Thesis PDF</Label>
                    
                    {profile?.fund_thesis_url && !deleteThesis ? (
                      <div className="mt-2 flex flex-wrap gap-2 items-center">
                        <div className="flex items-center bg-secondary/40 border border-border/30 rounded-md px-3 py-1.5">
                          <span className="text-sm">Current file: {profile.fund_thesis_url.split('/').pop()}</span>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={handleDeleteThesis}
                            className="ml-2 text-destructive hover:text-destructive/80 hover:bg-destructive/10 p-1 h-auto"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                        <span className="text-sm text-muted-foreground">or</span>
                        <FileUploadZone
                          id="fund-thesis"
                          label=""
                          file={thesisFile}
                          onFileChange={handleFileChange}
                          accept=".pdf"
                          description="Upload a new PDF file (max 10MB)"
                          buttonText="Upload New PDF"
                        />
                      </div>
                    ) : (
                      <FileUploadZone
                        id="fund-thesis"
                        label=""
                        file={thesisFile}
                        onFileChange={handleFileChange}
                        accept=".pdf"
                        description="Upload a PDF file (max 10MB)"
                        buttonText="Upload PDF"
                      />
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Upload your fund's thesis document to share with startups
                    </p>
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
                <h3 className="text-sm font-semibold text-primary">Online Presence</h3>
                <Separator className="mb-4 bg-border/30" />
                
                <div className="space-y-2">
                  <Label htmlFor="website-url" className="text-foreground">Public URL</Label>
                  <div className="flex">
                    <div className="bg-secondary/50 flex items-center px-3 rounded-l-md border border-r-0 border-border/30">
                      <Globe className="h-4 w-4 text-primary" />
                    </div>
                    <Input
                      id="website-url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://www.yourdomain.com"
                      className="rounded-l-none bg-secondary/30 border-border/30 focus-visible:ring-primary"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add your Fund's Website or Public URL
                  </p>
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
                disabled={saving || isUploadingFile}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {(saving || isUploadingFile) ? (
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
