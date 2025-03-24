
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "./cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check environment variables
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
      console.error("Supabase credentials are not configured");
      return new Response(
        JSON.stringify({ 
          error: 'Supabase credentials are not configured',
          success: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Parse request data
    let reqData;
    try {
      reqData = await req.json();
    } catch (e) {
      console.error("Error parsing request JSON:", e);
      return new Response(
        JSON.stringify({ 
          error: "Invalid request format. Expected JSON with reportId property.",
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
    
    // Get the report and check if it's from an email submission
    const { data: report, error: reportError } = await serviceClient
      .from('reports')
      .select('user_id, submitter_email, analysis_status')
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
    
    // Check if this user has enabled auto-analyze for email submissions
    if (!report.user_id) {
      console.log("No user ID found for report, skipping auto-analyze check");
      return new Response(
        JSON.stringify({ 
          message: "No user ID found for report, skipping auto-analyze check",
          success: true,
          autoAnalyze: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    // Get the investor pitch email settings for this user
    const { data: emailData, error: emailError } = await serviceClient
      .from('investor_pitch_emails')
      .select('auto_analyze')
      .eq('user_id', report.user_id)
      .maybeSingle();
      
    if (emailError) {
      console.error("Error fetching investor pitch email settings:", emailError);
      return new Response(
        JSON.stringify({ error: emailError.message, success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    if (!emailData) {
      console.log("No investor pitch email settings found for this user");
      return new Response(
        JSON.stringify({ 
          message: "No investor pitch email settings found for this user",
          success: true,
          autoAnalyze: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    // Check auto_analyze setting
    const autoAnalyze = emailData.auto_analyze || false;
    console.log(`User auto_analyze setting: ${autoAnalyze}`);
    
    if (!autoAnalyze) {
      console.log("Auto-analyze is disabled for this user, skipping analysis");
      return new Response(
        JSON.stringify({ 
          message: "Auto-analyze is disabled for this user, skipping analysis",
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
    
    // Proceed with analysis - call the analyze-pdf function
    console.log("Calling analyze-pdf function");
    
    // Call the analyze-pdf function with the report ID
    // Use anon key since we're running this as a service
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ reportId })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error from analyze-pdf: ${response.status} - ${errorText}`);
        return new Response(
          JSON.stringify({ 
            error: `Error from analyze-pdf: ${response.status}`,
            details: errorText,
            success: false
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
        );
      }
      
      const analysisResult = await response.json();
      
      console.log("Analysis completed successfully:", analysisResult);
      
      // After successful analysis, remove the email submission from the list by updating its status
      if (analysisResult.companyId) {
        // Find and update any email_submissions associated with this report
        const { data: emailSubmissions, error: emailSubmissionsError } = await serviceClient
          .from('email_submissions')
          .select('id')
          .eq('report_id', reportId);
          
        if (!emailSubmissionsError && emailSubmissions && emailSubmissions.length > 0) {
          console.log(`Found ${emailSubmissions.length} email submissions to update`);
          
          // Update the associated email submissions to mark them as processed
          // This is critical to prevent them from showing up in the dashboard
          for (const submission of emailSubmissions) {
            await serviceClient
              .from('email_submissions')
              .update({ processed: true })
              .eq('id', submission.id);
          }
          console.log(`Updated email submissions as processed`);
        }
      }
      
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
      console.error("Error calling analyze-pdf:", analysisError);
      return new Response(
        JSON.stringify({ 
          error: "Error calling analyze-pdf", 
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
