
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for browser compatibility
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400",
};

// Create a Supabase client with the auth context of the function
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  // Log the request for debugging
  console.log(`Function invoked. Method: ${req.method}, URL: ${req.url}`);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight request");
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
      const rawText = await req.text();
      console.log(`Raw request body: ${rawText}`);
      
      try {
        // Try to parse as JSON
        requestData = JSON.parse(rawText);
      } catch (jsonError) {
        console.error("Failed to parse JSON:", jsonError);
        // Attempt to extract key data using regex if it's not valid JSON
        const actionMatch = rawText.match(/"action"\s*:\s*"([^"]+)"/);
        if (actionMatch && actionMatch[1]) {
          requestData = { action: actionMatch[1] };
          console.log(`Extracted action using regex: ${requestData.action}`);
        } else {
          throw new Error(`Could not parse request body: ${rawText}`);
        }
      }
      
      console.log(`Processed request data:`, requestData);
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
      if (!requestData.from_email && !requestData.fromEmail) {
        // Try to use alternative field names or defaults
        requestData.from_email = requestData.fromEmail || requestData.email || "test@example.com";
      }
      
      if (!requestData.to_email && !requestData.toEmail) {
        requestData.to_email = requestData.toEmail || "receiver@example.com";
      }
      
      if (!requestData.from_email || !requestData.to_email) {
        console.error("Missing required fields in test data");
        throw new Error("from_email and to_email are required");
      }
      
      // Normalize field names (convert camelCase to snake_case if needed)
      const normalizedData = {
        from_email: requestData.from_email || requestData.fromEmail,
        to_email: requestData.to_email || requestData.toEmail,
        subject: requestData.subject || `Test Email ${new Date().toISOString()}`,
        email_body: requestData.email_body || requestData.body || "This is a test email body",
        attachment_url: requestData.attachment_url || requestData.attachmentUrl,
        has_attachments: requestData.has_attachments || requestData.hasAttachments || !!requestData.attachment_url || !!requestData.attachmentUrl
      };
      
      // Check if we need to verify the attachment URL exists in storage
      let attachmentUrl = normalizedData.attachment_url;
      let hasAttachment = normalizedData.has_attachments;
      
      // If no attachment URL is provided, use a default test value
      if (!attachmentUrl && hasAttachment) {
        attachmentUrl = "test-attachment.pdf";
        console.log(`Using default test attachment URL: ${attachmentUrl}`);
        
        // Check if the test attachment already exists
        try {
          const { data: fileList, error: listError } = await supabase.storage
            .from("email_attachments")
            .list();
            
          if (listError) {
            console.warn("Could not check for existing test attachment:", listError);
          } else {
            const fileExists = fileList.some(f => f.name === attachmentUrl);
            if (!fileExists) {
              console.log("Test attachment doesn't exist. Creating an empty placeholder...");
              // Create an empty file as a placeholder
              const emptyFile = new Uint8Array([80, 68, 70]); // "PDF" in ASCII
              const { error: uploadError } = await supabase.storage
                .from("email_attachments")
                .upload(attachmentUrl, emptyFile);
                
              if (uploadError) {
                console.warn("Failed to create placeholder attachment:", uploadError);
              } else {
                console.log("Created placeholder attachment file");
              }
            } else {
              console.log("Test attachment already exists in storage");
            }
          }
        } catch (storageError) {
          console.warn("Storage operation failed:", storageError);
        }
      }
      
      // Create a submission object with verified attachment data
      const submissionData = {
        ...normalizedData,
        attachment_url: attachmentUrl,
        has_attachments: hasAttachment
      };
      
      // Remove the action field as it's not part of our database schema
      delete submissionData.action;
      
      console.log("Creating test submission with data:", submissionData);

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

      // Wait a moment to give the trigger a chance to execute
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if the trigger executed by checking for updates
      const { data: updatedSubmission, error: checkError } = await supabase
        .from("email_submissions")
        .select("*")
        .eq("id", submission.id)
        .single();

      if (checkError) {
        console.error(`Error checking submission status:`, checkError);
      } else {
        console.log(`Submission status after trigger check:`, {
          id: updatedSubmission.id,
          report_id: updatedSubmission.report_id,
          hasAttachment: !!updatedSubmission.attachment_url
        });
      }

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
