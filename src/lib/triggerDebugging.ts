
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Utility to check if the auto_analyze_email_submission database function and trigger exist
 */
export async function checkTriggerSetup() {
  try {
    // Call our edge function to check email submissions using the service role key
    const { data: serviceData, error: serviceError } = await supabase.functions.invoke('create-test-email-submission', {
      body: { action: 'list' } // Add an action parameter to identify this as a list operation
    });
    
    if (serviceError) {
      console.error("Error checking email_submissions with service role:", serviceError);
      toast({
        title: "Trigger check failed",
        description: "Could not check submissions with service role. See console for details.",
        variant: "destructive"
      });
      return false;
    }
    
    console.log("Database email_submissions table queried with service role:", serviceData);
    
    // Try to get information about recent submissions
    try {
      // Already using the edge function results
      if (serviceData && serviceData.submissions) {
        console.log("Recent email submissions:", serviceData.submissions);
      } else {
        console.log("No email submissions found or incorrect response format");
      }
    } catch (err) {
      console.error("Error processing submissions data:", err);
    }
    
    toast({
      title: "Trigger check completed",
      description: "See console for details about database triggers",
    });
    
    return true;
  } catch (error) {
    console.error("Error checking triggers:", error);
    toast({
      title: "Trigger check failed",
      description: "An error occurred when checking triggers",
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
    const { data, error } = await supabase.functions.invoke('auto-analyze-email-submission', {
      body: { submissionId }
    });
    
    if (error) {
      console.error("Error calling edge function:", error);
      toast({
        title: "Function test failed",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
    
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
    // Use the service role through edge function instead of direct query
    const { data, error } = await supabase.functions.invoke('create-test-email-submission', {
      body: { action: 'list' }
    });
      
    if (error) {
      console.error("Error fetching email submissions:", error);
      return [];
    }
    
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
    
    // Create test data
    const testData = {
      from_email: 'test@example.com',
      to_email: 'investor@example.com',
      subject: 'Test Submission for Debugging',
      email_body: 'This is a test submission for debugging the trigger.',
      attachment_url: '6737d05825e11f73f6d5a289_Ndc8GMUtaMNHOXDfqftyW1Jb7b5h2JE_ThY_Joc5Cf8.pdf',
      has_attachments: true,
      action: 'create' // Add action parameter to identify this as a create operation
    };
    
    // Use edge function to create submission which will bypass RLS
    const { data, error } = await supabase.functions.invoke('create-test-email-submission', {
      body: testData
    });
    
    if (error) {
      console.error("Error calling create-test-email-submission function:", error);
      toast({
        title: "Test creation failed",
        description: `Error: ${error.message}`,
        variant: "destructive"
      });
      return null;
    }
    
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
