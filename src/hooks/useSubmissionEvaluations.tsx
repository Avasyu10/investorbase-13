import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SubmissionEvaluation {
    id: string;
    startup_name: string;
    problem_statement: string;
    overall_average: number | null;
    ai_analysis_summary: string | null;
    ai_recommendations: string | null;
    created_at: string;
}

export const useSubmissionEvaluations = () => {
    return useQuery({
        queryKey: ['submission-evaluations'],
        queryFn: async () => {
            // Try direct select first (preferred). If RLS or auth blocks us, fallback to service function.
            try {
                const res = await (supabase as any)
                    .from('submission_evaluations')
                    .select('id, startup_name, problem_statement, overall_average, ai_analysis_summary, ai_recommendations, created_at')
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
