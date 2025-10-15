import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSubmissionEvaluations, SubmissionEvaluation } from "@/hooks/useSubmissionEvaluations";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CompanyInfoCard } from "@/components/companies/CompanyInfoCard";
import FormResponsesDialog from "@/components/companies/FormResponsesDialog";
import SubmissionDetailsDialog from "@/components/companies/SubmissionDetailsDialog";

type Submission = {
    id?: string;
    startup_name?: string;
    founder_email?: string;
    linkedin_profile_url?: string | null;
    problem_statement?: string;
    solution?: string;
    market_understanding?: string;
    customer_understanding?: string;
    competitive_understanding?: string;
    unique_selling_proposition?: string;
    technical_understanding?: string;
    vision?: string;
    created_at?: string;
};

type Evaluation = Record<string, number | string | null | undefined> | null;

const SubmissionDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [submission, setSubmission] = useState<Submission | null>(null);
    const [evaluation, setEvaluation] = useState<Evaluation>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { data: allEvaluations } = useSubmissionEvaluations();
    const [companyId, setCompanyId] = useState<string | null>(null);

    type EvalWithSubmissionId = SubmissionEvaluation & { startup_submission_id?: string | null };

    useEffect(() => {
        if (!id) return;
        const fetch = async () => {
            setIsLoading(true);
            try {
                const { data: submissionData, error: subErr } = await supabase
                    .from<Submission>('startup_submissions')
                    .select('*')
                    .eq('id', id)
                    .single();
                if (subErr) {
                    console.error('submission fetch error', subErr);
                }
                setSubmission(submissionData ?? null);
                // Try to find an associated company record for form responses
                try {
                    const { data: companiesByStartupId } = await supabase
                        .from('companies')
                        .select('id')
                        .or(`startup_id.eq.${id},startupstudio_id.eq.${id}`)
                        .limit(1);
                    if (companiesByStartupId && companiesByStartupId.length > 0) {
                        setCompanyId(companiesByStartupId[0].id);
                    } else {
                        const { data: companiesByName } = await supabase
                            .from('companies')
                            .select('id')
                            .ilike('name', submissionData?.startup_name ?? '')
                            .limit(1);
                        if (companiesByName && companiesByName.length > 0) setCompanyId(companiesByName[0].id);
                    }
                } catch (e) {
                    // ignore
                }

                // 1) Try to find evaluation from the cached hook data (this handles RLS/fallback logic centralized in the hook)
                if (allEvaluations && allEvaluations.length > 0) {
                    const list = allEvaluations as EvalWithSubmissionId[];
                    const found = list.find((e) => e.startup_submission_id === id || e.startup_name === submissionData?.startup_name) ?? null;
                    setEvaluation(found ?? null);
                    setIsLoading(false);
                    return;
                }

                // 2) Fallback: try direct select (may be blocked by RLS)
                try {
                    const { data: evalData, error: evalErr } = await supabase
                        .from('submission_evaluations')
                        .select('*')
                        .eq('startup_submission_id', id)
                        .limit(1);
                    if (evalErr) console.warn('evaluation fetch error (direct):', evalErr);
                    const picked = (evalData && evalData.length > 0) ? evalData[0] as Evaluation : null;
                    if (picked) {
                        setEvaluation(picked);
                        setIsLoading(false);
                        return;
                    }
                } catch (directErr) {
                    console.warn('Direct evaluation select failed:', directErr);
                }

                // 3) Final fallback: invoke edge function that returns evaluations (mirrors logic in hook)
                try {
                    const { data: sessionData } = await supabase.auth.getSession();
                    const token = sessionData?.session?.access_token;
                    const invokeOptions: { headers?: Record<string, string> } = {};
                    if (token) invokeOptions.headers = { Authorization: `Bearer ${token}` };

                    // Call functions.invoke in a typed manner (supabase client typings can vary across versions)
                    const fnClient = (supabase as unknown as { functions?: { invoke: (fn: string, opts?: { headers?: Record<string, string> }) => Promise<unknown> } }).functions;
                    if (!fnClient) throw new Error('Edge functions client not available');
                    const resp = await fnClient.invoke('get-submission-evaluations', invokeOptions);

                    // resp may be { data, error } or raw array; normalize safely without using `any`
                    let funcsData: unknown = resp;
                    if (resp && typeof resp === 'object' && resp !== null && 'data' in (resp as Record<string, unknown>)) {
                        funcsData = (resp as Record<string, unknown>).data;
                    }

                    let list: EvalWithSubmissionId[] = [];
                    if (Array.isArray(funcsData)) {
                        list = funcsData as EvalWithSubmissionId[];
                    } else if (funcsData && typeof funcsData === 'object' && 'data' in (funcsData as Record<string, unknown>)) {
                        const inner = (funcsData as Record<string, unknown>).data;
                        if (Array.isArray(inner)) list = inner as EvalWithSubmissionId[];
                    }
                    const found = list.find((e) => e.startup_submission_id === id || e.startup_name === submissionData?.startup_name) ?? null;
                    setEvaluation(found ?? null);
                } catch (fnErr) {
                    console.warn('Function fallback failed:', fnErr);
                    setEvaluation(null);
                }
            } catch (err) {
                console.error('fetch error', err);
                toast({ title: 'Error', description: 'Failed to load submission details', variant: 'destructive' });
            } finally {
                setIsLoading(false);
            }
        };
        fetch();
    }, [id, toast, allEvaluations]);

    if (!id) return <div className="p-8">Invalid submission id</div>;

    // Compute an overall score if present or average of scores
    const overallScore = (() => {
        if (!evaluation) return null;
        if (evaluation['overall_average'] != null) return Number(evaluation['overall_average']);
        // average numeric _score fields
        const scoreKeys = Object.keys(evaluation).filter(k => k.endsWith('_score') && typeof evaluation[k] === 'number');
        if (scoreKeys.length === 0) return null;
        const sum = scoreKeys.reduce((acc, k) => acc + Number(evaluation[k]), 0);
        return sum / scoreKeys.length;
    })();

    return (
        <div className="min-h-screen w-full flex flex-col bg-[#0c0e18]">
            <div className="container mx-auto py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white">{submission?.startup_name ?? 'Submission Details'}</h1>
                        <p className="text-gray-400 mt-1">View submission and evaluation details</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {overallScore != null && <div className="text-right">
                            <div className="text-sm text-gray-400">Overall Score</div>
                            <div className="text-2xl font-bold text-white">{Number(overallScore).toFixed(1)}/20</div>
                        </div>}
                        <button onClick={() => navigate(-1)} className="px-4 py-2 rounded bg-[#111422] text-white">Back</button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center py-12 text-gray-400">Loading...</div>
                ) : (
                    <>
                        {/* Top Overview card */}
                        <div className="mb-6">
                            <Card className="bg-[#111422] border-none">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">Company Overview</h2>
                                            <p className="text-gray-400 mt-2 max-w-3xl">{submission?.problem_statement ? `${submission.problem_statement.trim()} ` : ''}{submission?.solution ? submission.solution.trim() : ''}</p>
                                            <div className="mt-4 text-sm text-gray-400 flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-yellow-400">📁</span>
                                                    <span>Stage</span>
                                                </div>
                                                <div className="text-white">Early Revenue Stage</div>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <button onClick={() => navigate(-1)} className="px-4 py-2 rounded bg-[#111422] text-white">Back</button>
                                            {/* Show submission details dialog (fetches startup_submissions by id) */}
                                            {id ? (
                                                <SubmissionDetailsDialog submissionId={id} />
                                            ) : null}
                                            {companyId ? (
                                                <FormResponsesDialog companyId={companyId} />
                                            ) : (
                                                <button
                                                    onClick={() => toast({ title: 'No form responses', description: 'No associated company or form responses found', variant: 'default' })}
                                                    className="px-4 py-2 rounded border border-[#27303a] text-white"
                                                >
                                                    View Form Responses
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Progress bar */}
                        <div className="h-3 bg-[#111422] rounded-full mb-6">
                            {/* width bucketed to avoid inline style lint rule */}
                            {(() => {
                                const pct = Math.max(0, Math.min(100, Math.round((overallScore ?? 0) * 5)));
                                if (pct === 0) return <div className="h-3 rounded-full bg-[rgb(245,168,61)] w-0" />;
                                if (pct <= 25) return <div className="h-3 rounded-full bg-[rgb(245,168,61)] w-1/4" />;
                                if (pct <= 50) return <div className="h-3 rounded-full bg-[rgb(245,168,61)] w-1/2" />;
                                if (pct <= 75) return <div className="h-3 rounded-full bg-[rgb(245,168,61)] w-3/4" />;
                                return <div className="h-3 rounded-full bg-[rgb(245,168,61)] w-full" />;
                            })()}
                        </div>

                        {/* Overall Assessment card */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                <Card className="bg-[#111422] border-none">
                                    <CardContent className="p-6">
                                        <h3 className="text-xl font-bold mb-4 text-white">Overall Assessment</h3>
                                        <div className="space-y-4 text-sm text-gray-200">
                                            {/* Bulleted explanations derived from AI analysis summary or fallback */}
                                            {(evaluation && evaluation['ai_analysis_summary']) ? (
                                                (String(evaluation['ai_analysis_summary']).split(/\n|\.|!/) || []).filter(Boolean).slice(0, 5).map((line, i) => (
                                                    <div key={i} className="flex gap-3 items-start">
                                                        <div className="text-yellow-400 mt-1">💡</div>
                                                        <div>{line.trim()}</div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="flex gap-3 items-start">
                                                    <div className="text-yellow-400 mt-1">💡</div>
                                                    <div>The submission has not been evaluated yet or no AI analysis is available.</div>
                                                </div>
                                            )}
                                            {/* AI Recommendations formatted as numbered list */}
                                            {evaluation && evaluation['ai_recommendations'] && (
                                                <div className="mt-4">
                                                    <h4 className="font-semibold mb-2 text-white">AI Recommendations</h4>
                                                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-200">
                                                        {(() => {
                                                            const raw = String(evaluation['ai_recommendations']);
                                                            let items: string[] = [];
                                                            if (/\d+\./.test(raw)) {
                                                                items = raw.split(/\d+\.\s*/).filter(Boolean).map(s => s.trim());
                                                            } else {
                                                                items = raw.split(/\r?\n/).filter(Boolean).map(s => s.trim());
                                                            }
                                                            return items.map((it, idx) => <li key={idx}>{it}</li>);
                                                        })()}
                                                    </ol>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div>
                                <Card className="bg-[#111422] border-none h-full flex flex-col">
                                    <CardContent className="p-6 flex-1 flex flex-col justify-between">
                                        <div>
                                            <h4 className="text-sm text-gray-400">Overall Score</h4>
                                            <div className="text-4xl font-bold text-orange-500 mt-4">{evaluation && evaluation['overall_average'] != null ? Math.round(Number(evaluation['overall_average']) * 5) : Math.round((overallScore ?? 0) * 5)}/100</div>
                                        </div>
                                        <div className="text-sm text-gray-400 mt-4">{evaluation && evaluation['ai_recommendations'] ? String(evaluation['ai_recommendations']) : ''}</div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Scores breakdown full-width below assessment */}
                        <div className="mt-6">
                            <Card className="bg-[#111422] border-none">
                                <CardContent className="p-6">
                                    <h3 className="text-xl font-bold mb-4 text-white">Score Breakdown</h3>
                                    {evaluation ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {Object.keys(evaluation).filter(k => k.endsWith('_score')).sort().map((k) => {
                                                const raw = evaluation[k];
                                                const num = raw == null ? null : Number(raw);
                                                const pct = num == null ? 0 : Math.round((num / 20) * 100);
                                                return (
                                                    <div key={k} className="bg-background/20 p-3 rounded flex items-center justify-between">
                                                        <div className="text-sm text-muted-foreground">{k.replace(/_/g, ' ')}</div>
                                                        <div className="flex items-center gap-4">
                                                            <div className="text-sm font-semibold text-white">{num != null ? `${num}/20` : '—'}</div>
                                                            <div className="w-28 h-2 bg-gray-700 rounded overflow-hidden">
                                                                {(() => {
                                                                    if (pct === 0) return <div className="h-2 bg-green-400 w-0" />;
                                                                    if (pct <= 25) return <div className="h-2 bg-green-400 w-1/4" />;
                                                                    if (pct <= 50) return <div className="h-2 bg-green-400 w-1/2" />;
                                                                    if (pct <= 75) return <div className="h-2 bg-green-400 w-3/4" />;
                                                                    return <div className="h-2 bg-green-400 w-full" />;
                                                                })()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-gray-400">No evaluation scores available.</div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default SubmissionDetail;
