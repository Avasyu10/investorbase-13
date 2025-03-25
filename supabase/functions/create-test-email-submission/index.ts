
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
    console.log("Creating test email submission with service role key");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the test data from the request
    let testData;
    try {
      testData = await req.json();
      console.log(`Received test data:`, testData);
    } catch (parseError) {
      console.error("Error parsing request JSON:", parseError);
      throw new Error("Invalid request format. Expected JSON with email submission data.");
    }
    
    if (!testData.from_email || !testData.to_email) {
      console.error("Missing required fields in test data");
      throw new Error("from_email and to_email are required");
    }

    // Insert the test submission using service role (bypasses RLS)
    const { data: submission, error: insertError } = await supabase
      .from("email_submissions")
      .insert([testData])
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
