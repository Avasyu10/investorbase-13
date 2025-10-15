import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSubmissionEvaluations, SubmissionEvaluation } from "@/hooks/useSubmissionEvaluations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, Mail, Linkedin, TrendingUp, Lightbulb, Target, Users, Award, Globe, Newspaper, TrendingUpIcon, Zap, ShieldCheck } from "lucide-react";
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

type Evaluation = Record<string, unknown> | null;

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
                    .from('startup_submissions')
                    .select('*')
                    .eq('id', id)
                    .single();
                if (subErr) {
                    console.error('submission fetch error', subErr);
                    setIsLoading(false);
                    return;
                }
                setSubmission(submissionData as Submission);
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
                if (allEvaluations && allEvaluations.length > 0 && submissionData) {
                    const list = allEvaluations as EvalWithSubmissionId[];
                    const found = list.find((e) => e.startup_submission_id === id || e.startup_name === submissionData.startup_name) ?? null;
                    setEvaluation(found as unknown as Evaluation);
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
                    setEvaluation(found as unknown as Evaluation);
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

    const getScoreColor = (score: number) => {
        const normalizedScore = (score / 20) * 5; // Convert to 5-point scale
        if (normalizedScore >= 4.0) return "bg-emerald-500";
        if (normalizedScore >= 3.0) return "bg-green-500";
        if (normalizedScore >= 2.0) return "bg-yellow-500";
        if (normalizedScore >= 1.0) return "bg-orange-500";
        return "bg-red-500";
    };

    return (
        <div className="min-h-screen bg-[#0f1729]">
            <div className="container mx-auto px-4 py-6 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(-1)}
                            className="flex items-center border-[#2a3447] hover:bg-[#1a2332]"
                        >
                            <ChevronLeft className="mr-1 h-4 w-4" /> Back
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-white">{submission?.startup_name ?? 'Submission Details'}</h1>
                            <p className="text-gray-400 mt-1">Comprehensive evaluation and analysis</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {overallScore != null && (
                            <div className="text-right px-4 py-2 bg-[#1a2332] rounded-lg border border-[#2a3447]">
                                <div className="text-sm text-gray-400">Overall Score</div>
                                <div className="text-2xl font-bold text-[#f59e0b]">{Number(overallScore).toFixed(1)}/20</div>
                            </div>
                        )}
                        {id && <SubmissionDetailsDialog submissionId={id} />}
                        {companyId && <FormResponsesDialog companyId={companyId} />}
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-pulse space-y-4 w-full max-w-4xl">
                            <div className="h-8 bg-[#1a2332] rounded w-1/3"></div>
                            <div className="h-4 bg-[#1a2332] rounded w-full"></div>
                            <div className="h-4 bg-[#1a2332] rounded w-2/3"></div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Submission Categories */}
                        <h2 className="text-2xl font-bold text-[#f59e0b] mb-6">Submission Categories</h2>
                        
                        <div className="space-y-4 mb-8">
                            {/* Problem & Solution - Highlighted */}
                            <div className="bg-[#1a2332] border-2 border-[#f59e0b] rounded-lg p-5">
                                <div className="flex items-start gap-3 mb-3">
                                    <Target className="h-6 w-6 text-[#f59e0b] mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-white mb-2">Problem & Solution</h3>
                                        <p className="text-gray-400 text-sm leading-relaxed">
                                            Comprehensive problem statement and innovative solution approach.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Market Understanding */}
                            <div className="bg-[#1a2332] border border-[#2a3447] rounded-lg p-5">
                                <div className="flex items-start gap-3">
                                    <Globe className="h-6 w-6 text-[#10b981] mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-white mb-2">Market Research</h3>
                                        <p className="text-gray-400 text-sm leading-relaxed">
                                            Market size, trends, and competitive landscape analysis.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Customer Understanding */}
                            <div className="bg-[#1a2332] border border-[#2a3447] rounded-lg p-5">
                                <div className="flex items-start gap-3">
                                    <Users className="h-6 w-6 text-[#10b981] mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-white mb-2">Customer Insights</h3>
                                        <p className="text-gray-400 text-sm leading-relaxed">
                                            Deep understanding of customer needs, behaviors, and pain points.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Competitive Analysis */}
                            <div className="bg-[#1a2332] border border-[#2a3447] rounded-lg p-5">
                                <div className="flex items-start gap-3">
                                    <TrendingUpIcon className="h-6 w-6 text-[#f59e0b] mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-white mb-2">Competitive Advantage</h3>
                                        <p className="text-gray-400 text-sm leading-relaxed">
                                            Unique positioning and differentiation in the market landscape.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Summary Section */}
                        <h2 className="text-2xl font-bold text-[#f59e0b] mb-6">Submission Summary</h2>
                        
                        <div className="bg-[#1a2332] border border-[#2a3447] rounded-lg p-6 mb-8">
                            <div className="space-y-6 text-white">
                                {/* Problem Statement */}
                                {submission?.problem_statement && (
                                    <div>
                                        <p className="text-base leading-relaxed">{submission.problem_statement}</p>
                                    </div>
                                )}

                                {/* Solution */}
                                {submission?.solution && (
                                    <div>
                                        <p className="text-base leading-relaxed">{submission.solution}</p>
                                    </div>
                                )}

                                {/* Market Analysis */}
                                {submission?.market_understanding && (
                                    <div>
                                        <p className="text-gray-300 text-base leading-relaxed">{submission.market_understanding}</p>
                                    </div>
                                )}

                                {/* Customer Understanding */}
                                {submission?.customer_understanding && (
                                    <div>
                                        <p className="text-gray-300 text-base leading-relaxed">{submission.customer_understanding}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Key Highlights */}
                        <h3 className="text-xl font-bold text-white mb-4">Key Highlights:</h3>
                        <div className="bg-[#1a2332] border border-[#2a3447] rounded-lg p-6 mb-8">
                            <div className="space-y-4">
                                {/* Competitive Advantage */}
                                {submission?.competitive_understanding && (
                                    <div className="flex items-start gap-3">
                                        <span className="text-white font-bold flex-shrink-0">*</span>
                                        <div>
                                            <span className="text-white font-semibold">Competitive Landscape: </span>
                                            <span className="text-gray-300">{submission.competitive_understanding}</span>
                                        </div>
                                    </div>
                                )}

                                {/* USP */}
                                {submission?.unique_selling_proposition && (
                                    <div className="flex items-start gap-3">
                                        <span className="text-white font-bold flex-shrink-0">*</span>
                                        <div>
                                            <span className="text-white font-semibold">Unique Value Proposition: </span>
                                            <span className="text-gray-300">{submission.unique_selling_proposition}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Technical Understanding */}
                                {submission?.technical_understanding && (
                                    <div className="flex items-start gap-3">
                                        <span className="text-white font-bold flex-shrink-0">*</span>
                                        <div>
                                            <span className="text-white font-semibold">Technical Capability: </span>
                                            <span className="text-gray-300">{submission.technical_understanding}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Vision */}
                                {submission?.vision && (
                                    <div className="flex items-start gap-3">
                                        <span className="text-white font-bold flex-shrink-0">*</span>
                                        <div>
                                            <span className="text-white font-semibold">Long-term Vision: </span>
                                            <span className="text-gray-300">{submission.vision}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            <div className="bg-[#1a2332] border border-[#2a3447] rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <Mail className="h-5 w-5 text-[#f59e0b] mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-400">Contact Email</p>
                                        <p className="text-sm text-white truncate">{submission?.founder_email || 'Not provided'}</p>
                                    </div>
                                </div>
                            </div>

                            {submission?.linkedin_profile_url && (
                                <div className="bg-[#1a2332] border border-[#2a3447] rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <Linkedin className="h-5 w-5 text-[#f59e0b] mt-0.5" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-400">LinkedIn Profile</p>
                                            <a 
                                                href={submission.linkedin_profile_url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-sm text-[#f59e0b] hover:underline truncate block"
                                            >
                                                View Profile
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="bg-[#1a2332] border border-[#2a3447] rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <TrendingUp className="h-5 w-5 text-[#f59e0b] mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-400">Submission Date</p>
                                        <p className="text-sm text-white">
                                            {submission?.created_at ? new Date(submission.created_at).toLocaleDateString() : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* AI Evaluation Section */}
                        {evaluation && (
                            <>
                                <h2 className="text-2xl font-bold text-[#f59e0b] mb-6">AI Evaluation</h2>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                                    {/* AI Analysis */}
                                    <div className="lg:col-span-2 bg-[#1a2332] border border-[#2a3447] rounded-lg p-6">
                                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                            <Lightbulb className="h-5 w-5 text-[#f59e0b]" />
                                            Analysis Summary
                                        </h3>
                                        {evaluation['ai_analysis_summary'] ? (
                                            <div className="space-y-3 text-gray-300">
                                                {String(evaluation['ai_analysis_summary']).split(/\n|\.|!/).filter(Boolean).slice(0, 5).map((line, i) => (
                                                    <div key={i} className="flex gap-3 items-start">
                                                        <span className="text-[#f59e0b] mt-1">•</span>
                                                        <p className="text-sm leading-relaxed">{line.trim()}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-400 text-sm">
                                                No AI analysis available yet.
                                            </p>
                                        )}
                                        
                                        {evaluation['ai_recommendations'] && (
                                            <div className="mt-6 pt-6 border-t border-[#2a3447]">
                                                <h4 className="font-semibold text-white mb-3">Recommendations:</h4>
                                                <div className="space-y-2">
                                                    {(() => {
                                                        const raw = String(evaluation['ai_recommendations']);
                                                        let items: string[] = [];
                                                        if (/\d+\./.test(raw)) {
                                                            items = raw.split(/\d+\.\s*/).filter(Boolean).map(s => s.trim());
                                                        } else {
                                                            items = raw.split(/\r?\n/).filter(Boolean).map(s => s.trim());
                                                        }
                                                        return items.map((it, idx) => (
                                                            <div key={idx} className="flex gap-3 items-start">
                                                                <span className="text-white font-bold flex-shrink-0">*</span>
                                                                <p className="text-sm text-gray-300 leading-relaxed">{it}</p>
                                                            </div>
                                                        ));
                                                    })()}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Score Card */}
                                    <div className="bg-[#1a2332] border border-[#2a3447] rounded-lg p-6 flex flex-col items-center justify-center">
                                        <h3 className="text-lg font-semibold text-white mb-6">Overall Score</h3>
                                        <div className="text-center">
                                            <div className="text-6xl font-bold text-[#f59e0b] mb-2">
                                                {evaluation['overall_average'] != null 
                                                    ? Math.round(Number(evaluation['overall_average']) * 5) 
                                                    : Math.round((overallScore ?? 0) * 5)}
                                            </div>
                                            <p className="text-gray-400 text-sm">out of 100</p>
                                            <Badge 
                                                className="mt-4 bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]"
                                            >
                                                {((overallScore ?? 0) / 20) >= 4.0 ? 'Excellent' :
                                                 ((overallScore ?? 0) / 20) >= 3.0 ? 'Good' :
                                                 ((overallScore ?? 0) / 20) >= 2.0 ? 'Average' :
                                                 ((overallScore ?? 0) / 20) >= 1.0 ? 'Below Average' : 'Needs Improvement'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Detailed Score Breakdown */}
                        {evaluation && Object.keys(evaluation).filter(k => k.endsWith('_score')).length > 0 && (
                            <>
                                <h2 className="text-2xl font-bold text-[#f59e0b] mb-6">Score Breakdown</h2>
                                <div className="bg-[#1a2332] border border-[#2a3447] rounded-lg p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {Object.keys(evaluation).filter(k => k.endsWith('_score')).sort().map((k) => {
                                            const raw = evaluation[k];
                                            const num = raw == null ? null : Number(raw);
                                            const pct = num == null ? 0 : Math.round((num / 20) * 100);
                                            return (
                                                <div key={k} className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-medium text-white capitalize">
                                                            {k.replace(/_/g, ' ').replace(' score', '')}
                                                        </span>
                                                        <Badge className="bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]">
                                                            {num != null ? `${num}/20` : 'N/A'}
                                                        </Badge>
                                                    </div>
                                                    <div className="w-full bg-[#0f1729] rounded-full h-2">
                                                        <div 
                                                            className="bg-[#f59e0b] h-2 rounded-full transition-all"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default SubmissionDetail;
