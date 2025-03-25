
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for browser compatibility
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create a Supabase client with the auth context of the function
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Function triggered, creating Supabase client");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the submission ID from the request
    let submissionId;
    let requestData;
    try {
      // Get the raw text first to examine it
      const rawText = await req.text();
      console.log(`Raw request body length: ${rawText.length}`);
      
      // Log a safe preview of the raw text (in case it's very large)
      const previewLength = Math.min(200, rawText.length);
      console.log(`Raw request body preview: ${rawText.substring(0, previewLength)}${rawText.length > previewLength ? '...' : ''}`);
      
      // Try multiple parsing approaches
      try {
        // First, try standard JSON parsing
        requestData = JSON.parse(rawText);
        console.log("Successfully parsed JSON using standard JSON.parse");
      } catch (jsonError) {
        console.error("Failed to parse as JSON. Error:", jsonError.message);
        
        // Clean up the text before parsing
        try {
          // Remove any characters that could break JSON parsing
          const cleanedText = rawText
            .replace(/[\u0000-\u001F\u007F-\u009F\u2028\u2029]/g, "") // Remove control characters
            .replace(/\\[^"\\\/bfnrtu]/g, "\\\\") // Escape backslashes properly
            .replace(/\(/g, "\\(").replace(/\)/g, "\\)") // Escape parentheses
            .replace(/(\r\n|\n|\r)/gm, "") // Remove line breaks
            .replace(/\s+/g, " ")          // Normalize spaces
            .trim();                       // Trim whitespace
            
          console.log("Cleaned text for JSON parsing");
          
          // Try parsing the cleaned text
          if (cleanedText.startsWith("{") && cleanedText.endsWith("}")) {
            try {
              requestData = JSON.parse(cleanedText);
              console.log("Successfully parsed JSON after cleaning text");
            } catch (cleaningError) {
              console.error("Failed to parse cleaned text:", cleaningError.message);
              
              // If still failing, try a more aggressive approach
              const strictlyFormatted = cleanedText
                .replace(/([{,])\s*([^"\s]+)\s*:/g, '$1"$2":') // Ensure property names are quoted
                .replace(/:\s*'([^']*)'\s*([,}])/g, ':"$1"$2'); // Convert single quotes to double quotes
                
              try {
                requestData = JSON.parse(strictlyFormatted);
                console.log("Successfully parsed JSON after strict formatting");
              } catch (formattingError) {
                console.error("Failed to parse strictly formatted text:", formattingError.message);
              }
            }
          }
          
          // If we still don't have valid data, try regex as fallback
          if (!requestData) {
            console.log("Falling back to regex extraction");
            requestData = {};
            
            // Try to extract submissionId from raw string if it's not valid JSON
            const idMatch = rawText.match(/"submissionId"\s*:\s*"([^"]+)"/i);
            if (idMatch && idMatch[1]) {
              submissionId = idMatch[1];
              console.log(`Extracted submission ID using regex: ${submissionId}`);
              requestData.submissionId = submissionId;
            } else {
              // Try alternate field name pattern
              const altIdMatch = rawText.match(/"submission_id"\s*:\s*"([^"]+)"/i);
              if (altIdMatch && altIdMatch[1]) {
                submissionId = altIdMatch[1];
                console.log(`Extracted submission_id using regex: ${submissionId}`);
                requestData.submission_id = submissionId;
              } else {
                const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
                const uuidMatch = rawText.match(uuidPattern);
                if (uuidMatch) {
                  submissionId = uuidMatch[0];
                  console.log(`Extracted UUID using regex: ${submissionId}`);
                  requestData.submissionId = submissionId;
                } else {
                  throw new Error(`Could not parse request body or extract ID: ${rawText}`);
                }
              }
            }
          }
        } catch (fallbackError) {
          console.error("All parsing attempts failed:", fallbackError.message);
          throw new Error(`Failed to parse request data: ${fallbackError.message}`);
        }
      }
      
      // If we successfully parsed JSON, get the submissionId
      if (!submissionId && requestData) {
        submissionId = requestData.submissionId || requestData.submission_id;
        console.log(`Parsed submission ID from JSON: ${submissionId}`);
      }
      
      console.log(`Processed request data:`, JSON.stringify(requestData));
    } catch (parseError) {
      console.error("Error parsing request data:", parseError.message);
      throw new Error("Invalid request format. Expected JSON with submissionId property.");
    }
    
    if (!submissionId) {
      console.error("Missing submission ID in request");
      throw new Error("Email submission ID is required");
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(submissionId)) {
      console.error(`Invalid UUID format: ${submissionId}`);
      throw new Error(`Invalid UUID format: ${submissionId}`);
    }

    console.log(`Processing email submission: ${submissionId}`);

    // Fetch the email submission data
    const { data: emailSubmission, error: emailError } = await supabase
      .from("email_submissions")
      .select("*")
      .eq("id", submissionId)
      .single();

    if (emailError || !emailSubmission) {
      const errorMessage = emailError?.message || "Not found"; 
      console.error(`Failed to fetch email submission (ID: ${submissionId}):`, errorMessage);
      throw new Error(`Failed to fetch email submission: ${errorMessage}`);
    }

    console.log(`Found email submission: ${JSON.stringify({
      id: emailSubmission.id,
      from: emailSubmission.from_email,
      to: emailSubmission.to_email,
      subject: emailSubmission.subject?.substring(0, 30) || "No subject",
      hasAttachment: !!emailSubmission.attachment_url,
      reportId: emailSubmission.report_id
    })}`);

    // Check if this email already has a report associated
    if (emailSubmission.report_id) {
      console.log(`Email already has a report (${emailSubmission.report_id}), skipping processing`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Email already processed",
          reportId: emailSubmission.report_id 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Check if the email has an attachment
    if (!emailSubmission.attachment_url) {
      console.log("Email has no attachment, cannot process");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Email has no attachment" 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400
        }
      );
    }

    console.log(`Attempting to download attachment: ${emailSubmission.attachment_url}`);

    // Try to download the attachment from storage with improved timeout handling
    try {
      // Create an AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.error(`Download timed out after 15 seconds for ${emailSubmission.attachment_url}`);
      }, 15000);
      
      // Start the download with the abort signal
      // Note: We're using a workaround here since storage.download() doesn't directly support AbortController
      // Try fetching the public URL instead
      let fileData;
      try {
        const { data: { publicUrl }, error: urlError } = await supabase.storage
          .from("email_attachments")
          .getPublicUrl(emailSubmission.attachment_url);
          
        if (urlError) {
          console.error("Failed to get public URL:", urlError);
          throw urlError;
        }
        
        // Fetch the file using the public URL
        const response = await fetch(publicUrl, { signal: controller.signal });
        if (!response.ok) {
          console.error(`Failed to download attachment from public URL. Status: ${response.status}`);
          throw new Error(`HTTP error: ${response.status}`);
        }
        
        fileData = await response.blob();
      } catch (publicUrlError) {
        console.error("Failed with public URL, trying direct download:", publicUrlError);
        
        // If public URL fails, fall back to direct download
        const { data, error: downloadError } = await supabase.storage
          .from("email_attachments")
          .download(emailSubmission.attachment_url);
          
        if (downloadError) {
          console.error("Failed to download attachment:", downloadError);
          throw downloadError;
        }
        
        fileData = data;
      }
      
      // Clear the timeout since we got a response
      clearTimeout(timeoutId);

      if (!fileData || fileData.size === 0) {
        console.error("Downloaded file is empty");
        throw new Error("Downloaded attachment is empty");
      }

      console.log(`Successfully downloaded attachment (${fileData.size} bytes), creating report`);

      // Create a title for the report based on the email subject or a default
      const title = emailSubmission.subject 
        ? emailSubmission.subject.trim() 
        : `Email from ${emailSubmission.from_email}`;

      // Create a description from the email body
      const description = emailSubmission.email_body 
        ? `Email body: ${emailSubmission.email_body.substring(0, 500)}${emailSubmission.email_body.length > 500 ? '...' : ''}` 
        : `Email received at ${new Date(emailSubmission.received_at).toLocaleString()}`;

      console.log(`Creating report with title: ${title}`);

      // Create a new report record
      const { data: report, error: reportError } = await supabase
        .from("reports")
        .insert([{
          title: title,
          description: description,
          pdf_url: emailSubmission.attachment_url,
          is_public_submission: false,
          analysis_status: "pending",
          submitter_email: emailSubmission.from_email
        }])
        .select()
        .single();

      if (reportError) {
        console.error("Failed to create report:", reportError);
        throw new Error(`Failed to create report: ${reportError.message}`);
      }

      if (!report) {
        console.error("No report data returned after insertion");
        throw new Error("Failed to create report: No data returned");
      }

      console.log(`Report created with ID: ${report.id}`);

      // Update the email submission with the report ID
      const { error: updateError } = await supabase
        .from("email_submissions")
        .update({ report_id: report.id })
        .eq("id", submissionId);

      if (updateError) {
        console.error(`Warning: Failed to update email submission with report ID: ${updateError.message}`);
      } else {
        console.log(`Successfully updated email submission ${submissionId} with report ID ${report.id}`);
      }

      // Check if we should trigger analysis automatically
      const { data: emailSettings, error: settingsError } = await supabase
        .from("investor_pitch_emails")
        .select("auto_analyze")
        .eq("email_address", emailSubmission.to_email)
        .maybeSingle();

      let autoAnalyze = false;
      
      if (settingsError) {
        console.error(`Warning: Failed to fetch email settings: ${settingsError.message}`);
      } else if (emailSettings) {
        autoAnalyze = emailSettings.auto_analyze || false;
        console.log(`Auto-analyze for ${emailSubmission.to_email} is: ${autoAnalyze}`);
      } else {
        console.log(`No settings found for ${emailSubmission.to_email}, defaulting auto-analyze to false`);
      }

      // If auto-analyze is enabled, trigger the analysis
      if (autoAnalyze) {
        console.log(`Auto-triggering analysis for report: ${report.id}`);
        
        try {
          // Use AbortController for timeout handling
          const analyzeController = new AbortController();
          const analyzeTimeout = setTimeout(() => {
            analyzeController.abort();
            console.error(`Analysis request timed out after 15 seconds for report ${report.id}`);
          }, 15000);
          
          const analyzeResponse = await supabase.functions.invoke("analyze-pdf", {
            body: { reportId: report.id }
          });
          
          // Clear the timeout since we got a response
          clearTimeout(analyzeTimeout);
          
          if (analyzeResponse.error) {
            console.error(`Warning: Auto-analysis failed: ${analyzeResponse.error.message || JSON.stringify(analyzeResponse.error)}`);
          } else {
            console.log(`Auto-analysis initiated successfully for report ${report.id}`);
          }
        } catch (analyzeError) {
          console.error(`Warning: Failed to trigger auto-analysis:`, analyzeError);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          reportId: report.id,
          autoAnalyze 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    } catch (storageError) {
      // Handle AbortController timeout errors specifically
      if (storageError.name === "AbortError") {
        console.error(`Storage download timed out: ${emailSubmission.attachment_url}`);
        return new Response(
          JSON.stringify({
            success: false,
            error: `Download timed out after 15 seconds. The attachment may be too large or unavailable.`
          }),
          {
            status: 408, // Request Timeout
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
      
      console.error("Storage operation failed:", storageError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to download attachment: ${storageError instanceof Error ? storageError.message : JSON.stringify(storageError)}`
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
  } catch (error) {
    console.error(`Error in auto-analyze-email-submission function:`, error);
    
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
