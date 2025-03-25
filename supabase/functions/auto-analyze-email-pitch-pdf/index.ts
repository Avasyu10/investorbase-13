
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.1";
import { corsHeaders } from "./cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
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
    
    // Create Supabase client with admin privileges
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Parse request data
    let submissionId;
    try {
      const { id } = await req.json();
      submissionId = id;
      console.log(`Received request for submission ID: ${submissionId}`);
    } catch (e) {
      console.error("Error parsing request JSON:", e);
      return new Response(
        JSON.stringify({ 
          error: "Invalid request format. Expected JSON with id property.",
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    
    if (!submissionId) {
      console.error("Missing submission ID in request");
      return new Response(
        JSON.stringify({ 
          error: "Submission ID is required",
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    
    console.log(`Processing email pitch submission: ${submissionId}`);
    
    // Get the submission
    const { data: submission, error: submissionError } = await serviceClient
      .from('email_pitch_submissions')
      .select('sender_email, report_id, attachment_url')
      .eq('id', submissionId)
      .maybeSingle();
      
    if (submissionError) {
      console.error("Error fetching submission:", submissionError);
      return new Response(
        JSON.stringify({ error: submissionError.message, success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    if (!submission) {
      console.error("Submission not found");
      return new Response(
        JSON.stringify({ error: "Submission not found", success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }
    
    if (!submission.attachment_url) {
      console.error("No attachment URL found for this submission");
      return new Response(
        JSON.stringify({ 
          error: "No attachment URL found for this submission", 
          success: false 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    if (!submission.report_id) {
      console.error("No report ID associated with this submission");
      
      // Create a report entry for this submission
      const { data: report, error: reportError } = await serviceClient
        .from('reports')
        .insert({
          title: `Email pitch from ${submission.sender_email}`,
          description: `Automatically analyzed email pitch from ${submission.sender_email}`,
          pdf_url: submission.attachment_url,
          is_public_submission: false,
          analysis_status: 'pending'
        })
        .select()
        .single();
        
      if (reportError) {
        console.error("Error creating report:", reportError);
        return new Response(
          JSON.stringify({ error: reportError.message, success: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      
      // Update the submission with the report ID
      const { error: updateError } = await serviceClient
        .from('email_pitch_submissions')
        .update({ report_id: report.id })
        .eq('id', submissionId);
        
      if (updateError) {
        console.error("Error updating submission with report ID:", updateError);
        return new Response(
          JSON.stringify({ error: updateError.message, success: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      
      submission.report_id = report.id;
      console.log(`Created new report with ID: ${report.id} for email: ${submission.sender_email}`);
    }
    
    console.log(`Found report ID: ${submission.report_id} for email: ${submission.sender_email}`);
    
    // Check if auto-analyze is enabled for this sender
    const { data: investorPitchEmail, error: emailError } = await serviceClient
      .from('investor_pitch_emails')
      .select('auto_analyze')
      .eq('email_address', submission.sender_email)
      .maybeSingle();
      
    if (emailError) {
      console.error("Error fetching investor pitch email settings:", emailError);
    }
    
    const autoAnalyzeEnabled = investorPitchEmail?.auto_analyze || false;
    
    if (!autoAnalyzeEnabled) {
      console.log(`Auto-analyze not enabled for ${submission.sender_email}, skipping analysis`);
      return new Response(
        JSON.stringify({ 
          message: "Auto-analyze not enabled for this email address", 
          success: true, 
          analyzed: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    console.log(`Auto-analyze enabled for ${submission.sender_email}, proceeding with analysis`);
    
    // Set the report status to pending
    await serviceClient
      .from('reports')
      .update({ 
        analysis_status: 'pending',
        analysis_error: null
      })
      .eq('id', submission.report_id);
    
    // Invoke the analyze-email-pitch-pdf function
    const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-email-pitch-pdf`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reportId: submission.report_id })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to analyze PDF: ${response.status} - ${errorText}`);
    }
    
    const analysisResult = await response.json();
    console.log('Analysis completed successfully');
    
    // Update the email_pitch_submissions record with the analysis status
    await serviceClient
      .from('email_pitch_submissions')
      .update({
        analysis_status: 'completed'
      })
      .eq('id', submissionId);
    
    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
    
  } catch (error) {
    console.error('Error in auto-analyze-email-pitch-pdf function:', error);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      success: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error instanceof Error && error.message.includes('not found') ? 404 : 500
    });
  }
});
