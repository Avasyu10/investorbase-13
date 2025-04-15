import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('[auto-analyze-public-pdf] Request received:', req.method, req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[auto-analyze-public-pdf] Handling OPTIONS request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check environment variables
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
      console.error("[auto-analyze-public-pdf] Supabase credentials are not configured");
      return new Response(
        JSON.stringify({ 
          error: 'Supabase credentials are not configured',
          success: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Parse request data - FIXED: Added better handling for empty body
    if (req.body === null) {
      console.error("[auto-analyze-public-pdf] Request body is null");
      return new Response(
        JSON.stringify({ 
          error: "Request body is empty. Expected JSON with reportId property.",
          success: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    let reqData;
    try {
      const reqText = await req.text();
      console.log(`[auto-analyze-public-pdf] Raw request body length: ${reqText.length}`);
      
      if (!reqText || reqText.trim() === '') {
        console.error("[auto-analyze-public-pdf] Empty request body");
        return new Response(
          JSON.stringify({ 
            error: "Request body is empty. Expected JSON with reportId property.",
            success: false
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
      try {
        reqData = JSON.parse(reqText);
        console.log("[auto-analyze-public-pdf] Request data parsed:", JSON.stringify(reqData));
      } catch (parseError) {
        console.error("[auto-analyze-public-pdf] Error parsing request JSON:", parseError);
        return new Response(
          JSON.stringify({ 
            error: "Invalid JSON format in request body.",
            success: false,
            rawBody: reqText.substring(0, 100) // Include a preview of the raw body for debugging
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    } catch (e) {
      console.error("[auto-analyze-public-pdf] Error reading request body:", e);
      return new Response(
        JSON.stringify({ 
          error: "Error reading request body. Expected JSON with reportId property.",
          success: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    const { reportId } = reqData;
    
    // Validate reportId
    if (!reportId) {
      console.error("Missing reportId in request");
      return new Response(
        JSON.stringify({ error: "Report ID is required", success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(reportId)) {
      console.error(`Invalid reportId format: "${reportId}"`);
      return new Response(
        JSON.stringify({ 
          error: `Invalid report ID format. Expected a UUID, got: ${reportId}`,
          success: false 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Processing report ${reportId} for auto-analysis check`);
    
    // Create a service client for direct database access
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Get the report and check if it's from a public submission
    const { data: report, error: reportError } = await serviceClient
      .from('reports')
      .select('submission_form_id, is_public_submission, analysis_status')
      .eq('id', reportId)
      .maybeSingle();
      
    if (reportError) {
      console.error("Error fetching report:", reportError);
      return new Response(
        JSON.stringify({ error: reportError.message, success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    if (!report) {
      console.error("Report not found");
      return new Response(
        JSON.stringify({ error: "Report not found", success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }
    
    // Check if it's a public submission
    if (!report.is_public_submission) {
      console.log("Not a public submission, skipping auto-analyze check");
      return new Response(
        JSON.stringify({ 
          message: "Not a public submission, skipping auto-analyze check",
          success: true,
          autoAnalyze: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    // Already analyzed or processing
    if (report.analysis_status !== 'manual_pending' && report.analysis_status !== 'pending') {
      console.log(`Report already in status: ${report.analysis_status}, skipping`);
      return new Response(
        JSON.stringify({ 
          message: `Report already in status: ${report.analysis_status}, skipping`,
          success: true,
          autoAnalyze: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    // Check the submission form's auto_analyze setting
    if (!report.submission_form_id) {
      console.log("No submission form ID found, cannot determine auto_analyze setting");
      return new Response(
        JSON.stringify({ 
          message: "No submission form ID found, cannot determine auto_analyze setting",
          success: true,
          autoAnalyze: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    const { data: formData, error: formError } = await serviceClient
      .from('public_submission_forms')
      .select('auto_analyze, user_id')
      .eq('id', report.submission_form_id)
      .maybeSingle();
      
    if (formError) {
      console.error("Error fetching form data:", formError);
      return new Response(
        JSON.stringify({ error: formError.message, success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    if (!formData) {
      console.log("Submission form not found");
      return new Response(
        JSON.stringify({ 
          message: "Submission form not found",
          success: true,
          autoAnalyze: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    // Check auto_analyze setting
    const autoAnalyze = formData.auto_analyze || false;
    console.log(`Form auto_analyze setting: ${autoAnalyze}`);
    
    if (!autoAnalyze) {
      console.log("Auto-analyze is disabled for this form, skipping analysis");
      return new Response(
        JSON.stringify({ 
          message: "Auto-analyze is disabled for this form, skipping analysis",
          success: true,
          autoAnalyze: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    // Update status to pending if it was manual_pending
    if (report.analysis_status === 'manual_pending') {
      const { error: updateError } = await serviceClient
        .from('reports')
        .update({ analysis_status: 'pending' })
        .eq('id', reportId);
        
      if (updateError) {
        console.error("Error updating report status:", updateError);
        // Non-blocking, continue with analysis
      } else {
        console.log("Updated report status from manual_pending to pending");
      }
    }
    
    // Proceed with analysis - call the analyze-public-pdf function
    console.log("Calling analyze-public-pdf function");
    
    // Call the analyze-public-pdf function with the report ID
    // Use anon key since we're running this as a service
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-public-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ reportId })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error from analyze-public-pdf: ${response.status} - ${errorText}`);
        return new Response(
          JSON.stringify({ 
            error: `Error from analyze-public-pdf: ${response.status}`,
            details: errorText,
            success: false
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
        );
      }
      
      const analysisResult = await response.json();
      
      console.log("Analysis completed successfully:", analysisResult);
      
      return new Response(
        JSON.stringify({ 
          message: "Analysis initiated successfully", 
          companyId: analysisResult.companyId,
          success: true,
          autoAnalyze: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    } catch (analysisError) {
      console.error("Error calling analyze-public-pdf:", analysisError);
      return new Response(
        JSON.stringify({ 
          error: "Error calling analyze-public-pdf", 
          details: analysisError instanceof Error ? analysisError.message : String(analysisError),
          success: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        error: "An unexpected error occurred", 
        details: error instanceof Error ? error.message : String(error),
        success: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
