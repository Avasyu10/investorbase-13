
import { useEffect, useState } from "react";
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
import { Loader2, Save, Plus, X, Globe } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";
import { Textarea } from "@/components/ui/textarea";
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
  const [websiteUrl, setWebsiteUrl] = useState('Your Website');

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
      setWebsiteUrl(profileData.website_url || 'Your Website');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('vc_profiles')
        .update({
          fund_name: fundName,
          fund_size: fundSize,
          areas_of_interest: areasOfInterest,
          investment_stage: investmentStage,
          companies_invested: companiesInvested,
          website_url: websiteUrl,
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
      <div className="container max-w-3xl mx-auto px-4 py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8">
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>Update your VC profile information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Fund Details</h3>
              <Separator className="mb-4" />
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fund-name">Fund Name</Label>
                  <Input
                    id="fund-name"
                    value={fundName}
                    onChange={(e) => setFundName(e.target.value)}
                    placeholder="Your Fund Name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fund-size">Fund Size</Label>
                  <Input
                    id="fund-size"
                    value={fundSize}
                    onChange={(e) => setFundSize(e.target.value)}
                    placeholder="e.g. $10M-$50M"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Investment Focus</h3>
              <Separator className="mb-4" />
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="areas">Areas of Interest</Label>
                  <MultiSelect
                    placeholder="Select areas"
                    selected={areasOfInterest}
                    options={AreaOfInterestOptions}
                    onChange={setAreasOfInterest}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="stages">Investment Stages</Label>
                  <MultiSelect
                    placeholder="Select stages"
                    selected={investmentStage}
                    options={stageOptions}
                    onChange={setInvestmentStage}
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Portfolio</h3>
              <Separator className="mb-4" />
              
              <div className="space-y-2">
                <Label htmlFor="companies">Companies Invested</Label>
                
                <div className="flex gap-2 items-center mb-2">
                  <Input
                    id="new-company"
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Add a company"
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    onClick={handleAddCompany}
                    size="sm"
                    variant="secondary"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
                
                <div className="bg-muted/30 rounded-md p-2 min-h-[120px]">
                  {companiesInvested.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-2 px-3">
                      No companies added yet. Add companies to your portfolio above.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {companiesInvested.map((company, index) => (
                        <div 
                          key={index} 
                          className="bg-secondary text-secondary-foreground px-3 py-1.5 rounded-md text-sm flex items-center group"
                        >
                          {company}
                          <button
                            type="button"
                            onClick={() => handleRemoveCompany(index)}
                            className="ml-2 text-muted-foreground hover:text-foreground transition-colors"
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
            
            {/* New section for Website URL */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Online Presence</h3>
              <Separator className="mb-4" />
              
              <div className="space-y-2">
                <Label htmlFor="website-url">Public URL</Label>
                <div className="flex">
                  <div className="bg-muted flex items-center px-3 rounded-l-md border border-r-0 border-input">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    id="website-url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://www.yourdomain.com"
                    className="rounded-l-none"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Add your Fund's Website or public URL
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/profile')}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={saving}
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
  );
};

export default ProfileEdit;
