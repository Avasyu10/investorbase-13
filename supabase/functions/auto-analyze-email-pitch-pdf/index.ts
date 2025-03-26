
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.1";
import { corsHeaders } from "./cors.ts";

serve(async (req) => {
  console.log("=========== AUTO-ANALYZE FUNCTION STARTED ===========");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling CORS preflight request");
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  console.log("Processing request method:", req.method);
  
  try {
    // Get environment variables
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log("Environment variables check:");
    console.log("- SUPABASE_URL present:", !!SUPABASE_URL);
    console.log("- SUPABASE_SERVICE_ROLE_KEY present:", !!SUPABASE_SERVICE_ROLE_KEY);
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase environment variables");
      throw new Error('Missing Supabase environment variables');
    }
    
    // Create Supabase client with admin privileges
    console.log("Creating Supabase client");
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Parse request data
    let submissionId;
    let requestBody;
    try {
      console.log("Parsing request body");
      const bodyText = await req.text();
      console.log("Raw request body:", bodyText);
      
      try {
        requestBody = JSON.parse(bodyText);
        console.log("Parsed JSON body:", JSON.stringify(requestBody));
        submissionId = requestBody.id;
        console.log(`Received submission ID: ${submissionId}`);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        console.log("Attempting to parse body as URL-encoded");
        
        // Try to parse as URL-encoded form data
        const formData = new URLSearchParams(bodyText);
        submissionId = formData.get('id');
        console.log(`Extracted submission ID from form data: ${submissionId}`);
      }
    } catch (e) {
      console.error("Error accessing request body:", e);
      return new Response(
        JSON.stringify({ 
          error: "Invalid request format. Could not read request body.",
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
    console.log("Fetching submission data from database");
    const { data: submission, error: submissionError } = await serviceClient
      .from('email_pitch_submissions')
      .select('sender_email, report_id, attachment_url')
      .eq('id', submissionId)
      .maybeSingle();
      
    if (submissionError) {
      console.error("Database error fetching submission:", submissionError);
      return new Response(
        JSON.stringify({ error: submissionError.message, success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    if (!submission) {
      console.error("Submission not found in database");
      return new Response(
        JSON.stringify({ error: "Submission not found", success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }
    
    console.log(`Found submission for email: ${submission.sender_email}`);
    console.log("Full submission data:", JSON.stringify(submission));
    
    // If there's no attachment URL, we can't proceed with analysis
    if (!submission.attachment_url) {
      console.error("No attachment URL found in the submission");
      return new Response(
        JSON.stringify({ 
          error: "No attachment URL found in the submission", 
          success: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log(`Found attachment URL: ${submission.attachment_url} for email: ${submission.sender_email}`);
    
    // Check if this submission already has a report_id
    if (submission.report_id) {
      console.log(`Submission already has a report ID: ${submission.report_id}`);
      
      // Check if auto-analyze is enabled for this sender
      console.log("Checking if auto-analyze is enabled for sender");
      const { data: investorPitchEmail, error: emailError } = await serviceClient
        .from('investor_pitch_emails')
        .select('auto_analyze, email_address')
        .eq('email_address', submission.sender_email)
        .maybeSingle();
        
      if (emailError) {
        console.error("Error fetching investor pitch email settings:", emailError);
      }
      
      console.log("Investor pitch email settings:", JSON.stringify(investorPitchEmail));
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
      console.log("Updating report status to pending");
      const { error: updateError } = await serviceClient
        .from('reports')
        .update({ 
          analysis_status: 'pending',
          analysis_error: null
        })
        .eq('id', submission.report_id);
        
      if (updateError) {
        console.error("Error updating report status:", updateError);
      }
      
      // Invoke the analyze-public-pdf function
      console.log(`Calling analyze-public-pdf for report ID: ${submission.report_id}`);
      try {
        const analysePdfUrl = `${SUPABASE_URL}/functions/v1/analyze-public-pdf`;
        console.log(`Making request to: ${analysePdfUrl}`);
        
        const response = await fetch(analysePdfUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            ...corsHeaders
          },
          body: JSON.stringify({ reportId: submission.report_id })
        });
        
        console.log(`analyze-public-pdf response status: ${response.status}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to analyze PDF: ${response.status} - ${errorText}`);
          throw new Error(`Failed to analyze PDF: ${response.status} - ${errorText}`);
        }
        
        const analysisResult = await response.json();
        console.log('Analysis completed successfully:', JSON.stringify(analysisResult));
        
        // Update the email_pitch_submissions record with the analysis status
        console.log("Updating email_pitch_submissions record with analysis status");
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
      } catch (fetchError) {
        console.error("Error calling analyze-public-pdf:", fetchError);
        return new Response(
          JSON.stringify({ error: fetchError.message, success: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    } else {
      console.log("No report_id found, creating a new report");
      
      // Create a new report for the PDF
      try {
        console.log("Creating new report record");
        const { data: report, error: reportError } = await serviceClient
          .from('reports')
          .insert({
            title: `Email Pitch from ${submission.sender_email}`,
            description: `Automatically generated report from email pitch submission`,
            pdf_url: submission.attachment_url,
            analysis_status: 'pending',
            is_public_submission: true // Setting this to ensure it follows the public analysis flow
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
        
        console.log(`Created new report with ID: ${report.id}`);
        
        // Update the email_pitch_submissions record with the report_id
        console.log("Updating email_pitch_submissions with report_id");
        const { error: updateError } = await serviceClient
          .from('email_pitch_submissions')
          .update({
            report_id: report.id
          })
          .eq('id', submissionId);
          
        if (updateError) {
          console.error("Error updating email_pitch_submissions:", updateError);
        }
        
        // Check if auto-analyze is enabled for this sender
        console.log("Checking if auto-analyze is enabled for sender");
        const { data: investorPitchEmail, error: emailError } = await serviceClient
          .from('investor_pitch_emails')
          .select('auto_analyze, email_address')
          .eq('email_address', submission.sender_email)
          .maybeSingle();
          
        if (emailError) {
          console.error("Error fetching investor pitch email settings:", emailError);
        }
        
        console.log("Investor pitch email settings:", JSON.stringify(investorPitchEmail));
        const autoAnalyzeEnabled = investorPitchEmail?.auto_analyze || false;
        
        if (!autoAnalyzeEnabled) {
          console.log(`Auto-analyze not enabled for ${submission.sender_email}, skipping analysis`);
          return new Response(
            JSON.stringify({ 
              message: "Auto-analyze not enabled for this email address", 
              success: true, 
              analyzed: false,
              reportId: report.id
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }
        
        console.log(`Auto-analyze enabled for ${submission.sender_email}, proceeding with analysis`);
        
        // Invoke the analyze-public-pdf function
        console.log(`Calling analyze-public-pdf for report ID: ${report.id}`);
        try {
          const analysePdfUrl = `${SUPABASE_URL}/functions/v1/analyze-public-pdf`;
          console.log(`Making request to: ${analysePdfUrl}`);
          
          const response = await fetch(analysePdfUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              ...corsHeaders
            },
            body: JSON.stringify({ reportId: report.id })
          });
          
          console.log(`analyze-public-pdf response status: ${response.status}`);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to analyze PDF: ${response.status} - ${errorText}`);
            throw new Error(`Failed to analyze PDF: ${response.status} - ${errorText}`);
          }
          
          const analysisResult = await response.json();
          console.log('Analysis completed successfully:', JSON.stringify(analysisResult));
          
          // Update the email_pitch_submissions record with the analysis status
          console.log("Updating email_pitch_submissions record with analysis status");
          await serviceClient
            .from('email_pitch_submissions')
            .update({
              analysis_status: 'completed'
            })
            .eq('id', submissionId);
          
          return new Response(JSON.stringify({ ...analysisResult, reportId: report.id }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          });
        } catch (fetchError) {
          console.error("Error calling analyze-public-pdf:", fetchError);
          return new Response(
            JSON.stringify({ error: fetchError.message, success: false }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }
      } catch (createReportError) {
        console.error("Error in report creation process:", createReportError);
        return new Response(
          JSON.stringify({ error: createReportError.message, success: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('Error in auto-analyze-email-pitch-pdf function:', error);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      success: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error instanceof Error && error.message.includes('not found') ? 404 : 500
    });
  } finally {
    console.log("=========== AUTO-ANALYZE FUNCTION COMPLETED ===========");
  }
});
