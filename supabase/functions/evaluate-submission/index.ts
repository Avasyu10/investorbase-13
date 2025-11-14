import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export async function evaluateSubmissionHandler(payload: any, authHeader?: string | null) {
    try {
        const { submission } = payload; // expects full submission object

        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        // If LOVABLE_API_KEY is not configured, we'll run a deterministic mock evaluator
        const useMock = !LOVABLE_API_KEY;

        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

        // Try to get user from auth header if present, otherwise use default evaluator
        let evaluatorUserId = '33be6564-449b-4999-bed6-b6364658c4f1'; // Default evaluator for API calls
        
        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            const { data: { user: authUser }, error: userError } = await supabase.auth.getUser(token);
            if (!userError && authUser) {
                evaluatorUserId = authUser.id;
            }
        }

        // Build system prompt with scoring rubric for all categories - STRICT SCORING
        const systemPrompt = `You are an extremely rigorous and critical startup evaluator with exceptionally high standards. Given a startup submission (problem statement, solution, market details, customer and competitor sections, USP, tech/vision, etc.), score the submission on the following groups and sub-criteria. 

CRITICAL SCORING GUIDELINES:
- Use the FULL range 1-20, but be HIGHLY CONSERVATIVE with scores
- Most startups should score between 5-12 on average. Scores above 15 should be EXTREMELY rare and reserved for truly exceptional cases
- A score of 10 represents "adequate but unremarkable" - most criteria should be below this
- Only give high scores (15+) when there is EXCEPTIONAL, CONCRETE evidence of excellence
- Be skeptical of vague claims, unvalidated assumptions, or generic statements
- Penalize heavily for: lack of specificity, missing data, unproven claims, weak differentiation, unclear go-to-market
- A "good idea" is NOT enough - execution plan, market validation, and realistic feasibility are critical

Scoring groups and sub-criteria:
1) Problem Statement: existence, severity, frequency, unmet_need
   - Demand CONCRETE evidence of the problem's existence and severity
   - Anecdotal evidence scores low (1-6). Survey data scores medium (7-10). Hard metrics score higher (11-15)
   
2) Solution: direct_fit, differentiation, feasibility, effectiveness
   - Generic or obvious solutions score low (1-8)
   - True innovation with clear feasibility scores medium (9-13)
   - Proven concept with strong execution plan scores higher (14-17)
   
3) Market Understanding: market_size, growth_trajectory, timing_readiness, external_catalysts
   - Vague market estimates score very low (1-5)
   - Basic understanding with some data scores medium (6-11)
   - Deep analysis with multiple data sources scores higher (12-16)
   
4) Customers: first_customers, accessibility, acquisition_approach, pain_recognition
   - No clear customer identification scores very low (1-4)
   - Generic target market scores low (5-9)
   - Specific, validated customer segments with proof of access scores medium-high (10-15)
   
5) Competition: direct_competitors, substitutes, differentiation_vs_players, dynamics
   - "No competition" or weak analysis scores very low (1-5)
   - Basic competitive understanding scores medium (6-11)
   - Deep competitive analysis with clear, defensible differentiation scores higher (12-16)
   
6) USP: clarity, differentiation_strength, defensibility, alignment_with_market
   - Vague or generic USP scores very low (1-6)
   - Clear but easily replicable USP scores medium (7-11)
   - Strong, defensible competitive advantage scores higher (12-16)
   
7) Tech: vision_ambition, coherence_clarity, strategic_alignment, realism, technical_feasibility, components_understanding, complexity_awareness, roadmap_execution
   - Unrealistic or vague tech plans score very low (1-6)
   - Realistic but basic tech approach scores medium (7-11)
   - Well-planned, feasible tech with clear roadmap scores higher (12-16)

SCORING DISTRIBUTION TARGET:
- 90% of criteria should score between 4-13
- Only 10% should score 14+ (and must have exceptional justification)
- Scores of 18+ should be almost never given
- Average overall score should typically be 7-11 for most startups

For each sub-criterion, be HIGHLY CRITICAL and justify low scores in the analysis_summary. The analysis_summary should be brutally honest, highlight all weaknesses, gaps, and risks. Recommendations should be 3-5 specific, actionable bullets addressing the most critical gaps. Do NOT include any extra fields.
`;

        const userPrompt = `Submission: ${JSON.stringify(submission)}`;

        let args: any = {};

        if (useMock) {
            // Deterministic mock evaluation based on submission text
            console.warn('LOVABLE_API_KEY not set — running mock evaluation for development.');
            const seed = (submission.startup_name || '') + '|' + (submission.problem_statement || '');
            const hash = Array.from(seed).reduce((acc: number, ch: string) => (acc + ch.charCodeAt(0)) % 10000, 0);
            const pick = (base: number, offset: number) => {
                // produce a value 8-18 deterministically
                const v = 8 + ((hash + base + offset) % 11);
                return Math.max(1, Math.min(20, v));
            };

            args = {
                existence: pick(1, 3), severity: pick(2, 5), frequency: pick(3, 1), unmet_need: pick(4, 2),
                direct_fit: pick(5, 4), differentiation: pick(6, 2), feasibility: pick(7, 3), effectiveness: pick(8, 1),
                market_size: pick(9, 2), growth_trajectory: pick(10, 4), timing_readiness: pick(11, 1), external_catalysts: pick(12, 2),
                first_customers: pick(13, 2), accessibility: pick(14, 3), acquisition_approach: pick(15, 1), pain_recognition: pick(16, 2),
                direct_competitors: pick(17, 3), substitutes: pick(18, 2), differentiation_vs_players: pick(19, 1), dynamics: pick(20, 2),
                usp_clarity: pick(21, 3), usp_differentiation_strength: pick(22, 2), usp_defensibility: pick(23, 1), usp_alignment: pick(24, 2),
                tech_vision_ambition: pick(25, 3), tech_coherence: pick(26, 2), tech_alignment: pick(27, 1), tech_realism: pick(28, 2),
                tech_feasibility: pick(29, 3), tech_components: pick(30, 2), tech_complexity_awareness: pick(31, 1), tech_roadmap: pick(32, 2),
                overall_average: null,
                analysis_summary: `Mock evaluation (LOVABLE_API_KEY not configured). Generated deterministic scores based on submission content.`,
                recommendations: `Mock recommendations: Run a small pilot; validate customer pain; verify technical adapters; refine go-to-market.`
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
                            description: 'Structured evaluation across many sub-criteria',
                            parameters: {
                                type: 'object',
                                properties: {
                                    // Problem
                                    existence: { type: 'integer' }, severity: { type: 'integer' }, frequency: { type: 'integer' }, unmet_need: { type: 'integer' },
                                    // Solution
                                    direct_fit: { type: 'integer' }, differentiation: { type: 'integer' }, feasibility: { type: 'integer' }, effectiveness: { type: 'integer' },
                                    // Market
                                    market_size: { type: 'integer' }, growth_trajectory: { type: 'integer' }, timing_readiness: { type: 'integer' }, external_catalysts: { type: 'integer' },
                                    // Customers
                                    first_customers: { type: 'integer' }, accessibility: { type: 'integer' }, acquisition_approach: { type: 'integer' }, pain_recognition: { type: 'integer' },
                                    // Competition
                                    direct_competitors: { type: 'integer' }, substitutes: { type: 'integer' }, differentiation_vs_players: { type: 'integer' }, dynamics: { type: 'integer' },
                                    // USP
                                    usp_clarity: { type: 'integer' }, usp_differentiation_strength: { type: 'integer' }, usp_defensibility: { type: 'integer' }, usp_alignment: { type: 'integer' },
                                    // Tech (aggregate group fields for brevity)
                                    tech_vision_ambition: { type: 'integer' }, tech_coherence: { type: 'integer' }, tech_alignment: { type: 'integer' }, tech_realism: { type: 'integer' },
                                    tech_feasibility: { type: 'integer' }, tech_components: { type: 'integer' }, tech_complexity_awareness: { type: 'integer' }, tech_roadmap: { type: 'integer' },
                                    // Overall averages and texts
                                    overall_average: { type: 'number' },
                                    analysis_summary: { type: 'string' },
                                    recommendations: { type: 'string' }
                                },
                                required: ['existence', 'severity', 'frequency', 'unmet_need', 'direct_fit', 'differentiation', 'feasibility', 'effectiveness', 'market_size', 'growth_trajectory', 'timing_readiness', 'external_catalysts', 'first_customers', 'accessibility', 'acquisition_approach', 'pain_recognition', 'direct_competitors', 'substitutes', 'differentiation_vs_players', 'dynamics', 'usp_clarity', 'usp_differentiation_strength', 'usp_defensibility', 'usp_alignment', 'tech_vision_ambition', 'tech_coherence', 'tech_alignment', 'tech_realism', 'tech_feasibility', 'tech_components', 'tech_complexity_awareness', 'tech_roadmap', 'analysis_summary', 'recommendations'],
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
            startup_name: submission.startup_name,
            problem_statement: submission.problem_statement,
            evaluator_user_id: evaluatorUserId,
            existence_score: clamp(args.existence),
            severity_score: clamp(args.severity),
            frequency_score: clamp(args.frequency),
            unmet_need_score: clamp(args.unmet_need),
            direct_fit_score: clamp(args.direct_fit),
            differentiation_score: clamp(args.differentiation),
            feasibility_score: clamp(args.feasibility),
            effectiveness_score: clamp(args.effectiveness),
            market_size_score: clamp(args.market_size),
            growth_trajectory_score: clamp(args.growth_trajectory),
            timing_readiness_score: clamp(args.timing_readiness),
            external_catalysts_score: clamp(args.external_catalysts),
            first_customers_score: clamp(args.first_customers),
            accessibility_score: clamp(args.accessibility),
            acquisition_approach_score: clamp(args.acquisition_approach),
            pain_recognition_score: clamp(args.pain_recognition),
            direct_competitors_score: clamp(args.direct_competitors),
            substitutes_score: clamp(args.substitutes),
            differentiation_vs_players_score: clamp(args.differentiation_vs_players),
            dynamics_score: clamp(args.dynamics),
            usp_clarity_score: clamp(args.usp_clarity),
            usp_differentiation_strength_score: clamp(args.usp_differentiation_strength),
            usp_defensibility_score: clamp(args.usp_defensibility),
            usp_alignment_score: clamp(args.usp_alignment),
            tech_vision_ambition_score: clamp(args.tech_vision_ambition),
            tech_coherence_score: clamp(args.tech_coherence),
            tech_alignment_score: clamp(args.tech_alignment),
            tech_realism_score: clamp(args.tech_realism),
            tech_feasibility_score: clamp(args.tech_feasibility),
            tech_components_score: clamp(args.tech_components),
            tech_complexity_awareness_score: clamp(args.tech_complexity_awareness),
            tech_roadmap_score: clamp(args.tech_roadmap),
            overall_average: parseFloat(args.overall_average) || null,
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
        console.error('Error in evaluate-submission:', error);
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
}

// Serve wrapper uses the exported handler so other functions can import it for compatibility
serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    const payload = await req.json().catch(() => ({}));
    return await evaluateSubmissionHandler(payload, req.headers.get('Authorization'));
});
