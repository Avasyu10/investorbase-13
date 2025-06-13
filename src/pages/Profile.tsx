
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InvestorPitchEmail } from "@/components/profile/InvestorPitchEmail";
import { ConditionalAlertsSection } from "@/components/profile/ConditionalAlertsSection";
import { CreateBarcFormButton } from "@/components/profile/CreateBarcFormButton";
import { ProfileNavigation } from "@/components/profile/ProfileNavigation";
import { Loader2, GraduationCap, Copy, ExternalLink, Building, Edit, Globe, Tag, Layers } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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

const Profile = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading, isIITBombay } = useProfile();
  const [activeTab, setActiveTab] = useState(isIITBombay ? "profile" : "email");
  const [iitBombayFormSlug, setIitBombayFormSlug] = useState<string | null>(null);
  const [isCreatingForm, setIsCreatingForm] = useState(false);
  const [vcProfile, setVcProfile] = useState<VCProfile | null>(null);
  const [loading, setLoading] = useState(true);

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
          setVcProfile(data as VCProfile);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVCProfile();
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
        } else {
          console.log('No IIT Bombay form found for user, creating one automatically...');
          await createBarcFormAutomatically();
        }
      } catch (error) {
        console.error('Error in fetchOrCreateIITBombayForm:', error);
      }
    };

    fetchOrCreateIITBombayForm();
  }, [user, isIITBombay]);

  const createBarcFormAutomatically = async () => {
    if (!user || isCreatingForm) return;

    setIsCreatingForm(true);
    try {
      const formName = "IIT Bombay BARC Applications";
      const formSlug = "iit-bombay-barc-applications";

      console.log('Creating BARC form automatically for user:', user.id);

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
      console.log('BARC form created automatically with slug:', finalSlug);
      toast.success("Your IIT Bombay BARC form has been created automatically!");
    } catch (error: any) {
      console.error('Error creating BARC form automatically:', error);
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
    toast.success("Your new IIT Bombay BARC form has been created!");
  };

  // Generate the IIT Bombay form URL using the user's actual form slug
  const iitBombayFormUrl = iitBombayFormSlug 
    ? `${window.location.origin}/barc-submit/${iitBombayFormSlug}`
    : null;

  // Generate the public submission URL for the VC profile
  const publicSubmissionUrl = user 
    ? `${window.location.origin}/public-upload?form=general-${user.id.substring(0, 8)}`
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

      {isIITBombay && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              IIT Bombay Public Form
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Share this URL with applicants who want to submit their BARC applications to IIT Bombay.
            </p>
            {isCreatingForm ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating your BARC form...</span>
              </div>
            ) : iitBombayFormUrl ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Input
                    value={iitBombayFormUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(iitBombayFormUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(iitBombayFormUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-muted-foreground mb-4">
                  <p className="mb-2">No BARC form found for your account.</p>
                  <p className="text-sm">
                    Create your dedicated IIT Bombay BARC form below to get started.
                  </p>
                </div>
                <CreateBarcFormButton onFormCreated={handleFormCreated} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          {isIITBombay && <TabsTrigger value="profile">Profile Details</TabsTrigger>}
          <TabsTrigger value="email">Investor Pitch Email</TabsTrigger>
          <TabsTrigger value="alerts">
            {isIITBombay ? "Alumni Alerts" : "Alerts"}
          </TabsTrigger>
        </TabsList>

        {isIITBombay && (
          <TabsContent value="profile">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                {vcProfile ? (
                  <>
                    {/* Fund Details */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building className="h-5 w-5" />
                          Fund Details
                          <Button variant="outline" size="sm" className="ml-auto" onClick={() => window.location.href = '/profile/edit'}>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Fund Name</Label>
                          <p className="text-sm">{vcProfile.fund_name || "Not specified"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Fund Size</Label>
                          <p className="text-sm">{vcProfile.fund_size || "Not specified"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Website</Label>
                          <p className="text-sm">{vcProfile.website_url || "Not specified"}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Investment Focus */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Tag className="h-5 w-5" />
                          Investment Focus
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Areas of Interest</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {vcProfile.areas_of_interest && vcProfile.areas_of_interest.length > 0 ? (
                              vcProfile.areas_of_interest.map((area, index) => (
                                <span key={index} className="bg-secondary px-2 py-1 rounded-md text-xs">
                                  {area}
                                </span>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">Not specified</p>
                            )}
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Investment Stages</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {vcProfile.investment_stage && vcProfile.investment_stage.length > 0 ? (
                              vcProfile.investment_stage.map((stage, index) => (
                                <span key={index} className="bg-secondary px-2 py-1 rounded-md text-xs">
                                  {stage}
                                </span>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">Not specified</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Portfolio */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Layers className="h-5 w-5" />
                          Portfolio
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Companies Invested</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {vcProfile.companies_invested && vcProfile.companies_invested.length > 0 ? (
                              vcProfile.companies_invested.map((company, index) => (
                                <span key={index} className="bg-secondary px-2 py-1 rounded-md text-xs">
                                  {company}
                                </span>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">No companies added yet</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Public Submission URL */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Globe className="h-5 w-5" />
                          Public Submission URL
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">
                          Share this URL with founders to receive pitch deck submissions directly.
                        </p>
                        {publicSubmissionUrl && (
                          <div className="flex items-center space-x-2">
                            <Input
                              value={publicSubmissionUrl}
                              readOnly
                              className="font-mono text-sm"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(publicSubmissionUrl)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(publicSubmissionUrl, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8">
                        <Building className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-medium">No profile setup yet</h3>
                        <p className="mt-2 text-muted-foreground">
                          Set up your investor profile to get started
                        </p>
                        <Button className="mt-4" onClick={() => window.location.href = '/profile/setup'}>
                          Set Up Profile
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-6">
                <ProfileNavigation />
              </div>
            </div>
          </TabsContent>
        )}

        <TabsContent value="email">
          <InvestorPitchEmail />
        </TabsContent>
        <TabsContent value="alerts">
          <ConditionalAlertsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;
