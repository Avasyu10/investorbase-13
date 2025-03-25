
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
      // Get the raw text first to examine it
      const rawText = await req.text();
      console.log(`Raw request body length: ${rawText.length}`);
      
      // Log a safe preview of the raw text (in case it's very large)
      const previewLength = Math.min(200, rawText.length);
      console.log(`Raw request body preview: ${rawText.substring(0, previewLength)}${rawText.length > previewLength ? '...' : ''}`);
      
      try {
        // First attempt: Replace problematic characters before parsing
        // This is the key fix for parentheses issues
        const sanitizedText = rawText
          .replace(/\\[\(\)]/g, '') // Remove escaped parentheses
          .replace(/\(/g, '[')     // Replace opening parentheses with square brackets
          .replace(/\)/g, ']');    // Replace closing parentheses with square brackets
          
        try {
          requestData = JSON.parse(sanitizedText);
          console.log("Successfully parsed JSON after parentheses replacement");
        } catch (sanitizeError) {
          console.error("Failed to parse after sanitizing parentheses:", sanitizeError.message);
          
          // Fallback: Try more aggressive cleaning
          const cleanedText = rawText
            .replace(/[\u0000-\u001F\u007F-\u009F\u2028\u2029]/g, "") // Remove control characters
            .replace(/\\[^"\\\/bfnrtu]/g, "\\\\") // Escape backslashes properly
            .replace(/[()]/g, "") // Remove all parentheses completely
            .replace(/'/g, "\"") // Replace single quotes with double quotes
            .replace(/(\r\n|\n|\r)/gm, "") // Remove line breaks
            .replace(/\s+/g, " ")          // Normalize spaces
            .trim();                       // Trim whitespace
              
          console.log("Attempted more aggressive cleaning for JSON parsing");
          
          try {
            requestData = JSON.parse(cleanedText);
            console.log("Successfully parsed JSON after aggressive cleaning");
          } catch (cleaningError) {
            console.error("Failed to parse cleaned text:", cleaningError.message);
            
            // Final attempt: Extract key fields with regex as last resort
            console.log("Falling back to regex extraction");
            requestData = {};
            
            // Extract action
            const actionMatch = rawText.match(/["']action["']\s*:\s*["']([^"']+)["']/);
            if (actionMatch && actionMatch[1]) {
              requestData.action = actionMatch[1];
            } else {
              requestData.action = 'create'; // Default action
            }
            
            // Extract key email fields
            const fromEmailMatch = rawText.match(/["']from_?[eE]mail["']\s*:\s*["']([^"']+)["']/);
            if (fromEmailMatch && fromEmailMatch[1]) {
              requestData.fromEmail = fromEmailMatch[1];
            }
            
            const toEmailMatch = rawText.match(/["']to_?[eE]mail["']\s*:\s*["']([^"']+)["']/);
            if (toEmailMatch && toEmailMatch[1]) {
              requestData.toEmail = toEmailMatch[1];
            }
            
            const subjectMatch = rawText.match(/["']subject["']\s*:\s*["']([^"']+)["']/);
            if (subjectMatch && subjectMatch[1]) {
              requestData.subject = subjectMatch[1];
            }
            
            console.log("Extracted data using regex:", requestData);
          }
        }
      } catch (parseError) {
        console.error("All parsing attempts failed:", parseError.message);
        throw new Error(`Failed to parse request data: ${parseError.message}`);
      }
      
      console.log(`Processed request data:`, JSON.stringify(requestData));
    } catch (parseError) {
      console.error("Error processing request data:", parseError.message);
      throw new Error("Invalid request format. Expected JSON data.");
    }
    
    // Check the action to determine what operation to perform
    const action = requestData?.action || 'create';
    
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
      // Normalize field names - support both camelCase and snake_case
      const fromEmail = requestData?.from_email || requestData?.fromEmail || "test@example.com";
      const toEmail = requestData?.to_email || requestData?.toEmail || "receiver@example.com";
      const subject = requestData?.subject || `Test Email ${new Date().toISOString()}`;
      const emailBody = requestData?.email_body || requestData?.body || requestData?.emailBody || "This is a test email body";
      const attachmentUrl = requestData?.attachment_url || requestData?.attachmentUrl;
      const hasAttachments = requestData?.has_attachments || requestData?.hasAttachments || 
                             !!attachmentUrl || !!requestData?.attachmentName;
      
      // Create a submission object with normalized data
      const submissionData = {
        from_email: fromEmail,
        to_email: toEmail,
        subject: subject,
        email_body: emailBody,
        attachment_url: attachmentUrl,
        has_attachments: hasAttachments
      };
      
      // Check if we need to verify the attachment URL exists in storage
      if (!attachmentUrl && hasAttachments && requestData?.attachmentName) {
        submissionData.attachment_url = requestData.attachmentName;
        console.log(`Using test attachment name: ${submissionData.attachment_url}`);
        
        // Check if the test attachment already exists
        try {
          const { data: fileList, error: listError } = await supabase.storage
            .from("email_attachments")
            .list();
            
          if (listError) {
            console.warn("Could not check for existing test attachment:", listError);
          } else {
            const fileExists = fileList.some(f => f.name === submissionData.attachment_url);
            if (!fileExists) {
              console.log("Test attachment doesn't exist. Creating an empty placeholder...");
              // Create an empty file as a placeholder
              const emptyFile = new Uint8Array([80, 68, 70]); // "PDF" in ASCII
              const { error: uploadError } = await supabase.storage
                .from("email_attachments")
                .upload(submissionData.attachment_url, emptyFile);
                
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
      
      console.log("Creating test submission with data:", JSON.stringify(submissionData));

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
