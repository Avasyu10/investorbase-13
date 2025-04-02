
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from "lucide-react";

export default function TestEmail() {
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('Test Company');
  const [description, setDescription] = useState('Test description');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSendDirectEmail = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Call the edge function directly
      const response = await supabase.functions.invoke('barc_confirmation_email', {
        body: { 
          testEmail: true,
          submitter_email: email,
          title: title,
          description: description
        }
      });

      console.log('Function response:', response);
      setResult(response);

      if (response.error) {
        throw new Error(response.error.message || 'Unknown error');
      }

      toast({
        title: "Success",
        description: "Test email function called successfully",
      });
    } catch (error) {
      console.error('Error calling email function:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to call email function',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTestSubmission = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Create a test submission in the database
      const { data, error } = await supabase
        .from('public_form_submissions')
        .insert([
          { 
            submitter_email: email,
            title: title,
            description: description
          }
        ])
        .select();

      if (error) {
        throw error;
      }

      console.log('Submission created:', data);
      setResult(data);

      toast({
        title: "Success",
        description: "Test submission created successfully",
      });
    } catch (error) {
      console.error('Error creating test submission:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create test submission',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Test Email Functionality</CardTitle>
          <CardDescription>Test the BARC confirmation email function</CardDescription>
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
            <Label htmlFor="title">Company Title</Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Enter company title" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Enter description" 
              rows={3}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 w-full">
            <Button 
              onClick={handleSendDirectEmail} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : "Test Direct Email"}
            </Button>
            <Button 
              onClick={handleCreateTestSubmission} 
              disabled={loading}
              className="w-full"
              variant="outline"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : "Create Test Submission"}
            </Button>
          </div>
          
          {result && (
            <div className="w-full p-4 bg-slate-100 dark:bg-slate-800 rounded-md overflow-auto text-sm">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
