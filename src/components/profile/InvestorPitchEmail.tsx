
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent,
  CardFooter,
  CardDescription,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check, AlertCircle, Mail } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface InvestorPitchEmail {
  id: string;
  email_address: string | null;
  request_status: 'pending' | 'completed' | 'rejected';
  requested_at: string;
  auto_analyze: boolean;
}

export const InvestorPitchEmail = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [emailAddress, setEmailAddress] = useState("");
  const [requestingEmail, setRequestingEmail] = useState(false);
  const [emailSettings, setEmailSettings] = useState<InvestorPitchEmail | null>(null);
  const [updatingAutoAnalyze, setUpdatingAutoAnalyze] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchEmailSettings();
  }, [user]);

  const fetchEmailSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('investor_pitch_emails')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      
      setEmailSettings(data);
      
      if (data?.email_address) {
        setEmailAddress(data.email_address);
      }
    } catch (error) {
      console.error("Error fetching email settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const requestEmailAddress = async () => {
    if (!user) return;
    
    if (!emailAddress || !emailAddress.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email address",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setRequestingEmail(true);
      
      const { data, error } = await supabase
        .from('investor_pitch_emails')
        .insert([{
          user_id: user.id,
          email_address: emailAddress,
          request_status: 'completed', // Auto-approve for now
          auto_analyze: false
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      setEmailSettings(data);
      
      toast({
        title: "Email address registered",
        description: "Your email address has been set up to receive pitch decks",
      });
    } catch (error: any) {
      toast({
        title: "Request failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setRequestingEmail(false);
    }
  };

  const toggleAutoAnalyze = async () => {
    if (!user || !emailSettings) return;
    
    try {
      setUpdatingAutoAnalyze(true);
      
      const newValue = !emailSettings.auto_analyze;
      
      // Call the RPC function to update the setting
      const { data, error } = await supabase
        .rpc('update_investor_pitch_email_setting', {
          auto_analyze_value: newValue,
          record_id: emailSettings.id
        });
        
      if (error) throw error;
      
      if (!data) {
        throw new Error("Failed to update setting - permission denied");
      }
      
      setEmailSettings({
        ...emailSettings,
        auto_analyze: newValue
      });
      
      toast({
        title: newValue ? "Auto-analyze enabled" : "Auto-analyze disabled",
        description: newValue 
          ? "Pitch decks sent to your email will be automatically analyzed" 
          : "You'll need to manually analyze emailed pitch decks",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUpdatingAutoAnalyze(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground mb-4">
        Get a unique email address to receive pitch decks directly from founders. When they email their deck to this address, it will automatically appear in your dashboard.
      </p>
      
      {emailSettings?.request_status === 'completed' ? (
        <Card className="bg-secondary/10 shadow-sm">
          <CardContent className="pt-6 pb-4">
            <div className="flex flex-col space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <CardTitle className="text-base font-medium">Your Pitch Deck Email</CardTitle>
                  <CardDescription>
                    Share this email address with founders so they can send you their pitch decks
                  </CardDescription>
                </div>
              </div>
              
              <div className="flex items-center mt-2 px-3 py-2 bg-background/80 rounded-md break-all border border-border/10">
                <span className="text-primary font-medium">{emailSettings.email_address}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={() => {
                    if (emailSettings.email_address) {
                      navigator.clipboard.writeText(emailSettings.email_address);
                      toast({
                        title: "Email copied",
                        description: "Pitch deck email address copied to clipboard",
                      });
                    }
                  }}
                >
                  Copy
                </Button>
              </div>
              
              <div className="flex items-center justify-between border-t border-border/10 pt-4 mt-2">
                <div>
                  <Label htmlFor="auto-analyze" className="font-medium">Auto-analyze Submissions</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {emailSettings.auto_analyze 
                      ? "Pitch decks sent to this email will be automatically analyzed" 
                      : "You'll need to manually analyze emailed pitch decks"}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-analyze"
                    checked={emailSettings.auto_analyze}
                    onCheckedChange={toggleAutoAnalyze}
                    disabled={updatingAutoAnalyze}
                  />
                  {updatingAutoAnalyze && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <p className="text-sm font-medium text-orange-500">No email address set up yet</p>
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="email-address">Email Address for Pitch Decks</Label>
                <Input
                  id="email-address"
                  type="email"
                  placeholder="e.g., pitches@yourcompany.com"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  disabled={requestingEmail}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  This will be the email address that founders can send their pitch decks to
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4 bg-background/50">
            <Button 
              onClick={requestEmailAddress}
              disabled={requestingEmail || !emailAddress}
              className="ml-auto"
            >
              {requestingEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting Up...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Register Email
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};
