import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    try {
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase env not configured');

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

        // Simple auth check: ensure an Authorization header exists (we won't validate token here)
        const authHeader = req.headers.get('Authorization');
        console.log('get-submission-evaluations invoked; has Authorization header:', Boolean(authHeader));
        if (!authHeader) return new Response(JSON.stringify({ error: 'Missing Authorization' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

        // Fetch latest evaluation rows
        const { data, error } = await supabase
            .from('submission_evaluations')
            .select('id, startup_name, problem_statement, overall_average, ai_analysis_summary, ai_recommendations, created_at')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error('Database read error in get-submission-evaluations:', error);
            // If the table doesn't exist or other DB error, return an empty array instead of 500 for better UX
            return new Response(JSON.stringify({ data: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (err) {
        console.error('Error in get-submission-evaluations:', err);
        return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});
