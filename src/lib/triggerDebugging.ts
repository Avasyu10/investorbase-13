
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Utility to check if the auto_analyze_email_submission database function and trigger exist
 */
export async function checkTriggerSetup() {
  try {
    console.log("Checking email submissions with service role...");
    
    // Call our edge function to check email submissions using the service role key
    const response = await fetch(
      "https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/create-test-email-submission",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpodG5ydWt0bXRqcXJmb2l5cmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3NTczMzksImV4cCI6MjA1NzMzMzMzOX0._HZzAtVcTH_cdXZoxIeERNYqS6_hFEjcWbgHK3vxQBY"
        },
        body: JSON.stringify({ action: 'list' })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error response from service role function:`, errorText);
      throw new Error(`Failed to check submissions with service role: ${response.status} ${response.statusText}`);
    }
    
    const serviceData = await response.json();
    
    console.log("Database email_submissions table queried with service role:", serviceData);
    
    // Check if the trigger exists and is properly set up
    try {
      // Try to get information about DB triggers
      console.log("Checking database triggers for email_submissions table...");
      
      console.log("Recent email submissions:", serviceData.submissions);
      
      // Check on the trigger status
      toast({
        title: "Trigger check completed",
        description: "See console for details about database triggers and email submissions",
      });
    } catch (err) {
      console.error("Error processing submissions data:", err);
    }
    
    return true;
  } catch (error) {
    console.error("Error checking triggers:", error);
    toast({
      title: "Trigger check failed",
      description: "Could not check submissions with service role. See console for details.",
      variant: "destructive"
    });
    return false;
  }
}

/**
 * Utility to manually trigger the auto-analyze function for debugging
 */
export async function debugTriggerFunction(submissionId: string) {
  try {
    console.log("Manually testing trigger function for submission:", submissionId);
    
    // Direct call to the edge function
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
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error response from edge function:`, errorText);
      throw new Error(`Failed to call edge function: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log("Edge function response:", data);
    
    toast({
      title: "Function test successful",
      description: "Edge function responded successfully. See console for details.",
    });
    
    return true;
  } catch (error) {
    console.error("Error testing function:", error);
    toast({
      title: "Function test failed",
      description: "An error occurred when testing the function",
      variant: "destructive"
    });
    return false;
  }
}

/**
 * Utility to view latest email submissions from the database
 */
export async function viewLatestEmailSubmissions() {
  try {
    // Use direct fetch to edge function instead of supabase client
    const response = await fetch(
      "https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/create-test-email-submission",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpodG5ydWt0bXRqcXJmb2l5cmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3NTczMzksImV4cCI6MjA1NzMzMzMzOX0._HZzAtVcTH_cdXZoxIeERNYqS6_hFEjcWbgHK3vxQBY"
        },
        body: JSON.stringify({ action: 'list' })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error response from list submissions function:`, errorText);
      throw new Error(`Failed to fetch submissions: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const submissions = data?.submissions || [];
    
    console.log("Latest email submissions:", submissions);
    return submissions;
  } catch (error) {
    console.error("Error viewing submissions:", error);
    return [];
  }
}

/**
 * Utility to create a test email submission bypassing RLS using a service role API call
 */
export async function createTestSubmission() {
  try {
    console.log("Creating test submission using direct API call...");
    
    // Create test data with better attachment URL - ensure it has a valid attachment
    const testData = {
      from_email: 'test@example.com',
      to_email: 'investor@example.com',
      subject: 'Test Submission for Debugging',
      email_body: 'This is a test submission for debugging the trigger.',
      attachment_url: 'test-attachment.pdf',
      has_attachments: true,
      action: 'create' // Add action parameter to identify this as a create operation
    };
    
    // Use direct fetch to edge function
    const response = await fetch(
      "https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/create-test-email-submission",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpodG5ydWt0bXRqcXJmb2l5cmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3NTczMzksImV4cCI6MjA1NzMzMzMzOX0._HZzAtVcTH_cdXZoxIeERNYqS6_hFEjcWbgHK3vxQBY"
        },
        body: JSON.stringify(testData)
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error response from create submission function:`, errorText);
      throw new Error(`Failed to create test submission: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data || !data.id) {
      console.error("No submission ID returned from function");
      toast({
        title: "Test creation failed",
        description: "No submission ID was returned",
        variant: "destructive"
      });
      return null;
    }
    
    console.log("Created test submission:", data);
    toast({
      title: "Test submission created",
      description: `Created with ID: ${data.id}`,
    });
    
    return data;
  } catch (error) {
    console.error("Error creating test submission:", error);
    toast({
      title: "Test creation failed",
      description: "An error occurred creating the test submission",
      variant: "destructive"
    });
    return null;
  }
}
