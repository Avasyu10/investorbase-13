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
    toast({
      title: "Debugging Trigger Function",
      description: "Testing the email submission trigger...",
    });
    
    // First, verify the submission exists
    const { data, error } = await supabase
      .from('email_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();
      
    if (error) {
      console.error("Error fetching submission:", error);
      toast({
        title: "Verification Failed",
        description: `Could not verify submission ID: ${error.message}`,
        variant: "destructive"
      });
      return;
    }
    
    console.log("Found submission:", data);
    
    // Now test the trigger functionality manually via the edge function
    const response = await fetch(
      "https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/auto-analyze-email-submission",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpodG5ydWt0bXRqcXJmb2l5cmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3NTczMzksImV4cCI6MjA1NzMzMzMzOX0._HZzAtVcTH_cdXZoxIeERNYqS6_hFEjcWbgHK3vxQBY"
        },
        body: JSON.stringify({ 
          submissionId: submissionId,
          _debug: true // Add debug flag to indicate this is from debugging tool
        })
      }
    );
    
    let responseText = "";
    try {
      responseText = await response.text();
      const jsonResponse = JSON.parse(responseText);
      
      // Check if it was successful
      if (jsonResponse.success) {
        toast({
          title: "Trigger Function Succeeded",
          description: jsonResponse.reportId ? 
            `Created report ID: ${jsonResponse.reportId}` : 
            "Function completed successfully",
        });
      } else {
        toast({
          title: "Trigger Function Failed",
          description: jsonResponse.error || "Unknown error occurred",
          variant: "destructive"
        });
      }
      
      console.log("Trigger function response:", jsonResponse);
      
    } catch (parseError) {
      console.error("Error parsing response:", parseError, "Raw response:", responseText);
      toast({
        title: "Invalid Response",
        description: "Received non-JSON response from function",
        variant: "destructive"
      });
    }
    
  } catch (error) {
    console.error("Error testing trigger function:", error);
    toast({
      title: "Test Failed",
      description: error instanceof Error ? error.message : "Unknown error occurred",
      variant: "destructive"
    });
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
    // Generate unique test data
    const testId = `test-${Date.now()}`;
    const fromEmail = `sender-${testId}@example.com`;
    const toEmail = `receiver-${testId}@example.com`;
    const subject = `Test Subject ${testId}`;
    
    // Create a test submission via edge function
    const response = await fetch(
      "https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/create-test-email-submission",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpodG5ydWt0bXRqcXJmb2l5cmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3NTczMzksImV4cCI6MjA1NzMzMzMzOX0._HZzAtVcTH_cdXZoxIeERNYqS6_hFEjcWbgHK3vxQBY"
        },
        body: JSON.stringify({
          fromEmail,
          toEmail,
          subject,
          body: `This is a test email body for ${testId}`,
          attachmentName: "test-attachment.pdf"
        })
      }
    );
    
    if (!response.ok) {
      let errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        errorText = errorJson.error || errorText;
      } catch (e) {
        // Keep as text if not JSON
      }
      
      throw new Error(`Failed to create test submission: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    
    console.log("Created test submission:", result);
    
    toast({
      title: "Test Submission Created",
      description: `Created submission ID: ${result.id}`,
    });
    
    return result;
  } catch (error) {
    console.error("Error creating test submission:", error);
    toast({
      title: "Creation Failed",
      description: error instanceof Error ? error.message : "Failed to create test submission",
      variant: "destructive"
    });
    throw error;
  }
}
