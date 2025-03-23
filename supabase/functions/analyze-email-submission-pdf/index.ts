
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check environment variables early
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ 
          error: 'GEMINI_API_KEY is not configured',
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("Supabase credentials are not configured");
      return new Response(
        JSON.stringify({ 
          error: 'Supabase credentials are not configured',
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
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
          error: "Invalid request format. Expected JSON with emailSubmissionId property.",
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const { emailSubmissionId } = reqData;
    
    if (!emailSubmissionId) {
      console.error("Missing emailSubmissionId in request");
      return new Response(
        JSON.stringify({ 
          error: "Email Submission ID is required",
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    
    // Validate that emailSubmissionId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(emailSubmissionId)) {
      console.error(`Invalid emailSubmissionId format: "${emailSubmissionId}"`);
      return new Response(
        JSON.stringify({ 
          error: `Invalid Email Submission ID format. Expected a UUID, got: ${emailSubmissionId}`,
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    console.log(`Processing email submission ${emailSubmissionId}`);
    
    // Get the email submission details
    const { data: emailSubmission, error: emailError } = await supabase
      .from('email_submissions')
      .select('*')
      .eq('id', emailSubmissionId)
      .single();
    
    if (emailError || !emailSubmission) {
      console.error("Error fetching email submission:", emailError || "Email submission not found");
      return new Response(
        JSON.stringify({ 
          error: emailError?.message || "Email submission not found",
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: emailError ? 500 : 404
        }
      );
    }

    // Check if the email submission has a report_id
    if (!emailSubmission.report_id) {
      console.error("Email submission does not have an associated report");
      return new Response(
        JSON.stringify({ 
          error: "Email submission does not have an associated report",
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    const reportId = emailSubmission.report_id;
    
    console.log(`Found associated report ID: ${reportId}, calling analyze-pdf function`);
    
    // Call the analyze-pdf function
    try {
      const analyzeResponse = await supabase.functions.invoke('analyze-pdf', {
        body: { reportId }
      });
      
      if (!analyzeResponse.data || analyzeResponse.error) {
        const errorMessage = analyzeResponse.error?.message || 
                             (analyzeResponse.data && analyzeResponse.data.error) || 
                             "Unknown error during PDF analysis";
        
        console.error("Error from analyze-pdf function:", errorMessage);
        return new Response(
          JSON.stringify({ 
            error: errorMessage,
            success: false
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          }
        );
      }
      
      const { companyId } = analyzeResponse.data;
      
      console.log(`Analysis complete, created company with ID: ${companyId}`);
      
      // Update email submission with company_id
      const { error: updateError } = await supabase
        .from('email_submissions')
        .update({ 
          company_id: companyId
        })
        .eq('id', emailSubmissionId);
      
      if (updateError) {
        console.error("Error updating email submission with company ID:", updateError);
        // Non-blocking error, continue
      }

      // After successful analysis, return the response
      return new Response(
        JSON.stringify({ 
          success: true, 
          companyId,
          reportId,
          message: "Email submission PDF analyzed successfully" 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
      
    } catch (analyzeError) {
      console.error("Error calling analyze-pdf function:", analyzeError);
      return new Response(
        JSON.stringify({ 
          error: analyzeError instanceof Error ? analyzeError.message : "Analysis function failed",
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }
    
  } catch (error) {
    console.error("General error in analyze-email-submission-pdf function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An unexpected error occurred",
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
