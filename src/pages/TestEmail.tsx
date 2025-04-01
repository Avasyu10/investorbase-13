
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';

export default function TestEmail() {
  const [email, setEmail] = useState('test@example.com');
  const [companyName, setCompanyName] = useState('Test Company');
  const [loading, setLoading] = useState(false);

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

    try {
      // Call the edge function directly with test data
      const response = await supabase.functions.invoke('barc_confirmation_email', {
        body: { 
          testMode: true, 
          testEmail: email,
          testCompanyName: companyName
        }
      });

      console.log('Function response:', response);

      if (response.error) {
        throw new Error(response.error.message || 'Unknown error');
      }

      toast({
        title: "Success",
        description: "Test email sent successfully. Check console for details.",
      });
    } catch (error) {
      console.error('Error sending test email:', error);
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
              placeholder="Enter email address" 
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
        <CardFooter>
          <Button 
            onClick={handleSendTestEmail} 
            disabled={loading}
            className="w-full"
          >
            {loading ? "Sending..." : "Send Test Email"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
