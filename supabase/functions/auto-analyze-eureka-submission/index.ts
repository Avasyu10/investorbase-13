
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-version, user-agent, accept, accept-language, cache-control, pragma',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  console.log(`Auto-analyze wrapper - Request method: ${req.method}`);
  console.log(`Auto-analyze wrapper - Request origin: ${req.headers.get('origin')}`);
  console.log(`Auto-analyze wrapper - Request URL: ${req.url}`);
  
  if (req.method === 'OPTIONS') {
    console.log('Auto-analyze wrapper - Handling CORS preflight request');
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    });
  }

  if (req.method !== 'POST') {
    console.log(`Auto-analyze wrapper - Method ${req.method} not allowed`);
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const requestBody = await req.json();
    console.log('Auto-analyze wrapper - Received request body:', requestBody);
    
    const submissionId = requestBody.submissionId || requestBody.submission_id;
    
    if (!submissionId) {
      throw new Error('Submission ID is required');
    }

    console.log(`Auto-analyze wrapper - Processing submission: ${submissionId}`);

    // Add a longer delay to ensure the database transaction is fully committed
    console.log('Auto-analyze wrapper - Adding 5 second delay for transaction commit...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Call the main analysis function
    console.log('Auto-analyze wrapper - Calling main analyze-eureka-form function...');
    
    const analysisResponse = await fetch(
      'https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/analyze-eureka-form',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.get('Authorization') || '',
        },
        body: JSON.stringify({ submissionId }),
      }
    );

    const analysisResult = await analysisResponse.json();
    
    console.log('Auto-analyze wrapper - Analysis function response:', analysisResult);
    console.log('Auto-analyze wrapper - Analysis function status:', analysisResponse.status);

    if (!analysisResponse.ok) {
      console.warn('Auto-analyze wrapper - Analysis function failed:', analysisResult);
      // Don't throw error - return success but with warning
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Analysis scheduled but may have encountered issues',
          submissionId,
          analysisResult,
          warning: `Analysis function returned status ${analysisResponse.status}`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Analysis initiated successfully',
        submissionId,
        analysisResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Auto-analyze wrapper - Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: 'Check function logs for more information'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
