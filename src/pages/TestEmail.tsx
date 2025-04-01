
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

export default function TestEmail() {
  const [submitterEmail, setSubmitterEmail] = useState('');
  const [title, setTitle] = useState('Test Company');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  const triggerEmailConfirmation = async () => {
    if (!submitterEmail) {
      toast({
        title: 'Email required',
        description: 'Please enter an email address to send the confirmation to',
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Create a fake submission in the public_form_submissions table
      const { data, error } = await supabase
        .from('public_form_submissions')
        .insert({
          title,
          submitter_email: submitterEmail,
        })
        .select();

      if (error) {
        throw error;
      }

      // Manually call the confirmation email function
      const functionResponse = await supabase.functions.invoke('barc_confirmation_email', {
        body: { 
          debug: true,
          testMode: true,
          submissionId: data[0].id 
        }
      });

      setResponse(functionResponse);
      
      if (functionResponse.error) {
        throw new Error(`Function error: ${functionResponse.error.message || JSON.stringify(functionResponse.error)}`);
      }

      toast({
        title: 'Test email sent',
        description: `Confirmation email triggered to ${submitterEmail}`,
      });
    } catch (error) {
      console.error('Error triggering test email:', error);
      toast({
        title: 'Failed to send test email',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Test Email Confirmation</CardTitle>
          <CardDescription>
            Send a test BARC confirmation email to any address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="recipient@example.com"
              value={submitterEmail}
              onChange={(e) => setSubmitterEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Company Name</Label>
            <Input
              id="company"
              type="text"
              placeholder="Test Company"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button 
            className="w-full" 
            onClick={triggerEmailConfirmation}
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Test Email'}
          </Button>
          
          {response && (
            <div className="w-full bg-gray-100 dark:bg-gray-800 p-4 rounded text-sm overflow-x-auto">
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
