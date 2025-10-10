import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SubmissionEvaluation {
    id: string;
    startup_name: string | null;
    problem_statement: string;
    evaluator_user_id: string;
    created_at: string;
    existence_score: number | null;
    severity_score: number | null;
    frequency_score: number | null;
    unmet_need_score: number | null;
    direct_fit_score: number | null;
    differentiation_score: number | null;
    feasibility_score: number | null;
    effectiveness_score: number | null;
    market_size_score: number | null;
    growth_trajectory_score: number | null;
    timing_readiness_score: number | null;
    external_catalysts_score: number | null;
    first_customers_score: number | null;
    accessibility_score: number | null;
    acquisition_approach_score: number | null;
    pain_recognition_score: number | null;
    direct_competitors_score: number | null;
    substitutes_score: number | null;
    differentiation_vs_players_score: number | null;
    dynamics_score: number | null;
    usp_clarity_score: number | null;
    usp_differentiation_strength_score: number | null;
    usp_defensibility_score: number | null;
    usp_alignment_score: number | null;
    tech_vision_ambition_score: number | null;
    tech_coherence_score: number | null;
    tech_alignment_score: number | null;
    tech_realism_score: number | null;
    tech_feasibility_score: number | null;
    tech_components_score: number | null;
    tech_complexity_awareness_score: number | null;
    tech_roadmap_score: number | null;
    overall_average: number | null;
    ai_analysis_summary: string | null;
    ai_recommendations: string | null;
}

export const useSubmissionEvaluations = () => {
    return useQuery({
        queryKey: ['submission-evaluations'],
        queryFn: async () => {
            // Try direct select first (preferred). If RLS or auth blocks us, fallback to service function.
            try {
                const res = await (supabase as any)
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
                    .order('created_at', { ascending: false });

                const { data, error } = res as any;
                if (error) throw error;
                return data as SubmissionEvaluation[];
            } catch (err) {
                console.warn('Direct read of submission_evaluations failed, attempting service function fallback:', err);
                try {
                    // Try to get an access token from the client session so the function sees the user as authenticated
                    const { data: sessionData } = await (supabase as any).auth.getSession();
                    const token = sessionData?.session?.access_token;

                    const invokeOptions: any = {};
                    if (token) invokeOptions.headers = { Authorization: `Bearer ${token}` };

                    const resp = await (supabase as any).functions.invoke('get-submission-evaluations', invokeOptions);

                    // supabase.functions.invoke can return { data, error } or throw; handle both
                    if (resp?.error) {
                        console.error('get-submission-evaluations returned error:', resp.error);
                        throw resp.error;
                    }

                    // data may be wrapped as { data } by the function response
                    const funcsData = resp?.data ?? resp;
                    return (funcsData?.data ?? funcsData ?? []) as SubmissionEvaluation[];
                } catch (fnErr: any) {
                    console.error('Service function fallback failed:', fnErr);
                    const message = fnErr?.message || JSON.stringify(fnErr) || '';

                    // Common supabase-js client error when functions are not reachable or not deployed:
                    // "Failed to send a request to the Edge Function". Treat this as non-fatal for the UI.
                    if (message.includes('Failed to send a request') || message.includes('Edge Function') || message.includes('network')) {
                        console.warn('Edge function invocation appears unreachable; returning empty evaluations. Deploy functions or check network. Error:', message);
                        return [] as SubmissionEvaluation[];
                    }

                    // Otherwise rethrow so the UI shows the error
                    throw new Error(`Failed to load evaluations: ${message}`);
                }
            }
        }
    });
};
