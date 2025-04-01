
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from "lucide-react";
import { EmailSecretCheck } from '@/components/EmailSecretCheck';

export default function TestEmail() {
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('Test Company');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  const handleSendTestEmail = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResponse(null);

    try {
      // Check if the RESEND_API_KEY is configured
      const { data: secrets, error: secretsError } = await supabase.functions.listSecrets();
      
      if (secretsError) {
        throw new Error(`Failed to check for RESEND_API_KEY: ${secretsError.message}`);
      }
      
      const hasResendApiKey = secrets?.some(secret => secret.name === 'RESEND_API_KEY');
      
      if (!hasResendApiKey) {
        throw new Error('RESEND_API_KEY is not configured in Supabase Edge Functions');
      }

      // Call the edge function directly with test data
      const response = await supabase.functions.invoke('barc_confirmation_email', {
        body: { 
          testMode: true, 
          testEmail: email,
          testCompanyName: companyName
        }
      });

      console.log('Function response:', response);
      setResponse(response);

      if (response.error) {
        throw new Error(response.error.message || 'Unknown error');
      }

      toast({
        title: "Success",
        description: "Test email sent successfully. Check console for details.",
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      setResponse({ error: error instanceof Error ? error.message : String(error) });
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to send test email',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-md mx-auto mb-6">
        <EmailSecretCheck />
      </div>
      
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Test Email Functionality</CardTitle>
          <CardDescription>Send a test confirmation email</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input 
              id="email" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="Enter your email address" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input 
              id="companyName" 
              value={companyName} 
              onChange={(e) => setCompanyName(e.target.value)} 
              placeholder="Enter company name" 
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button 
            onClick={handleSendTestEmail} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : "Send Test Email"}
          </Button>
          
          {response && (
            <div className="w-full p-4 bg-slate-100 dark:bg-slate-800 rounded-md overflow-auto text-sm">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
