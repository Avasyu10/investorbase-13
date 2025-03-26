
// CORS headers for unrestricted access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true',
};

// Function to handle OPTIONS preflight requests
export function handleCors(req: Request): Response | null {
  // Log every request's headers for debugging
  console.log('[CORS DEBUG] Received request method:', req.method);
  console.log('[CORS DEBUG] Request URL:', req.url);
  console.log('[CORS DEBUG] Request headers:', Object.fromEntries([...req.headers.entries()]));
  
  // Handle OPTIONS request explicitly
  if (req.method === 'OPTIONS') {
    console.log('[CORS DEBUG] Handling OPTIONS preflight request');
    
    // Return early with CORS headers only
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  // Not an OPTIONS request, return null to continue processing
  return null;
}

// Apply CORS headers to any response
export function applyCorsHeaders(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  
  // Add all CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

// Export CORS headers for direct use
export { corsHeaders };
