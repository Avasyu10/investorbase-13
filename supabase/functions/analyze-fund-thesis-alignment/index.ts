
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { corsHeaders } from "./cors.ts";

// Define CORS headers
serve(async (req) => {
  // Log the request details for debugging
  console.log(`Request method: ${req.method}`);
  console.log(`Request headers:`, JSON.stringify(Object.fromEntries(req.headers.entries())));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request with CORS headers');
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

    // Parse the request body
    let requestData;
    try {
      requestData = await req.json();
      console.log('Received request data:', JSON.stringify(requestData));
    } catch (error) {
      console.error('Error parsing request JSON:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const { company_id, user_id } = requestData;

    // Validate input
    if (!company_id || !user_id) {
      console.error('Missing required parameters:', { company_id, user_id });
      return new Response(
        JSON.stringify({ error: 'Company ID and User ID are required' }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log(`Processing fund thesis alignment for company ${company_id} and user ${user_id}`);

    // For debugging purposes, return mock data
    // This will allow us to test if the endpoint is accessible
    const mockAnalysis = `
# Fund Thesis Alignment Analysis

## 1. Overall Summary
This company shows moderate alignment with your fund thesis, with a synergy score of 3.8/5. While there are strong points of alignment in target market and technological approach, there are noticeable divergences in scalability strategy and revenue model that may require further evaluation.

## 2. Key Similarities
- **Target Market Alignment**: The company's focus on enterprise healthcare solutions matches your fund's emphasis on B2B healthcare technology investments.
- **Technology Stack**: Their use of AI and machine learning aligns perfectly with your fund's focus on next-generation technology applications.
- **Team Experience**: The founders' background in healthcare technology mirrors your investment criteria for domain expertise.
- **Regulatory Compliance**: Their approach to handling sensitive data meets your fund's compliance requirements.

## 3. Key Differences
- **Scale Strategy**: Their geographic expansion plans are more conservative than your fund typically supports.
- **Revenue Model**: Their subscription-based approach differs somewhat from your preferred transaction-based models.
- **Capital Efficiency**: Their projected capital requirements are slightly higher than your fund's typical investment parameters.
`;

    return new Response(JSON.stringify({ 
      analysis: mockAnalysis,
      prompt_sent: "Mock prompt for testing",
      response_received: "Mock response for testing"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error in fund thesis alignment analysis:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
