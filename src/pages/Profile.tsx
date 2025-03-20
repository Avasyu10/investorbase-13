
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
import { Loader2, Download, Edit, Globe, FileText, Plus } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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

interface PublicForm {
  id: string;
  form_slug: string;
  form_name: string;
  created_at: string;
}

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<VCProfile | null>(null);
  const [thesisFilename, setThesisFilename] = useState<string | null>(null);
  const [publicForm, setPublicForm] = useState<PublicForm | null>(null);
  const [generatingUrl, setGeneratingUrl] = useState(false);

  // Function to get label by value
  const getAreaOfInterestLabel = (value: string) => {
    const option = AreaOfInterestOptions.find(opt => opt.value === value);
    return option ? option.label : value;
  };

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
        
        const profileData = data as VCProfile;
        setProfile(profileData);
        
        // Extract thesis filename if available
        if (profileData.fund_thesis_url) {
          setThesisFilename(profileData.fund_thesis_url.split('/').pop() || "Fund Thesis.pdf");
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
    
    fetchProfile();
  }, [user, navigate]);
  
  const generatePublicUrl = async () => {
    if (!user) return;
    
    try {
      setGeneratingUrl(true);
      
      // Generate a unique slug using timestamp and random string
      const timestamp = Date.now().toString(36);
      const randomStr = Math.random().toString(36).substring(2, 8);
      const slug = `${timestamp}-${randomStr}`;
      
      // Create a new public submission form
      const { data, error } = await supabase
        .from('public_submission_forms')
        .insert([{
          form_name: profile?.fund_name ? `${profile.fund_name} Submission Form` : 'VC Submission Form',
          form_slug: slug,
          is_active: true,
          user_id: user.id
        }])
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      setPublicForm(data as PublicForm);
      
      toast({
        title: "Public URL generated",
        description: "Your public submission URL has been created successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error generating URL",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingUrl(false);
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

  const publicSubmissionUrl = publicForm 
    ? `${window.location.origin}/submit/${publicForm.form_slug}`
    : null;

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
              
              <div>
                <p className="text-sm font-medium">Fund Thesis</p>
                {profile.fund_thesis_url ? (
                  <div className="flex items-center mt-1 space-x-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm">{thesisFilename}</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={downloadThesis}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No thesis uploaded</p>
                )}
              </div>
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
                      <Badge key={index} variant="secondary">
                        {getAreaOfInterestLabel(area)}
                      </Badge>
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
          
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Public Submission URL</h3>
            <Separator className="mb-4" />
            
            <div>
              {publicForm ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">URL:</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 p-3 bg-secondary/20 rounded-md break-all">
                      <a 
                        href={publicSubmissionUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-start gap-2"
                      >
                        <Globe className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{publicSubmissionUrl}</span>
                      </a>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(publicSubmissionUrl!);
                        toast({
                          title: "URL copied",
                          description: "The public submission URL has been copied to clipboard",
                        });
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Share this URL with founders to receive their pitch decks
                  </p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <p className="text-sm text-muted-foreground">No public URL</p>
                  <Button
                    size="sm"
                    onClick={generatePublicUrl}
                    disabled={generatingUrl}
                  >
                    {generatingUrl ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Generate Public URL
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
