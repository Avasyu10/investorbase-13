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
import { Loader2, Download, Edit, Globe, FileText, Plus, ExternalLink, Building, Tag, Layers, Mail, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AreaOfInterestOptions } from "@/lib/constants";
import { InvestorPitchEmail } from "@/components/profile/InvestorPitchEmail";
import { AlertsSection } from "@/components/profile/AlertsSection";

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
  form_type: string;
  created_at: string;
  auto_analyze: boolean;
}

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<VCProfile | null>(null);
  const [profileChecked, setProfileChecked] = useState(false);
  const [thesisFilename, setThesisFilename] = useState<string | null>(null);
  const [publicForms, setPublicForms] = useState<PublicForm[]>([]);
  const [generatingUrl, setGeneratingUrl] = useState(false);
  const [updatingAutoAnalyze, setUpdatingAutoAnalyze] = useState<string | null>(null);

  const getAreaOfInterestLabel = (value: string) => {
    const option = AreaOfInterestOptions.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  const createBarcForm = async () => {
    if (!user) return;
    
    try {
      const { data: existingForm } = await supabase
        .from('public_submission_forms')
        .select('id')
        .eq('user_id', user.id)
        .eq('form_type', 'barc')
        .maybeSingle();
      
      if (existingForm) {
        console.log("BARC form already exists");
        return;
      }
      
      const { data, error } = await supabase
        .from('public_submission_forms')
        .insert([{
          form_name: "IIT Bombay Application Form",
          form_slug: user.id,
          form_type: 'barc',
          is_active: true,
          user_id: user.id,
          auto_analyze: false
        }])
        .select()
        .single();
        
      if (error) {
        console.error("Error creating BARC form:", error);
        return;
      }
      
      console.log("Created BARC form:", data);
      setPublicForms(prev => [...prev, data as PublicForm]);
    } catch (error) {
      console.error("Error creating BARC form:", error);
    }
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
          .maybeSingle();
          
        if (error) {
          console.error("Error fetching profile:", error);
          setProfileChecked(true);
          
          if (window.location.pathname === '/profile' && error.code === 'PGRST116') {
            navigate('/profile/setup');
          }
          return;
        }
        
        const profileData = data as VCProfile;
        setProfile(profileData);
        setProfileChecked(true);
        
        if (profileData.fund_thesis_url) {
          setThesisFilename(profileData.fund_thesis_url.split('/').pop() || "Fund Thesis.pdf");
        }
        
        // Fetch all forms for this user
        const { data: formData, error: formError } = await supabase
          .from('public_submission_forms')
          .select('id, form_slug, form_name, form_type, created_at, auto_analyze')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (formError) {
          console.error("Error fetching public forms:", formError);
        } else if (formData) {
          console.log("Fetched forms:", formData);
          setPublicForms(formData as PublicForm[]);
        }

        // Create BARC form if user has a profile but no BARC form exists
        if (profileData) {
          await createBarcForm();
        }
      } catch (error) {
        console.error("Error:", error);
        setProfileChecked(true);
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
      
      const timestamp = Date.now().toString(36);
      const randomStr = Math.random().toString(36).substring(2, 8);
      const slug = `${timestamp}-${randomStr}`;
      
      const { data, error } = await supabase
        .from('public_submission_forms')
        .insert([{
          form_name: profile?.fund_name ? `${profile.fund_name} Submission Form` : 'VC Submission Form',
          form_slug: slug,
          form_type: 'general',
          is_active: true,
          user_id: user.id,
          auto_analyze: false
        }])
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      setPublicForms(prev => [data as PublicForm, ...prev]);
      
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

  const toggleAutoAnalyze = async (formId: string, currentValue: boolean) => {
    if (!user) return;
    
    // Skip toggle for BARC forms
    if (formId.startsWith('barc-')) {
      toast({
        title: "BARC Form Setting",
        description: "Auto-analyze settings for BARC forms are managed separately.",
      });
      return;
    }
    
    try {
      setUpdatingAutoAnalyze(formId);
      
      const newValue = !currentValue;
      
      const { error } = await supabase
        .from('public_submission_forms')
        .update({ auto_analyze: newValue })
        .eq('id', formId);
        
      if (error) {
        throw error;
      }
      
      setPublicForms(prev => 
        prev.map(form => 
          form.id === formId 
            ? { ...form, auto_analyze: newValue }
            : form
        )
      );
      
      toast({
        title: newValue ? "Auto-analyze enabled" : "Auto-analyze disabled",
        description: newValue 
          ? "Pitch decks submitted through this form will be automatically analyzed" 
          : "Submitted pitch decks will require manual approval for analysis",
      });
    } catch (error: any) {
      toast({
        title: "Error updating setting",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingAutoAnalyze(null);
    }
  };

  const getFormUrl = (form: PublicForm) => {
    if (form.form_type === 'barc') {
      return `${window.location.origin}/barc-submit/${form.form_slug}`;
    }
    return `${window.location.origin}/public-upload/${form.form_slug}`;
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

  const downloadThesis = async () => {
    if (!profile?.fund_thesis_url) return;
    
    try {
      const { data, error } = await supabase.storage
        .from('vc-documents')
        .download(profile.fund_thesis_url);
        
      if (error) throw error;
      
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
      <div className="container max-w-4xl mx-auto px-4 py-12 flex justify-center items-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading profile information...</p>
        </div>
      </div>
    );
  }

  if (!profile && profileChecked) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <Card className="border-none shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Profile Not Found</CardTitle>
            <CardDescription>You haven't set up your VC profile yet</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pt-4">
            <Button 
              onClick={() => navigate('/profile/setup')}
              className="px-8"
              size="lg"
            >
              <Plus className="mr-2 h-4 w-4" />
              Set Up Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-12">
      <Card className="animate-fade-in border-none shadow-lg">
        <CardHeader className="pb-2 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-3xl font-bold mb-1 text-foreground/90">
                {profile.fund_name || "Your VC Fund"}
              </CardTitle>
              <CardDescription className="text-muted-foreground/80 font-medium">
                {user?.email}
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4 sm:mt-0 transition-all hover:bg-primary hover:text-primary-foreground"
              onClick={() => navigate('/profile/edit')}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 pt-6">
          <div>
            <div className="flex items-center mb-3">
              <Building className="h-5 w-5 text-primary mr-2" />
              <h3 className="text-base font-semibold text-foreground/80">Fund Details</h3>
            </div>
            <Separator className="mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-secondary/10 p-4 rounded-lg">
                <p className="text-sm font-medium text-primary mb-2">Fund Size</p>
                <p className="text-lg font-medium">{profile.fund_size || "Not specified"}</p>
              </div>
              
              <div className="bg-secondary/10 p-4 rounded-lg">
                <p className="text-sm font-medium text-primary mb-2">Investment Thesis</p>
                {profile.fund_thesis_url ? (
                  <div className="flex items-center mt-1 space-x-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="text-sm truncate max-w-[150px]">{thesisFilename}</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={downloadThesis}
                      className="ml-auto"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <p className="text-sm text-muted-foreground">No thesis uploaded</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/profile/edit')}
                      className="ml-auto text-primary"
                    >
                      Upload
                    </Button>
                  </div>
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
            
            <div className="space-y-6">
              <div className="bg-secondary/10 p-4 rounded-lg">
                <p className="text-sm font-medium text-primary mb-3">Areas of Interest</p>
                <div className="flex flex-wrap gap-2">
                  {profile.areas_of_interest && profile.areas_of_interest.length > 0 ? (
                    profile.areas_of_interest.map((area, index) => (
                      <Badge key={index} variant="secondary" className="py-1 px-3">
                        {getAreaOfInterestLabel(area)}
                      </Badge>
                    ))
                  ) : (
                    <div className="flex items-center w-full">
                      <p className="text-sm text-muted-foreground">No areas specified</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/profile/edit')}
                        className="ml-auto text-primary"
                      >
                        Add Areas
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-secondary/10 p-4 rounded-lg">
                <p className="text-sm font-medium text-primary mb-3">Investment Stages</p>
                <div className="flex flex-wrap gap-2">
                  {profile.investment_stage && profile.investment_stage.length > 0 ? (
                    profile.investment_stage.map((stage, index) => (
                      <Badge key={index} variant="secondary" className="py-1 px-3">{stage}</Badge>
                    ))
                  ) : (
                    <div className="flex items-center w-full">
                      <p className="text-sm text-muted-foreground">No stages specified</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/profile/edit')}
                        className="ml-auto text-primary"
                      >
                        Add Stages
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <div className="flex items-center mb-3">
              <Layers className="h-5 w-5 text-primary mr-2" />
              <h3 className="text-base font-semibold text-foreground/80">Portfolio</h3>
            </div>
            <Separator className="mb-4" />
            
            <div className="bg-secondary/10 p-4 rounded-lg">
              <p className="text-sm font-medium text-primary mb-3">Companies Invested</p>
              {profile.companies_invested && profile.companies_invested.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {profile.companies_invested.map((company, index) => (
                    <div key={index} className="bg-background/50 px-3 py-2 rounded border border-border/10 text-sm font-medium">
                      {company}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center">
                  <p className="text-sm text-muted-foreground">No companies specified</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/profile/edit')}
                    className="ml-auto text-primary"
                  >
                    Add Companies
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <div className="flex items-center mb-3">
              <Globe className="h-5 w-5 text-primary mr-2" />
              <h3 className="text-base font-semibold text-foreground/80">Public Submission Forms</h3>
            </div>
            <Separator className="mb-4" />
            
            <p className="text-sm text-muted-foreground mb-4">
              Create and manage forms for receiving submissions. Share these forms on your website to streamline the submission process.
            </p>
            
            <div className="space-y-4">
              {publicForms.length > 0 ? (
                publicForms.map((form) => (
                  <div key={form.id} className="bg-secondary/10 p-4 rounded-lg">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-primary">{form.form_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {getFormTypeLabel(form.form_type)} • Created {new Date(form.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {getFormTypeLabel(form.form_type)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex-1 p-3 bg-background/80 rounded-md break-all border border-border/10">
                          <a 
                            href={getFormUrl(form)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-start gap-2"
                          >
                            <ExternalLink className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{getFormUrl(form)}</span>
                          </a>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(getFormUrl(form));
                            toast({
                              title: "URL copied",
                              description: "The form URL has been copied to clipboard",
                            });
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between space-x-2 pt-2 border-t border-border/10">
                        <div className="flex-1">
                          <p className="text-sm font-medium">Auto-analyze Submissions</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {form.auto_analyze ? 
                              "Submissions will be automatically analyzed" : 
                              "Submissions require manual approval for analysis"}
                          </p>
                        </div>
                        <div className="flex items-center">
                          <Switch
                            checked={form.auto_analyze}
                            onCheckedChange={() => toggleAutoAnalyze(form.id, form.auto_analyze)}
                            disabled={updatingAutoAnalyze === form.id || form.form_type === 'barc'}
                            id={`auto-analyze-${form.id}`}
                          />
                          {updatingAutoAnalyze === form.id && <Loader2 className="ml-2 h-4 w-4 animate-spin text-muted-foreground" />}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-secondary/10 p-4 rounded-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-primary mb-1">No forms created yet</p>
                      <p className="text-xs text-muted-foreground">Create forms for founders to submit their information</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={generatePublicUrl}
                      disabled={generatingUrl}
                      className="w-full sm:w-auto"
                    >
                      {generatingUrl ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="mr-2 h-4 w-4" />
                      )}
                      Create First Form
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => navigate('/public-forms')}
                  className="w-full sm:w-auto"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Manage All Forms
                </Button>
              </div>
            </div>
          </div>
          
          <AlertsSection />
          
          <div>
            <div className="flex items-center mb-3">
              <Mail className="h-5 w-5 text-primary mr-2" />
              <h3 className="text-base font-semibold text-foreground/80">InvestorBase Pitch Email</h3>
            </div>
            <Separator className="mb-4" />
            
            <InvestorPitchEmail />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
