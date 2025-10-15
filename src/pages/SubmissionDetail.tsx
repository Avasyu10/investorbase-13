import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSubmissionEvaluations, SubmissionEvaluation } from "@/hooks/useSubmissionEvaluations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, Mail, Linkedin, User, TrendingUp, Lightbulb, Target, Users, Award } from "lucide-react";
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
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-6 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(-1)}
                            className="flex items-center"
                        >
                            <ChevronLeft className="mr-1 h-4 w-4" /> Back
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">{submission?.startup_name ?? 'Submission Details'}</h1>
                            <p className="text-muted-foreground mt-1">Comprehensive evaluation and analysis</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {overallScore != null && (
                            <div className="text-right px-4 py-2 bg-card rounded-lg border shadow-sm">
                                <div className="text-sm text-muted-foreground">Overall Score</div>
                                <div className="text-2xl font-bold">{Number(overallScore).toFixed(1)}/20</div>
                            </div>
                        )}
                        {id && <SubmissionDetailsDialog submissionId={id} />}
                        {companyId && <FormResponsesDialog companyId={companyId} />}
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-pulse space-y-4 w-full max-w-4xl">
                            <div className="h-8 bg-muted rounded w-1/3"></div>
                            <div className="h-4 bg-muted rounded w-full"></div>
                            <div className="h-4 bg-muted rounded w-2/3"></div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Contact & Founder Information */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <Card className="border-0 shadow-card">
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                        <Mail className="h-5 w-5 text-primary mt-0.5" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium">Contact Email</p>
                                            <p className="text-sm text-muted-foreground truncate">{submission?.founder_email || 'Not provided'}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {submission?.linkedin_profile_url && (
                                <Card className="border-0 shadow-card">
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <Linkedin className="h-5 w-5 text-primary mt-0.5" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium">LinkedIn Profile</p>
                                                <a 
                                                    href={submission.linkedin_profile_url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-primary hover:underline truncate block"
                                                >
                                                    View Profile
                                                </a>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            <Card className="border-0 shadow-card">
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                        <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium">Submission Date</p>
                                            <p className="text-sm text-muted-foreground">
                                                {submission?.created_at ? new Date(submission.created_at).toLocaleDateString() : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Main Content Card */}
                        <Card className="border-0 shadow-card mb-6">
                            <CardContent className="p-6">
                                <div className="mb-6">
                                    <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                                        <Target className="h-5 w-5 text-primary" />
                                        Problem & Solution
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <Badge variant="outline" className="mb-2">Problem Statement</Badge>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {submission?.problem_statement || 'Not provided'}
                                            </p>
                                        </div>
                                        <div>
                                            <Badge variant="outline" className="mb-2">Solution</Badge>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {submission?.solution || 'Not provided'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t pt-6 mb-6">
                                    <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                                        <Users className="h-5 w-5 text-primary" />
                                        Market & Customer Understanding
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Badge variant="secondary" className="mb-2">Market</Badge>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {submission?.market_understanding || 'Not provided'}
                                            </p>
                                        </div>
                                        <div>
                                            <Badge variant="secondary" className="mb-2">Customer</Badge>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {submission?.customer_understanding || 'Not provided'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t pt-6">
                                    <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                                        <Award className="h-5 w-5 text-primary" />
                                        Competitive Advantage
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Badge variant="secondary" className="mb-2">Competitive Landscape</Badge>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {submission?.competitive_understanding || 'Not provided'}
                                            </p>
                                        </div>
                                        <div>
                                            <Badge variant="secondary" className="mb-2">Unique Selling Proposition</Badge>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {submission?.unique_selling_proposition || 'Not provided'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Technical & Vision */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            <Card className="border-0 shadow-card">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Lightbulb className="h-5 w-5 text-primary" />
                                        Technical Understanding
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {submission?.technical_understanding || 'Not provided'}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-card">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Target className="h-5 w-5 text-primary" />
                                        Vision
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {submission?.vision || 'Not provided'}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Progress bar */}
                        {overallScore != null && (
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium">Overall Progress</span>
                                    <span className="text-sm text-muted-foreground">{Math.round((overallScore / 20) * 100)}%</span>
                                </div>
                                <Progress 
                                    value={(overallScore / 20) * 100} 
                                    className="h-3"
                                />
                            </div>
                        )}

                        {/* AI Assessment & Score */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                            <div className="lg:col-span-2">
                                <Card className="border-0 shadow-card h-full">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Lightbulb className="h-5 w-5 text-primary" />
                                            AI Analysis Summary
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {(evaluation && evaluation['ai_analysis_summary']) ? (
                                            <div className="space-y-3">
                                                {String(evaluation['ai_analysis_summary']).split(/\n|\.|!/).filter(Boolean).slice(0, 5).map((line, i) => (
                                                    <div key={i} className="flex gap-3 items-start">
                                                        <div className="text-primary mt-1">
                                                            <Lightbulb className="h-4 w-4" />
                                                        </div>
                                                        <p className="text-sm text-muted-foreground leading-relaxed">{line.trim()}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex gap-3 items-start p-4 bg-muted/50 rounded-lg">
                                                <Lightbulb className="h-5 w-5 text-muted-foreground mt-0.5" />
                                                <p className="text-sm text-muted-foreground">
                                                    The submission has not been evaluated yet or no AI analysis is available.
                                                </p>
                                            </div>
                                        )}
                                        
                                        {evaluation && evaluation['ai_recommendations'] && (
                                            <div className="border-t pt-4 mt-4">
                                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                                    <Target className="h-4 w-4 text-primary" />
                                                    Recommendations
                                                </h4>
                                                <ol className="list-decimal list-inside space-y-2">
                                                    {(() => {
                                                        const raw = String(evaluation['ai_recommendations']);
                                                        let items: string[] = [];
                                                        if (/\d+\./.test(raw)) {
                                                            items = raw.split(/\d+\.\s*/).filter(Boolean).map(s => s.trim());
                                                        } else {
                                                            items = raw.split(/\r?\n/).filter(Boolean).map(s => s.trim());
                                                        }
                                                        return items.map((it, idx) => (
                                                            <li key={idx} className="text-sm text-muted-foreground leading-relaxed ml-4">
                                                                {it}
                                                            </li>
                                                        ));
                                                    })()}
                                                </ol>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            <Card className="border-0 shadow-card">
                                <CardHeader>
                                    <CardTitle className="text-lg">Evaluation Score</CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col items-center justify-center py-8">
                                    <div className="relative">
                                        <div className={`text-6xl font-bold mb-2 ${getScoreColor(overallScore ?? 0)} bg-clip-text text-transparent bg-gradient-to-br from-primary to-primary/60`}>
                                            {evaluation && evaluation['overall_average'] != null 
                                                ? Math.round(Number(evaluation['overall_average']) * 5) 
                                                : Math.round((overallScore ?? 0) * 5)}
                                        </div>
                                        <p className="text-muted-foreground text-center">out of 100</p>
                                    </div>
                                    <Badge 
                                        variant="secondary" 
                                        className="mt-4"
                                    >
                                        {((overallScore ?? 0) / 20) >= 4.0 ? 'Excellent' :
                                         ((overallScore ?? 0) / 20) >= 3.0 ? 'Good' :
                                         ((overallScore ?? 0) / 20) >= 2.0 ? 'Average' :
                                         ((overallScore ?? 0) / 20) >= 1.0 ? 'Below Average' : 'Needs Improvement'}
                                    </Badge>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Detailed Score Breakdown */}
                        <Card className="border-0 shadow-card">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Award className="h-5 w-5 text-primary" />
                                    Detailed Score Breakdown
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {evaluation && Object.keys(evaluation).filter(k => k.endsWith('_score')).length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {Object.keys(evaluation).filter(k => k.endsWith('_score')).sort().map((k) => {
                                            const raw = evaluation[k];
                                            const num = raw == null ? null : Number(raw);
                                            const pct = num == null ? 0 : Math.round((num / 20) * 100);
                                            return (
                                                <div key={k} className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-medium capitalize">
                                                            {k.replace(/_/g, ' ').replace(' score', '')}
                                                        </span>
                                                        <Badge variant="outline">
                                                            {num != null ? `${num}/20` : 'N/A'}
                                                        </Badge>
                                                    </div>
                                                    <Progress value={pct} className="h-2" />
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                        <p className="text-muted-foreground">No evaluation scores available yet.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
};

export default SubmissionDetail;
