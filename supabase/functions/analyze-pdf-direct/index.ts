
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { analyzeWithOpenAI } from "../analyze-pdf/openaiService.ts";
import { saveAnalysisResults } from "../analyze-pdf/databaseService.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check environment variables early
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ 
          error: 'OPENAI_API_KEY is not configured',
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

    // Get authorization header from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("Missing Authorization header");
      return new Response(
        JSON.stringify({ 
          error: 'Authorization header is required',
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
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
          error: "Invalid request format. Expected JSON with pdfBase64 property.",
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const { pdfBase64, metadata } = reqData;
    
    // Validate pdfBase64
    if (!pdfBase64) {
      console.error("Missing pdfBase64 in request");
      return new Response(
        JSON.stringify({ 
          error: "PDF data is required",
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    if (!metadata || !metadata.title) {
      console.error("Missing metadata.title in request");
      return new Response(
        JSON.stringify({ 
          error: "Company name is required",
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Get user info from auth
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed: ' + userError.message,
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }
    
    if (!user) {
      console.error("No user found with the provided token");
      return new Response(
        JSON.stringify({ 
          error: 'User not authenticated',
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }
    
    console.log(`Authenticated as user: ${user.id}, processing direct PDF analysis`);
    
    try {
      // Create a "virtual" report entry for tracking purposes
      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .insert({
          title: metadata.title,
          user_id: user.id,
          description: '', // Empty description
          metadata: {
            companyWebsite: metadata.companyWebsite,
            companyStage: metadata.companyStage,
            industry: metadata.industry,
            founderLinkedIns: metadata.founderLinkedIns
          }
        })
        .select()
        .single();
        
      if (reportError) {
        console.error("Error creating report entry:", reportError);
        throw new Error("Failed to create report entry: " + reportError.message);
      }
      
      // Analyze the PDF with OpenAI directly
      console.log("Sending PDF to OpenAI for analysis");
      const analysis = await analyzeWithOpenAI(pdfBase64, OPENAI_API_KEY);
      
      // Save analysis results to database
      console.log("Analysis complete, saving results");
      const companyId = await saveAnalysisResults(supabase, analysis, reportData);

      console.log(`Analysis complete, created company with ID: ${companyId}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          companyId,
          message: "Report analyzed successfully" 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    } catch (error) {
      console.error("Analysis error:", error);
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
  } catch (error) {
    console.error("Error in analyze-pdf-direct function:", error);
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
