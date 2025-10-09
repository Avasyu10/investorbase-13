import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export async function evaluateProblemStatementHandler(payload: any, authHeader?: string | null) {
    try {
        const { submission } = payload; // expects { submission } object with problem_statement
        const problem_statement = submission?.problem_statement;

        if (!problem_statement) throw new Error('Missing problem_statement in submission');

        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        // If LOVABLE_API_KEY is not configured, we'll run a deterministic mock evaluator
        const useMock = !LOVABLE_API_KEY;

        if (!authHeader) throw new Error('No authorization header');

        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) throw new Error('Unauthorized');

        // Build system prompt with scoring rubric for Problem Statement only
        const systemPrompt = `You are a rigorous startup evaluator. Given a problem statement, score it on the following sub-criteria. For each sub-criterion return an integer score between 1 and 20. Provide also an analysis summary and 5 concise recommendations. Output must be a function call to provide_evaluation with a single JSON argument matching the schema.

Scoring sub-criteria for Problem Statement:
- existence: Does the problem exist? (1-20)
- severity: How severe is the problem? (1-20)
- frequency: How frequently does the problem occur? (1-20)
- unmet_need: Is there an unmet need? (1-20)

For each sub-criterion, follow the provided 1-20 rubrics (be conservative and justify scores in the analysis_summary). The analysis_summary should briefly explain the main drivers for the scores and call out key risks and strengths. recommendations should be 3-5 actionable bullets. Do NOT include any extra fields.
`;

        const userPrompt = `Problem Statement: ${problem_statement}`;

        let args: any = {};

        if (useMock) {
            // Deterministic mock evaluation based on problem_statement text
            console.warn('LOVABLE_API_KEY not set — running mock evaluation for development.');
            const seed = problem_statement || '';
            const hash = Array.from(seed).reduce((acc: number, ch: string) => (acc + ch.charCodeAt(0)) % 10000, 0);
            const pick = (base: number, offset: number) => {
                // produce a value 8-18 deterministically
                const v = 8 + ((hash + base + offset) % 11);
                return Math.max(1, Math.min(20, v));
            };

            args = {
                existence: pick(1, 3), severity: pick(2, 5), frequency: pick(3, 1), unmet_need: pick(4, 2),
                analysis_summary: `Mock evaluation (LOVABLE_API_KEY not configured). Generated deterministic scores based on problem statement content.`,
                recommendations: `Mock recommendations: Validate the problem with potential users; research severity and frequency; identify unmet needs.`
            };
        } else {
            const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "google/gemini-2.5-flash",
                    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
                    tools: [{
                        type: 'function',
                        function: {
                            name: 'provide_evaluation',
                            description: 'Structured evaluation for problem statement',
                            parameters: {
                                type: 'object',
                                properties: {
                                    existence: { type: 'integer' }, severity: { type: 'integer' }, frequency: { type: 'integer' }, unmet_need: { type: 'integer' },
                                    analysis_summary: { type: 'string' },
                                    recommendations: { type: 'string' }
                                },
                                required: ['existence', 'severity', 'frequency', 'unmet_need', 'analysis_summary', 'recommendations'],
                                additionalProperties: false
                            }
                        }
                    }],
                    tool_choice: { type: 'function', function: { name: 'provide_evaluation' } }
                })
            });

            if (!aiResponse.ok) {
                const errorText = await aiResponse.text();
                console.error('AI Gateway error:', aiResponse.status, errorText);
                throw new Error('AI Gateway error');
            }

            const aiData = await aiResponse.json();
            const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
            args = toolCall ? JSON.parse(toolCall.function.arguments) : {};
        }

        // Ensure integer bounds 1-20 for scores
        const clamp = (v: any) => {
            const n = parseInt(v);
            if (isNaN(n)) return 10;
            return Math.max(1, Math.min(20, n));
        };

        const record = {
            startup_name: null, // No full submission, set to null
            problem_statement: problem_statement,
            evaluator_user_id: user.id,
            existence_score: clamp(args.existence),
            severity_score: clamp(args.severity),
            frequency_score: clamp(args.frequency),
            unmet_need_score: clamp(args.unmet_need),
            // Set other scores to null or defaults since only problem statement is evaluated
            direct_fit_score: null,
            differentiation_score: null,
            feasibility_score: null,
            effectiveness_score: null,
            market_size_score: null,
            growth_trajectory_score: null,
            timing_readiness_score: null,
            external_catalysts_score: null,
            first_customers_score: null,
            accessibility_score: null,
            acquisition_approach_score: null,
            pain_recognition_score: null,
            direct_competitors_score: null,
            substitutes_score: null,
            differentiation_vs_players_score: null,
            dynamics_score: null,
            usp_clarity_score: null,
            usp_differentiation_strength_score: null,
            usp_defensibility_score: null,
            usp_alignment_score: null,
            tech_vision_ambition_score: null,
            tech_coherence_score: null,
            tech_alignment_score: null,
            tech_realism_score: null,
            tech_feasibility_score: null,
            tech_components_score: null,
            tech_complexity_awareness_score: null,
            tech_roadmap_score: null,
            overall_average: null,
            ai_analysis_summary: args.analysis_summary || null,
            ai_recommendations: args.recommendations || null
        };

        const { data: evaluation, error: dbError } = await supabase
            .from('submission_evaluations')
            .insert(record)
            .select()
            .single();

        if (dbError) {
            console.error('DB insert error:', dbError);
            throw new Error('Database error');
        }

        return new Response(JSON.stringify({ success: true, evaluation }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('Error in evaluate-problem-statement:', error);
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
}

// Serve wrapper uses the exported handler so other functions can import it for compatibility
serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    const payload = await req.json().catch(() => ({}));
    return await evaluateProblemStatementHandler(payload, req.headers.get('Authorization'));
});