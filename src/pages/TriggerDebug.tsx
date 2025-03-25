
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  checkTriggerSetup, 
  debugTriggerFunction, 
  viewLatestEmailSubmissions,
  createTestSubmission
} from '@/lib/triggerDebugging';
import { toast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, RefreshCw, PlayCircle } from 'lucide-react';

export default function TriggerDebug() {
  const [submissionId, setSubmissionId] = useState("");
  const [emailSubmissions, setEmailSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // Load latest submissions when page loads
    loadSubmissions();
  }, []);
  
  async function loadSubmissions() {
    setLoading(true);
    const submissions = await viewLatestEmailSubmissions();
    setEmailSubmissions(submissions);
    setLoading(false);
  }
  
  async function handleCheckTrigger() {
    setLoading(true);
    await checkTriggerSetup();
    setLoading(false);
  }
  
  async function handleTestFunction() {
    if (!submissionId) {
      toast({
        title: "Submission ID required",
        description: "Please enter a submission ID or select one from the list",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    await debugTriggerFunction(submissionId);
    await loadSubmissions(); // Refresh the list after testing
    setLoading(false);
  }
  
  async function handleCreateTestSubmission() {
    try {
      setLoading(true);
      
      // Call our new function to create a test submission via edge function
      const result = await createTestSubmission();
      
      if (result && result.id) {
        setSubmissionId(result.id);
        // Refresh the list
        await loadSubmissions();
      }
    } catch (error) {
      console.error("Error in test:", error);
      toast({
        title: "Test failed",
        description: "An error occurred during the test",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }
  
  async function handleRunEdgeFunction() {
    if (!submissionId) {
      toast({
        title: "Submission ID required",
        description: "Please enter a submission ID or select one from the list",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Call the edge function directly to process the submission
      const response = await fetch(
        "https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/auto-analyze-email-submission",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpodG5ydWt0bXRqcXJmb2l5cmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3NTczMzksImV4cCI6MjA1NzMzMzMzOX0._HZzAtVcTH_cdXZoxIeERNYqS6_hFEjcWbgHK3vxQBY"
          },
          body: JSON.stringify({ submissionId })
        }
      );
      
      const text = await response.text();
      console.log("Edge function status:", response.status);
      console.log("Edge function response:", text);
      
      let jsonData;
      try {
        jsonData = JSON.parse(text);
        console.log("Parsed response:", jsonData);
      } catch (e) {
        console.log("Could not parse response as JSON");
      }
      
      toast({
        title: response.ok ? "Request succeeded" : "Request failed",
        description: jsonData?.error || jsonData?.message || `Status: ${response.status}`,
        variant: response.ok ? "default" : "destructive"
      });
      
      // Refresh submissions list to see updated data
      await loadSubmissions();
    } catch (error) {
      console.error("Error calling edge function:", error);
      toast({
        title: "Request failed",
        description: "Error calling edge function. See console for details.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Trigger Debugging Tools</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Check Trigger Setup</CardTitle>
            <CardDescription>
              Check if the database trigger and function are properly set up
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button 
              onClick={handleCheckTrigger} 
              disabled={loading}
              className="w-full"
              variant="outline"
            >
              {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Check Database Triggers
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Create Test Submission</CardTitle>
            <CardDescription>
              Create a test email submission to test the trigger
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button 
              onClick={handleCreateTestSubmission} 
              disabled={loading}
              className="w-full"
              variant="outline"
            >
              {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
              Create Test Submission
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Test Edge Function</CardTitle>
            <CardDescription>
              Directly call the edge function with a submission ID
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Input
                placeholder="Enter submission ID"
                value={submissionId}
                onChange={(e) => setSubmissionId(e.target.value)}
              />
              <Button onClick={handleRunEdgeFunction} disabled={loading || !submissionId}>
                {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                Run Function
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Recent Email Submissions</CardTitle>
              <CardDescription>
                Select a submission to test or view details
              </CardDescription>
            </div>
            <Button 
              onClick={loadSubmissions} 
              variant="outline" 
              size="icon" 
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center p-6">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : emailSubmissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6">
                <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No submissions found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {emailSubmissions.map((submission) => (
                  <div 
                    key={submission.id} 
                    className="p-4 border rounded-lg cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => setSubmissionId(submission.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">
                          {submission.subject || "No subject"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          From: {submission.from_email} • To: {submission.to_email}
                        </p>
                        <p className="text-sm mt-1">
                          {new Date(submission.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        {submission.report_id ? (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded dark:bg-green-900 dark:text-green-100">
                            Processed
                          </span>
                        ) : (
                          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded dark:bg-yellow-900 dark:text-yellow-100">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 text-xs font-mono bg-muted p-2 rounded overflow-hidden text-ellipsis break-all">
                      ID: {submission.id}
                    </div>
                    {submission.attachment_url && (
                      <div className="mt-1 text-xs font-mono overflow-hidden text-ellipsis break-all">
                        Attachment: {submission.attachment_url}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
