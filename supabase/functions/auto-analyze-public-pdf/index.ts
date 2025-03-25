
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        ...corsHeaders,
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables');
    }
    
    // Create a Supabase client with the service key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: corsHeaders,
      }
    });
    
    // Parse the request body to get the report ID
    const { reportId } = await req.json();
    
    if (!reportId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Report ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log(`Auto-analyzing public PDF report: ${reportId}`);
    
    // Check if the report already has an associated company (to prevent duplicate analysis)
    const { data: existingReport, error: checkError } = await supabase
      .from('reports')
      .select('company_id, analysis_status, pdf_url, is_public_submission')
      .eq('id', reportId)
      .maybeSingle();
      
    if (checkError) {
      console.error("Error checking report status:", checkError);
      throw checkError;
    }
    
    if (existingReport?.company_id) {
      console.log(`Report ${reportId} already has a company with ID ${existingReport.company_id}, skipping analysis`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Analysis already completed', 
          companyId: existingReport.company_id 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // If analysis is already in progress, don't start another one
    if (existingReport?.analysis_status === 'analyzing' || existingReport?.analysis_status === 'processing') {
      console.log(`Report ${reportId} is already being analyzed, skipping new analysis request`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Analysis already in progress' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if this is from an email submission based on the pdf_url
    const isEmailSubmission = existingReport?.pdf_url && existingReport.pdf_url.includes('email_attachments');
    
    // Update the report status to indicate analysis is starting
    await supabase
      .from('reports')
      .update({ 
        analysis_status: 'analyzing',
        source: isEmailSubmission ? 'email' : 'public_url'  // Set the correct source
      })
      .eq('id', reportId);
    
    // Call the appropriate analyze function based on the source
    const endpoint = isEmailSubmission ? 'analyze-public-pdf' : 'analyze-pdf';
    console.log(`Using ${endpoint} for report ${reportId} (email submission: ${isEmailSubmission})`);
    
    // Call the analyze edge function, which will handle the actual PDF parsing and analysis
    const { data, error } = await supabase.functions.invoke(endpoint, {
      body: { reportId },
      headers: corsHeaders
    });
    
    if (error) {
      console.error(`Error invoking ${endpoint} function:`, error);
      
      // Update report status to failed
      await supabase
        .from('reports')
        .update({
          analysis_status: 'failed',
          analysis_error: error.message
        })
        .eq('id', reportId);
        
      throw error;
    }
    
    console.log('Analysis response:', data);
    
    if (!data || !data.companyId) {
      const errorMessage = data?.error || "Analysis did not return a company ID";
      console.error(errorMessage);
      
      // Update report status to failed
      await supabase
        .from('reports')
        .update({
          analysis_status: 'failed',
          analysis_error: errorMessage
        })
        .eq('id', reportId);
        
      throw new Error(errorMessage);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Analysis completed successfully', 
        companyId: data.companyId,
        autoAnalyze: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in auto-analyze-public-pdf:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
