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

        // Fetch latest evaluation rows with all scores
        const { data, error } = await supabase
            .from('submission_evaluations')
            .select(`
                id, startup_name, problem_statement, evaluator_user_id, created_at,
                existence_score, severity_score, frequency_score, unmet_need_score,
                direct_fit_score, differentiation_score, feasibility_score, effectiveness_score,
                market_size_score, growth_trajectory_score, timing_readiness_score, external_catalysts_score,
                first_customers_score, accessibility_score, acquisition_approach_score, pain_recognition_score,
                direct_competitors_score, substitutes_score, differentiation_vs_players_score, dynamics_score,
                usp_clarity_score, usp_differentiation_strength_score, usp_defensibility_score, usp_alignment_score,
                tech_vision_ambition_score, tech_coherence_score, tech_alignment_score, tech_realism_score,
                tech_feasibility_score, tech_components_score, tech_complexity_awareness_score, tech_roadmap_score,
                overall_average, ai_analysis_summary, ai_recommendations
            `)
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
