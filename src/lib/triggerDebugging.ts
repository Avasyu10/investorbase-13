
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Utility to check if the auto_analyze_email_submission database function and trigger exist
 */
export async function checkTriggerSetup() {
  try {
    // Check if we can query the database functions
    const { data: triggerFunctions, error: functionsError } = await supabase
      .from('email_submissions')
      .select('*')
      .limit(1);
    
    if (functionsError) {
      console.error("Error checking email_submissions table:", functionsError);
      toast({
        title: "Trigger check failed",
        description: "Could not check database triggers. See console for details.",
        variant: "destructive"
      });
      return false;
    }
    
    console.log("Database email_submissions table exists:", triggerFunctions);
    
    // Try to get information about the trigger
    try {
      // Execute a simple query to check if the trigger is working
      const { data, error } = await supabase
        .from('email_submissions')
        .select('id, from_email, to_email, subject')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) {
        console.error("Error querying email submissions:", error);
      } else {
        console.log("Recent email submissions:", data);
      }
    } catch (err) {
      console.error("Error executing trigger query:", err);
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
    const { data, error } = await supabase
      .from('email_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (error) {
      console.error("Error fetching email submissions:", error);
      return [];
    }
    
    console.log("Latest email submissions:", data);
    return data;
  } catch (error) {
    console.error("Error viewing submissions:", error);
    return [];
  }
}
