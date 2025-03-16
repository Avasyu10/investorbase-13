
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
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Edit } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

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

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<VCProfile | null>(null);

  useEffect(() => {
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
          // If no profile, redirect to profile setup
          if (error.code === 'PGRST116') {
            navigate('/profile/setup');
          }
          return;
        }
        
        setProfile(data as VCProfile);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [user, navigate]);
  
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

  if (loading) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Profile Not Found</CardTitle>
            <CardDescription>You haven't set up your VC profile yet</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/profile/setup')}>
              Set Up Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8">
      <Card className="animate-fade-in">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl mb-1">{profile.fund_name || "Your VC Fund"}</CardTitle>
              <CardDescription>{user?.email}</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4 sm:mt-0"
              onClick={() => navigate('/profile/edit')}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Fund Details</h3>
            <Separator className="mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Fund Size</p>
                <p>{profile.fund_size || "Not specified"}</p>
              </div>
              {profile.fund_thesis_url && (
                <div>
                  <p className="text-sm font-medium">Fund Thesis</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-1"
                    onClick={downloadThesis}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Investment Focus</h3>
            <Separator className="mb-4" />
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Areas of Interest</p>
                <div className="flex flex-wrap gap-2">
                  {profile.areas_of_interest && profile.areas_of_interest.length > 0 ? (
                    profile.areas_of_interest.map((area, index) => (
                      <Badge key={index} variant="secondary">{area}</Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No areas specified</p>
                  )}
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">Investment Stages</p>
                <div className="flex flex-wrap gap-2">
                  {profile.investment_stage && profile.investment_stage.length > 0 ? (
                    profile.investment_stage.map((stage, index) => (
                      <Badge key={index} variant="secondary">{stage}</Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No stages specified</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Portfolio</h3>
            <Separator className="mb-4" />
            
            <div>
              <p className="text-sm font-medium mb-2">Companies Invested</p>
              {profile.companies_invested && profile.companies_invested.length > 0 ? (
                <ul className="list-disc list-inside space-y-1">
                  {profile.companies_invested.map((company, index) => (
                    <li key={index}>{company}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No companies specified</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
