
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Copy, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Define the interface for InvestorPitchEmail type
interface InvestorPitchEmail {
  id: string;
  email_address: string;
  request_status: "pending" | "completed" | "rejected";
  requested_at: string;
  approved_at: string | null;
  user_id: string;
  auto_analyze: boolean;
  created_at: string;
  updated_at: string;
}

export function InvestorPitchEmail({ isSetupPage = false }: { isSetupPage?: boolean }) {
  const [email, setEmail] = useState<InvestorPitchEmail | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchPitchEmail() {
      try {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('investor_pitch_emails')
          .select('*')
          .eq('user_id', user.id)
          .eq('request_status', 'completed')
          .single();

        if (error && error.code !== 'PGSQL_ERROR_NO_DATA_FOUND') {
          throw error;
        }

        if (data) {
          // Cast to ensure type safety
          setEmail(data as InvestorPitchEmail);
        }
      } catch (error) {
        console.error("Error fetching pitch email:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPitchEmail();
  }, []);

  const copyToClipboard = () => {
    if (!email?.email_address) return;
    
    navigator.clipboard.writeText(email.email_address)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(err => {
        console.error("Could not copy text: ", err);
      });
  };

  const toggleAutoAnalyze = async () => {
    if (!email) return;

    try {
      setIsToggling(true);
      
      // Call the security definer function to update the auto_analyze setting
      const { data, error } = await supabase.rpc(
        'update_investor_pitch_email_setting',
        { 
          record_id: email.id,
          auto_analyze_value: !email.auto_analyze 
        }
      );
      
      if (error) throw error;
      
      if (data === true) {
        // Update was successful, update local state
        setEmail({
          ...email,
          auto_analyze: !email.auto_analyze
        });
        
        toast({
          title: "Setting updated",
          description: `Auto-analyze is now ${!email.auto_analyze ? "enabled" : "disabled"}`,
        });
      } else {
        toast({
          title: "Update failed",
          description: "Unable to update auto-analyze setting",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error toggling auto-analyze:", error);
      toast({
        title: "Error",
        description: "Failed to update auto-analyze setting",
        variant: "destructive"
      });
    } finally {
      setIsToggling(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Email Address</CardTitle>
          <CardDescription>Loading your dedicated email address...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!email) {
    if (isSetupPage) {
      return null;
    }
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Email Address</CardTitle>
          <CardDescription>
            You don't have a dedicated email address yet. 
            Please complete your profile setup first.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Your Investor Pitch Email
        </CardTitle>
        <CardDescription>
          Send pitch decks to this email to automatically import them
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between bg-muted/50 p-3 rounded-md">
            <div className="font-mono text-sm">{email.email_address}</div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={copyToClipboard}
              title="Copy to clipboard"
            >
              {isCopied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="auto-analyze">Auto-analyze Submissions from Email</Label>
              <p className="text-sm text-muted-foreground">
                Automatically analyze pitch decks sent to your email
              </p>
            </div>
            <Switch
              id="auto-analyze"
              checked={email.auto_analyze}
              onCheckedChange={toggleAutoAnalyze}
              disabled={isToggling}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Badge variant={email.auto_analyze ? "default" : "outline"}>
          {email.auto_analyze ? "Auto-analyze On" : "Auto-analyze Off"}
        </Badge>
      </CardFooter>
    </Card>
  );
}
