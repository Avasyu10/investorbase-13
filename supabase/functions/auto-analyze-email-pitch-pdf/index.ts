
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.1";
import { corsHeaders } from "./cors.ts";

serve(async (req) => {
  console.log("=========== AUTO-ANALYZE FUNCTION STARTED v4 ===========");
  console.log("Request method:", req.method);
  console.log("Request URL:", req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling CORS preflight request");
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }
  
  try {
    // Get environment variables
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase environment variables');
    }
    
    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Parse request body
    let body: string;
    try {
      body = await req.text();
      console.log("Raw request body:", body);
    } catch (e) {
      console.error("Error reading request body:", e);
      throw new Error(`Failed to read request body: ${e.message}`);
    }
    
    // Parse the body content
    let submissionId: string;
    try {
      // Try parsing as JSON first
      const data = JSON.parse(body);
      submissionId = data.id;
      console.log("Parsed submission ID from JSON:", submissionId);
    } catch (e) {
      // If JSON parsing fails, try form data
      console.log("JSON parse failed, trying form data");
      
      try {
        const formData = new URLSearchParams(body);
        submissionId = formData.get('id') || '';
        console.log("Parsed submission ID from form data:", submissionId);
      } catch (e2) {
        console.error("Form data parse failed:", e2);
        throw new Error(`Failed to parse request data: ${e.message}, ${e2.message}`);
      }
    }
    
    if (!submissionId) {
      throw new Error('No submission ID provided');
    }
    
    console.log(`Processing email pitch submission: ${submissionId}`);
    
    // Fetch the submission data
    const { data: submission, error: fetchError } = await supabase
      .from('email_pitch_submissions')
      .select('sender_email, attachment_url')
      .eq('id', submissionId)
      .maybeSingle();
      
    if (fetchError) {
      throw new Error(`Failed to fetch submission: ${fetchError.message}`);
    }
    
    if (!submission) {
      throw new Error(`Submission not found: ${submissionId}`);
    }
    
    // Check if attachment URL exists
    if (!submission.attachment_url) {
      throw new Error('No attachment URL found in submission');
    }
    
    // Create a new report
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert({
        title: `Email Pitch from ${submission.sender_email || 'unknown'}`,
        description: "Auto-generated from email pitch submission",
        pdf_url: submission.attachment_url,
        is_public_submission: true,
        analysis_status: 'pending'
      })
      .select()
      .single();
      
    if (reportError) {
      throw new Error(`Failed to create report: ${reportError.message}`);
    }
    
    // Update the submission with the report ID
    const { error: updateError } = await supabase
      .from('email_pitch_submissions')
      .update({ report_id: report.id })
      .eq('id', submissionId);
      
    if (updateError) {
      console.error(`Error updating submission: ${updateError.message}`);
      // Continue despite this error
    }
    
    // Call the analyze-email-pitch-pdf function to process the PDF
    const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
      'analyze-email-pitch-pdf',
      {
        body: { reportId: report.id }
      }
    );
    
    if (analysisError) {
      console.error(`Error from analyze-email-pitch-pdf: ${analysisError.message}`);
      
      // Update report status to indicate error
      await supabase
        .from('reports')
        .update({ 
          analysis_status: 'failed',
          analysis_error: `Failed to analyze: ${analysisError.message}`
        })
        .eq('id', report.id);
        
      return new Response(JSON.stringify({ 
        success: false, 
        error: analysisError.message,
        reportId: report.id
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      });
    }
    
    console.log("Analysis completed successfully");
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: "Report created and analysis completed",
      reportId: report.id 
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    });
  } catch (error) {
    console.error("Error in auto-analyze function:", error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500 
    });
  } finally {
    console.log("=========== AUTO-ANALYZE FUNCTION COMPLETED v4 ===========");
  }
});
