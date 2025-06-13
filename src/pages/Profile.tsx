
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
import { Loader2, GraduationCap, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Profile = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading, isIITBombay } = useProfile();
  const [activeTab, setActiveTab] = useState("email");
  const [iitBombayFormSlug, setIitBombayFormSlug] = useState<string | null>(null);

  // Fetch the IIT Bombay form belonging to the current user
  useEffect(() => {
    const fetchIITBombayForm = async () => {
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
          console.log('No IIT Bombay form found for user');
        }
      } catch (error) {
        console.error('Error in fetchIITBombayForm:', error);
      }
    };

    fetchIITBombayForm();
  }, [user, isIITBombay]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
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
            {iitBombayFormUrl ? (
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
            ) : (
              <div className="text-muted-foreground">
                <p className="mb-2">No active BARC form found for your account.</p>
                <p className="text-sm">
                  Please create a BARC form in the{" "}
                  <Button variant="link" className="p-0 h-auto" asChild>
                    <a href="/public-forms">Public Forms</a>
                  </Button>{" "}
                  section first.
                </p>
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
