
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Send } from 'lucide-react';

export default function EmailTest() {
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('Test Submission');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingDirect, setIsSendingDirect] = useState(false);

  // Function to create a test submission
  const createTestSubmission = async () => {
    if (!email) {
      toast({
        title: 'Email Required',
        description: 'Please enter an email address to test with.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create a test submission in the public_form_submissions table
      const { data, error } = await supabase
        .from('public_form_submissions')
        .insert({
          title: title || 'Test Submission',
          description: 'This is a test submission created from the Email Test page.',
          submitter_email: email,
        })
        .select();

      if (error) {
        throw error;
      }

      toast({
        title: 'Test Submission Created',
        description: 'A test submission has been created. Check for the confirmation email.',
      });

      console.log('Test submission created:', data);
    } catch (error) {
      console.error('Error creating test submission:', error);
      toast({
        title: 'Error Creating Submission',
        description: error.message || 'An error occurred while creating the test submission.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to test the email function directly
  const testEmailFunctionDirect = async () => {
    if (!email) {
      toast({
        title: 'Email Required',
        description: 'Please enter an email address to test with.',
        variant: 'destructive',
      });
      return;
    }

    setIsSendingDirect(true);
    try {
      // Call the edge function directly with a mock record
      const { data, error } = await supabase.functions.invoke('barc_confirmation_email', {
        body: { 
          record: {
            id: 'test-id',
            title: title || 'Test Submission',
            description: 'This is a direct test of the email function.',
            submitter_email: email,
            created_at: new Date().toISOString(),
          }
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Test Email Sent Directly',
        description: `Email sent to ${email}. Check your inbox.`,
      });

      console.log('Direct email test result:', data);
    } catch (error) {
      console.error('Error testing email function directly:', error);
      toast({
        title: 'Error Sending Test Email',
        description: error.message || 'An error occurred while sending the test email.',
        variant: 'destructive',
      });
    } finally {
      setIsSendingDirect(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Email Function Test</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Email Confirmation</CardTitle>
            <CardDescription>
              This page allows you to test the email confirmation functionality by creating a test submission or calling the email function directly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Test Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email to receive test message"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Test Submission Title</Label>
              <Input
                id="title"
                placeholder="Enter submission title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col space-y-3 sm:flex-row sm:space-x-3 sm:space-y-0">
            <Button 
              onClick={createTestSubmission} 
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Test Submission
            </Button>
            <Button 
              onClick={testEmailFunctionDirect} 
              disabled={isSendingDirect}
              variant="outline"
              className="w-full sm:w-auto"
            >
              {isSendingDirect && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Send className="mr-2 h-4 w-4" />
              Test Email Function Directly
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
