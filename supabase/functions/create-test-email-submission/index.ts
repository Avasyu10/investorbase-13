
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for browser compatibility
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create a Supabase client with the auth context of the function
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    });
  }

  try {
    console.log("Creating Supabase client with service role key");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the data from the request
    let requestData;
    try {
      requestData = await req.json();
      console.log(`Received request data:`, requestData);
    } catch (parseError) {
      console.error("Error parsing request JSON:", parseError);
      throw new Error("Invalid request format. Expected JSON data.");
    }
    
    // Check the action to determine what operation to perform
    const action = requestData.action || 'create';
    
    // LIST operation - fetch recent email submissions
    if (action === 'list') {
      console.log("Fetching email submissions with service role");
      
      const { data: submissions, error: fetchError } = await supabase
        .from("email_submissions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (fetchError) {
        console.error(`Failed to fetch submissions:`, fetchError);
        throw new Error(`Failed to fetch submissions: ${fetchError.message}`);
      }

      console.log(`Found ${submissions?.length || 0} email submissions`);

      return new Response(
        JSON.stringify({
          success: true,
          submissions: submissions || []
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // CREATE operation - insert a new test submission
    if (action === 'create') {
      if (!requestData.from_email || !requestData.to_email) {
        console.error("Missing required fields in test data");
        throw new Error("from_email and to_email are required");
      }
      
      // Create a submission object without the action field
      const { action: _, ...submissionData } = requestData;

      // Insert the test submission using service role (bypasses RLS)
      const { data: submission, error: insertError } = await supabase
        .from("email_submissions")
        .insert([submissionData])
        .select()
        .single();

      if (insertError) {
        console.error(`Failed to insert test submission:`, insertError);
        throw new Error(`Failed to insert test submission: ${insertError.message}`);
      }

      console.log(`Successfully created test submission with ID: ${submission.id}`);

      return new Response(
        JSON.stringify(submission),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Unknown action
    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error(`Error in create-test-email-submission function:`, error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
