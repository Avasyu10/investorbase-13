
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
  
  // Log all headers for debugging
  console.log('[CORS DEBUG] All request headers:');
  req.headers.forEach((value, key) => {
    console.log(`[CORS DEBUG] ${key}: ${value}`);
  });

  // Return a 204 No Content response with CORS headers for OPTIONS requests
  if (req.method === 'OPTIONS') {
    console.log('[CORS DEBUG] Responding to OPTIONS request with CORS headers');
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  // For non-OPTIONS requests, just return null to continue processing
  return null;
}
