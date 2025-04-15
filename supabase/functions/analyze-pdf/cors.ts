
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, origin, x-requested-with, x-app-version',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin'
};

// Handle OPTIONS requests for CORS preflight
export function handleCors(req: Request) {
  console.log('[CORS DEBUG] Handling possible CORS preflight request');
  
  // Log request details
  console.log(`[CORS DEBUG] Request URL: ${req.url}`);
  const origin = req.headers.get('origin');
  console.log(`[CORS DEBUG] Origin: ${origin}`);
  console.log(`[CORS DEBUG] Method: ${req.method}`);

  // Return a 204 No Content response with CORS headers for OPTIONS requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  return null;
}
