
// CORS headers for the real-time-perplexity-research function
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, origin, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

// Helper function to handle CORS preflight requests
export function handleCors(req: Request): Response | null {
  console.log(`[CORS] Received ${req.method} request from origin: ${req.headers.get('origin') || 'unknown'}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`[CORS] Handling OPTIONS preflight request`);
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }
  
  return null;
}
