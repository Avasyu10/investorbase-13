
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InvestorPitchEmail } from "@/components/profile/InvestorPitchEmail";
import { ConditionalAlertsSection } from "@/components/profile/ConditionalAlertsSection";
import { CreateBarcFormButton } from "@/components/profile/CreateBarcFormButton";
import { Loader2, GraduationCap, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Profile = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading, isIITBombay } = useProfile();
  const [activeTab, setActiveTab] = useState("email");
  const [iitBombayFormSlug, setIitBombayFormSlug] = useState<string | null>(null);
  const [isCreatingForm, setIsCreatingForm] = useState(false);

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

  if (authLoading || profileLoading) {
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
          <TabsTrigger value="email">Investor Pitch Email</TabsTrigger>
          <TabsTrigger value="alerts">
            {isIITBombay ? "Alumni Alerts" : "Alerts"}
          </TabsTrigger>
        </TabsList>
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
