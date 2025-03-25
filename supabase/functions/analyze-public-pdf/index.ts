
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    
    // Parse request data
    const { reportId } = await req.json();
    
    if (!reportId) {
      throw new Error('Report ID is required');
    }
    
    console.log(`Processing public submission report: ${reportId}`);
    
    // Forward all relevant headers from the original request
    const headers = new Headers({
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    });
    
    // Add origin header from the request if present
    const origin = req.headers.get('origin');
    if (origin) {
      headers.set('Origin', origin);
    }
    
    // Call the analyze-pdf function directly with the report ID
    const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-pdf`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reportId })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to analyze PDF: ${response.status} - ${errorText}`);
    }
    
    const analysisResult = await response.json();
    console.log('Analysis completed successfully');
    
    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    console.error('Error in analyze-public-pdf function:', error);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      success: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error instanceof Error && error.message.includes('not found') ? 404 : 500
    });
  }
});
