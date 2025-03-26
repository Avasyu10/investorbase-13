
// cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Or specify your exact origin
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE, PUT',
  'Access-Control-Allow-Headers': 'access-control-allow-origin,apikey,authorization,content-type,x-app-version',
  'Access-Control-Max-Age': '86400', // Cache preflight response for 24 hours
  'Content-Type': 'application/json'
};
