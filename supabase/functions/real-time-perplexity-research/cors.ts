// CORS headers implementation
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, authorization, content-type, origin, x-requested-with, x-app-version',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin'
};

// Handle OPTIONS requests for CORS preflight
export function handleCors(req: Request) {
  console.log('[CORS DEBUG] Handling OPTIONS preflight request');
  
  // Log request details
  console.log(`[CORS DEBUG] Request URL: ${req.url}`);
  const origin = req.headers.get('origin');
  console.log(`[CORS DEBUG] Origin: ${origin}`);
  console.log(`[CORS DEBUG] Method: ${req.method}`);

  // Return a 204 No Content response with CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Headers': 'apikey, authorization, content-type, origin, x-requested-with, x-app-version',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin'
      }
    });
  }
  
  return null;
}
