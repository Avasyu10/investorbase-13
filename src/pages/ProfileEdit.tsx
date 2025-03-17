
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
import { Loader2, Save } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";

interface VCProfile {
  id: string;
  fund_name: string;
  fund_size: string;
  areas_of_interest: string[];
  investment_stage: string[];
  companies_invested: string[];
  fund_thesis_url: string | null;
  created_at: string;
  updated_at: string;
}

// Available options for the multiselect fields
const areaOptions = [
  { label: "Fintech", value: "Fintech" },
  { label: "SaaS", value: "SaaS" },
  { label: "AI", value: "AI" },
  { label: "Healthcare", value: "Healthcare" },
  { label: "E-commerce", value: "E-commerce" },
  { label: "Enterprise", value: "Enterprise" },
  { label: "Consumer", value: "Consumer" },
  { label: "Marketplaces", value: "Marketplaces" },
  { label: "Blockchain", value: "Blockchain" },
  { label: "Sustainability", value: "Sustainability" }
];

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
  const [companiesInvested, setCompaniesInvested] = useState('');

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
      setCompaniesInvested(profileData.companies_invested ? profileData.companies_invested.join('\n') : '');
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      setSaving(true);
      
      // Convert companies from textarea (line breaks) to array
      const companiesArray = companiesInvested
        .split('\n')
        .map(company => company.trim())
        .filter(company => company !== '');
      
      const { error } = await supabase
        .from('vc_profiles')
        .update({
          fund_name: fundName,
          fund_size: fundSize,
          areas_of_interest: areasOfInterest,
          investment_stage: investmentStage,
          companies_invested: companiesArray,
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
                    options={areaOptions}
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
                <Label htmlFor="companies">Companies Invested (one per line)</Label>
                <textarea
                  id="companies"
                  className="w-full min-h-[120px] resize-y px-3 py-2 border rounded-md"
                  value={companiesInvested}
                  onChange={(e) => setCompaniesInvested(e.target.value)}
                  placeholder="List companies, one per line"
                />
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
