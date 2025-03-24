
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Check environment variables
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase credentials");
      return new Response(
        JSON.stringify({ error: 'Missing Supabase credentials', success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // Create Supabase client with the service role key for admin privileges
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Parse request body
    let requestData;
    try {
      requestData = await req.json();
    } catch (e) {
      console.error("Invalid request data:", e);
      return new Response(
        JSON.stringify({ error: 'Invalid request data', success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Validate request - check if we have the email submission ID
    const submissionId = requestData.submissionId || requestData.reportId;
    if (!submissionId) {
      console.error("Missing submissionId in request");
      return new Response(
        JSON.stringify({ error: 'Missing submissionId parameter', success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log(`Processing email submission ${submissionId}`);
    
    try {
      // First, get the email submission to check which email address it was sent to
      const { data: submission, error: submissionError } = await supabase
        .from('email_submissions')
        .select('to_email, report_id')
        .eq('id', submissionId)
        .maybeSingle();
        
      if (submissionError || !submission) {
        console.error("Error fetching email submission:", submissionError || "Not found");
        return new Response(
          JSON.stringify({ 
            error: submissionError?.message || "Email submission not found", 
            success: false 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }
      
      const toEmail = submission.to_email;
      const reportId = submission.report_id;
      
      if (!reportId) {
        console.error("No report ID associated with this submission");
        return new Response(
          JSON.stringify({ 
            error: "No report ID associated with this submission", 
            success: false 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
      console.log(`Email addressed to: ${toEmail}, Report ID: ${reportId}`);
      
      // Check if auto-analyze is enabled for this email address
      const { data: emailSettings, error: emailError } = await supabase
        .from('investor_pitch_emails')
        .select('user_id, auto_analyze')
        .eq('email_address', toEmail)
        .eq('request_status', 'completed')
        .maybeSingle();
        
      if (emailError) {
        console.error("Error checking email settings:", emailError);
        return new Response(
          JSON.stringify({ 
            error: emailError.message, 
            success: false, 
            autoAnalyze: false 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      
      if (!emailSettings) {
        console.log("No matching investor pitch email found for:", toEmail);
        return new Response(
          JSON.stringify({ 
            message: "No matching investor pitch email settings found", 
            success: true, 
            autoAnalyze: false 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
      
      console.log(`Found email settings: user_id=${emailSettings.user_id}, auto_analyze=${emailSettings.auto_analyze}`);
      
      // If auto-analyze is disabled, just return and don't process further
      if (!emailSettings.auto_analyze) {
        console.log("Auto-analyze is disabled for this email address");
        return new Response(
          JSON.stringify({ 
            message: "Auto-analyze is disabled for this email address", 
            success: true, 
            autoAnalyze: false 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
      
      console.log("Auto-analyze is enabled, triggering analysis for report:", reportId);
      
      // Update the report to set analysis_status to 'processing'
      const { error: updateError } = await supabase
        .from('reports')
        .update({ analysis_status: 'processing' })
        .eq('id', reportId);
        
      if (updateError) {
        console.error("Error updating report status:", updateError);
        // Continue anyway as this is not critical
      }
      
      // Call the analyze-pdf function to start the analysis
      const analyzeResponse = await fetch(`${SUPABASE_URL}/functions/v1/analyze-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reportId })
      });
      
      if (!analyzeResponse.ok) {
        const errorText = await analyzeResponse.text();
        console.error(`Error calling analyze-pdf (${analyzeResponse.status}): ${errorText}`);
        
        // Update the report to set analysis_status back to 'pending'
        await supabase
          .from('reports')
          .update({ 
            analysis_status: 'pending',
            analysis_error: `Auto-analysis failed: ${analyzeResponse.status} - ${errorText}`
          })
          .eq('id', reportId);
          
        return new Response(
          JSON.stringify({ 
            error: `Error triggering analysis: ${errorText}`, 
            success: false, 
            autoAnalyze: true 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      
      const analyzeResult = await analyzeResponse.json();
      console.log("Analysis triggered successfully:", analyzeResult);
      
      return new Response(
        JSON.stringify({ 
          message: "Auto-analysis triggered successfully", 
          success: true, 
          autoAnalyze: true,
          analysisResult: analyzeResult
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
      
    } catch (error) {
      console.error("Error in auto-analyze check:", error);
      return new Response(
        JSON.stringify({ 
          error: error instanceof Error ? error.message : "Unknown error in auto-analyze check", 
          success: false 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An unexpected error occurred", 
        success: false 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
