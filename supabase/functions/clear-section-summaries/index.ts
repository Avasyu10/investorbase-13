import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { submissionId } = await req.json();
    
    if (!submissionId) {
      throw new Error('Missing required parameter: submissionId');
    }

    console.log(`Clearing cached summaries for submission ${submissionId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Delete all cached summaries for this submission
    const { error: deleteError } = await supabase
      .from('startup_section_summaries')
      .delete()
      .eq('submission_id', submissionId);

    if (deleteError) {
      console.error('Error deleting cached summaries:', deleteError);
      throw new Error(`Failed to clear cache: ${deleteError.message}`);
    }

    console.log('Successfully cleared cached summaries');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Cache cleared successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in clear-section-summaries:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});