
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.30.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          error: "Missing environment variables",
          success: false,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the multipart form data
    const formData = await req.formData();
    
    // Basic validation
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const email = formData.get("email") as string;
    const description = formData.get("description") as string || "";
    const websiteUrl = formData.get("websiteUrl") as string || "";
    
    if (!file || !title || !email) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: file, title, or email",
          success: false,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    console.log(`Processing public upload: "${title}" from ${email}`);
    console.log(`File: ${file.name}, size: ${file.size} bytes`);
    
    try {
      // Check if this email already has an account
      const { data: existingUsers } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email);
      
      // Determine user ID to associate with the submission
      let userId;
      
      if (existingUsers && existingUsers.length > 0) {
        // Use existing user's ID
        userId = existingUsers[0].id;
        console.log(`Using existing user ID: ${userId}`);
      } else {
        // Create a new user for this email
        const { data: newUser, error: signupError } = await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { full_name: email.split('@')[0] }
        });
        
        if (signupError) {
          console.error("Error creating user:", signupError);
          return new Response(
            JSON.stringify({
              error: "Failed to create user account",
              details: signupError.message,
              success: false,
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        userId = newUser.user.id;
        console.log(`Created new user with ID: ${userId}`);
      }
      
      // Create a unique filename with form slug prefix to help identify source
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const uniqueFilename = `${timestamp}.${fileExt}`;
      
      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('report_pdfs')
        .upload(uniqueFilename, file);
        
      if (uploadError) {
        console.error("Error uploading file:", uploadError);
        return new Response(
          JSON.stringify({
            error: "Failed to upload file",
            details: uploadError.message,
            success: false,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      console.log(`File uploaded successfully: ${uniqueFilename}`);
      
      // Create report record
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .insert({
          title,
          description,
          pdf_url: uniqueFilename,
          is_public_submission: true,
          submitter_email: email,
          user_id: userId,
          analysis_status: 'pending'
        })
        .select()
        .single();
        
      if (reportError) {
        console.error("Error creating report record:", reportError);
        return new Response(
          JSON.stringify({
            error: "Failed to create report record",
            details: reportError.message,
            success: false,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      console.log(`Report record created successfully with ID: ${report.id}`);
      
      // Store submission details
      const { error: submissionError } = await supabase
        .from('public_form_submissions')
        .insert({
          title,
          description,
          pdf_url: uniqueFilename,
          website_url: websiteUrl,
          report_id: report.id
        });
        
      if (submissionError) {
        console.error("Error recording submission details:", submissionError);
        // Non-critical error, continue
      }
      
      // Check if we should start analysis automatically - in this case we always do
      try {
        console.log("Starting automatic analysis for report:", report.id);
        
        await fetch(`${supabaseUrl}/functions/v1/analyze-pdf`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            reportId: report.id
          })
        });
        
        console.log("Analysis process initiated");
      } catch (analysisError) {
        console.error("Error initiating analysis:", analysisError);
        // Non-critical error, continue
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          reportId: report.id,
          message: "Thank you for your submission! Your pitch deck is being analyzed."
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error processing submission:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to process submission",
          details: error instanceof Error ? error.message : String(error),
          success: false,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
