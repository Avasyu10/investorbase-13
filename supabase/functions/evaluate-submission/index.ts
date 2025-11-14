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

        // Build system prompt with scoring rubric - THREE-TIER BALANCED RANKING
        const systemPrompt = `You are a startup evaluator tasked with ranking submissions into three clear categories: HIGH (15-20), MEDIUM (10-14), and LOW (1-9). Your scoring must be consistent, rigorous, and reward true innovation with concrete evidence.

CORE EVALUATION PRINCIPLES:
1. INNOVATION & UNIQUENESS: Only truly unique, non-traditional ideas with clear differentiation deserve higher scores. Generic or slightly modified solutions should score lower.
2. DETAIL & EVIDENCE: Concrete data, customer validation, and specific examples are required for high scores. General claims without evidence score lower.
3. CLARITY OF THOUGHT: Clear problem-solution fit with logical, well-structured reasoning scores higher. Vague or incomplete thinking scores lower.
4. CONSISTENCY: Apply rigorous standards uniformly. HIGH tier should be reserved for truly exceptional startups.

THREE-TIER SCORING SYSTEM:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HIGH TIER (15-20): Truly exceptional startups (~20-25% of submissions)
- Highly innovative with clear, defensible differentiation from existing solutions
- Extensive evidence: customer validation, market data, competitive analysis with specifics
- Strong problem-solution fit backed by concrete examples and metrics
- Comprehensive execution plan with realistic milestones and clear go-to-market strategy
- Deep technical understanding with viable architecture
- Example: AI-powered vertical solution with 50+ paying customers, detailed competitive moats, and proven traction

MEDIUM TIER (10-14): Solid startups with potential (~40-50% of submissions)
- Reasonable idea with some differentiation, but not groundbreaking
- Moderate detail - some evidence present but significant gaps remain
- Problem-solution fit is logical but needs more validation
- Execution plan exists but lacks depth in key areas
- Example: E-commerce platform with some unique features, basic market research, and initial customer interest

LOW TIER (1-9): Weak, generic, or incomplete submissions (~30-40% of submissions)
- Generic, copycat, or no clear differentiation from existing solutions
- Minimal detail, mostly vague claims without supporting evidence
- Unclear or weak problem-solution fit, poorly defined target market
- Missing or unrealistic execution plans, no measurable goals
- Example: "Uber for X" with no differentiation, no customer validation, vague tech approach
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCORING CRITERIA (Apply to all 7 groups):

1) Problem Statement: existence, severity, frequency, unmet_need
   HIGH (15-20): Novel problem identification, strong evidence of severity/frequency, clear unmet need with data
   MEDIUM (10-14): Identified problem with some evidence, reasonable severity/frequency claims
   LOW (1-9): Generic problem, no evidence, unclear if problem truly exists or matters

2) Solution: direct_fit, differentiation, feasibility, effectiveness
   HIGH (15-20): Innovative solution, strong differentiation, clear feasibility plan, proven effectiveness
   MEDIUM (10-14): Reasonable solution, some differentiation, feasible but needs work
   LOW (1-9): Generic/copycat solution, no clear differentiation, unrealistic or ineffective

3) Market Understanding: market_size, growth_trajectory, timing_readiness, external_catalysts
   HIGH (15-20): Detailed TAM/SAM/SOM analysis, growth data, perfect timing, clear catalysts
   MEDIUM (10-14): Basic market sizing, reasonable growth claims, decent timing
   LOW (1-9): No market data, vague claims, poor timing, no catalysts identified

4) Customers: first_customers, accessibility, acquisition_approach, pain_recognition
   HIGH (15-20): Validated customer segments, paying users, clear acquisition plan, deep pain understanding
   MEDIUM (10-14): Identified customers, reasonable access plan, basic pain recognition
   LOW (1-9): Unclear target, no validation, no acquisition plan, weak pain understanding

5) Competition: direct_competitors, substitutes, differentiation_vs_players, dynamics
   HIGH (15-20): Thorough competitive landscape, clear differentiation, understanding of dynamics
   MEDIUM (10-14): Aware of competitors, some differentiation, basic competitive understanding
   LOW (1-9): No competitive analysis, no differentiation, ignores competition

6) USP: clarity, differentiation_strength, defensibility, alignment_with_market
   HIGH (15-20): Crystal clear USP, strong moats, highly defensible, perfect market alignment
   MEDIUM (10-14): Defined USP, some defensibility, reasonable market fit
   LOW (1-9): Unclear USP, no moats, weak defensibility, poor market alignment

7) Tech: vision_ambition, coherence_clarity, strategic_alignment, realism, technical_feasibility, components_understanding, complexity_awareness, roadmap_execution
   HIGH (15-20): Ambitious but realistic vision, clear tech stack, strong roadmap, deep understanding
   MEDIUM (10-14): Reasonable tech approach, some clarity, feasible plan
   LOW (1-9): Vague tech vision, no stack details, unrealistic or no roadmap

CONSISTENCY RULES:
- If a startup shows innovation across multiple areas → bias towards HIGH tier
- If a startup is detailed in all sections → add 1-2 points per criterion
- If a startup is vague or generic → bias towards LOW tier
- If a startup copies existing solutions without differentiation → cap scores at MEDIUM tier maximum
- Balance: Don't give HIGH to everything, but recognize true innovation when you see it

OUTPUT REQUIREMENTS:
- analysis_summary: 3-4 sentences explaining tier placement and key strengths/weaknesses
- recommendations: 3-5 specific, actionable bullets for improvement
- Ensure overall_average reflects the tier (HIGH: 15-20, MEDIUM: 10-14, LOW: 1-9)
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
