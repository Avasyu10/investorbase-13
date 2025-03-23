
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

console.log("Email parser webhook handler started");

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the API key from environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhookSecret = Deno.env.get("WEBHOOK_SECRET")!;

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract the authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${webhookSecret}`) {
      console.error("Invalid or missing authorization");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Parse the request body
    let payload;
    try {
      payload = await req.json();
      console.log("Received webhook payload:", JSON.stringify(payload));
    } catch (error) {
      console.error("Error parsing request body:", error);
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Basic validation of the payload
    if (!payload || typeof payload !== "object") {
      console.error("Invalid payload format");
      return new Response(
        JSON.stringify({ error: "Invalid payload format" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Extract email data
    const fromEmail = payload.from?.text || payload.from?.email || "unknown";
    const toEmail = payload.to?.[0]?.text || payload.to?.[0]?.email || "unknown";
    const subject = payload.subject || "No Subject";
    const textContent = payload.text || "";
    const htmlContent = payload.html || "";
    
    // Check for attachments
    const attachments = payload.attachments || [];
    const hasAttachments = attachments.length > 0;
    
    // Find PDF attachments
    const pdfAttachments = attachments.filter(att => 
      att.contentType?.toLowerCase() === "application/pdf" || 
      att.filename?.toLowerCase().endsWith(".pdf")
    );

    // If no PDF attachments, still record the email but don't create a report
    if (pdfAttachments.length === 0) {
      console.log("No PDF attachments found in email");
      
      // Create email submission record
      const { data: emailSubmission, error: emailError } = await supabase
        .from("email_submissions")
        .insert({
          from_email: fromEmail,
          to_email: toEmail,
          subject,
          email_body: textContent,
          email_html: htmlContent,
          has_attachments: hasAttachments
        })
        .select()
        .single();
        
      if (emailError) {
        console.error("Error creating email submission:", emailError);
        return new Response(
          JSON.stringify({ error: "Error recording email submission" }),
          { 
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Email recorded, but no PDF attachments to process",
          emailSubmissionId: emailSubmission.id
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Process the first PDF attachment (we'll only handle one for simplicity)
    const pdfAttachment = pdfAttachments[0];
    console.log(`Processing PDF attachment: ${pdfAttachment.filename}`);
    
    // The attachment content should be base64 encoded
    const pdfContent = pdfAttachment.content;
    if (!pdfContent) {
      console.error("PDF attachment content is missing");
      return new Response(
        JSON.stringify({ error: "PDF attachment content is missing" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Decode the base64 content to binary
    let pdfBinary;
    try {
      pdfBinary = Uint8Array.from(atob(pdfContent), c => c.charCodeAt(0));
    } catch (error) {
      console.error("Error decoding PDF content:", error);
      return new Response(
        JSON.stringify({ error: "Error decoding PDF content" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Generate a unique filename
    const fileName = `${Date.now()}_${pdfAttachment.filename}`;
    
    // Upload the PDF to storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from("report_pdfs")
      .upload(fileName, pdfBinary, {
        contentType: "application/pdf",
        cacheControl: "3600"
      });
      
    if (storageError) {
      console.error("Error uploading PDF to storage:", storageError);
      return new Response(
        JSON.stringify({ error: "Error uploading PDF" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Create report entry in database
    // Derive title from email subject or filename
    const reportTitle = subject !== "No Subject" 
      ? subject 
      : pdfAttachment.filename.replace(/\.[^/.]+$/, ""); // Remove file extension
      
    // Use email body as description
    const reportDescription = textContent.length > 1000 
      ? textContent.substring(0, 997) + "..." // Truncate if too long
      : textContent;
      
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .insert({
        title: reportTitle,
        description: reportDescription,
        pdf_url: fileName,
        analysis_status: "pending", // Start as pending
        submitter_email: fromEmail
      })
      .select()
      .single();
      
    if (reportError) {
      console.error("Error creating report:", reportError);
      return new Response(
        JSON.stringify({ error: "Error creating report" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Create email submission record linked to the report
    const { data: emailSubmission, error: emailError } = await supabase
      .from("email_submissions")
      .insert({
        report_id: report.id,
        from_email: fromEmail,
        to_email: toEmail,
        subject,
        email_body: textContent,
        email_html: htmlContent,
        has_attachments: hasAttachments
      })
      .select()
      .single();
      
    if (emailError) {
      console.error("Error creating email submission:", emailError);
      // Don't return error here, the report is already created
    }
    
    // Optionally trigger analysis process
    try {
      // Call the analyze-pdf function
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        "analyze-pdf",
        {
          body: { reportId: report.id }
        }
      );
      
      if (analysisError) {
        console.error("Error starting analysis:", analysisError);
        // Update report status to indicate analysis failed to start
        await supabase
          .from("reports")
          .update({
            analysis_status: "error",
            analysis_error: "Failed to start analysis"
          })
          .eq("id", report.id);
      } else {
        console.log("Analysis started successfully");
      }
    } catch (analysisError) {
      console.error("Exception when starting analysis:", analysisError);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        reportId: report.id,
        emailSubmissionId: emailSubmission?.id,
        message: "Email processed and report created successfully"
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
    
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
    );
  }
});
