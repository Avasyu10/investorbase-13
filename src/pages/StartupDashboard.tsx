/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Plus, ExternalLink, Trash2 } from "lucide-react";
import { RefreshCw } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EvaluationHistory } from "@/components/evaluation/EvaluationHistory";
import { useSubmissionEvaluations } from "@/hooks/useSubmissionEvaluations";
import { useEurekaStats } from "@/hooks/useEurekaStats";

interface StartupSubmission {
  id: string;
  created_at: string;
  startup_name: string;
  founder_email: string;
  problem_statement: string;
  solution: string;
  campus_affiliation: boolean;
  pdf_file_url: string | null;
  ppt_file_url: string | null;
}

const StartupDashboard = () => {
  const { data: evaluations } = useSubmissionEvaluations();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<StartupSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastDeleted, setLastDeleted] = useState<StartupSubmission | null>(null);
  const [lastDeletedEvals, setLastDeletedEvals] = useState<any[] | null>(null);
  // Helper to get average score from evaluation
  const getEvalScore = (startupName: string, submissionId?: string) => {
    // Prefer to match by submission id via startup_submission_id on evaluations if available
    let ev = null as any;
    if (submissionId) {
      ev = evaluations?.find((e: any) => e.startup_submission_id === submissionId) ?? null;
    }
    if (!ev) ev = evaluations?.find((e: any) => e.startup_name === startupName) ?? null;
    if (!ev) return null;
    if (ev.overall_average) return ev.overall_average;
    const scores = Object.keys(ev)
      .filter((key) => key.endsWith('_score') && ev[key] !== null)
      .map((key) => ev[key]);
    if (scores.length === 0) return null;
    return scores.reduce((acc: number, score: number) => acc + score, 0) / scores.length;
  };
  const [scoreSortAsc, setScoreSortAsc] = useState<boolean | null>(null); // null = no sort, true = asc, false = desc

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/");
        return;
      }

      const { data, error } = await supabase
        .from("startup_submissions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setSubmissions(data || []);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast({
        title: "Error",
        description: "Failed to load submissions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Build CSV from submissions and evaluations and trigger download
  const downloadCsv = () => {
    try {
      const headers = [
        'submission_id',
        'startup_name',
        'founder_email',
        'linkedin_profile_url',
        'created_at',
        'problem_statement',
        'solution',
        'market_understanding',
        'customer_understanding',
        'competitive_understanding',
        'unique_selling_proposition',
        'technical_understanding',
        'vision',
        'evaluation_overall_average',
        'evaluation_details_json'
      ];

      const rows = submissions.map(s => {
        const ev = evaluations?.find((e: any) => e.startup_submission_id === s.id) ?? evaluations?.find((e: any) => e.startup_name === s.startup_name) ?? null;
        return {
          submission_id: s.id,
          startup_name: s.startup_name,
          founder_email: s.founder_email,
          linkedin_profile_url: (s as any).linkedin_profile_url ?? '',
          created_at: s.created_at,
          problem_statement: s.problem_statement,
          solution: s.solution,
          market_understanding: (s as any).market_understanding ?? '',
          customer_understanding: (s as any).customer_understanding ?? '',
          competitive_understanding: (s as any).competitive_understanding ?? '',
          unique_selling_proposition: (s as any).unique_selling_proposition ?? '',
          technical_understanding: (s as any).technical_understanding ?? '',
          vision: (s as any).vision ?? '',
          evaluation_overall_average: ev?.overall_average ?? '',
          evaluation_details_json: ev ? JSON.stringify(ev) : ''
        };
      });

      // CSV encode
      const escape = (v: any) => {
        if (v === null || v === undefined) return '';
        const s = String(v).replace(/"/g, '""');
        return `"${s}"`;
      };

      const csv = [headers.map(h => `"${h}"`).join(',')]
        .concat(rows.map(r => headers.map(h => escape((r as any)[h])).join(',')))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `startup_submissions_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV download error', err);
      toast({ title: 'Error', description: 'Failed to generate CSV' });
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#0c0e18]">
      <div className="container mx-auto py-8">
        <Tabs defaultValue="submissions" className="w-full">
          <div className="flex items-center justify-between mb-8">
            <div className="flex gap-2">
              <TabsList className="flex gap-2 bg-transparent p-0">
                <TabsTrigger value="submissions" className="px-4 py-2 rounded-lg font-semibold text-base focus:outline-none transition-colors duration-200 data-[state=active]:bg-[rgb(245,168,61)] data-[state=active]:text-black data-[state=active]:font-bold data-[state=inactive]:text-gray-400 data-[state=inactive]:font-normal">Eureka Prospects</TabsTrigger>
                <TabsTrigger value="history" className="hidden px-4 py-2 rounded-lg font-semibold text-base focus:outline-none transition-colors duration-200 data-[state=active]:bg-[rgb(245,168,61)] data-[state=active]:text-black data-[state=active]:font-bold data-[state=inactive]:text-gray-400 data-[state=inactive]:font-normal">New Applications</TabsTrigger>
                <TabsTrigger value="applications" className="px-4 py-2 rounded-lg font-semibold text-base focus:outline-none transition-colors duration-200 data-[state=active]:bg-[rgb(245,168,61)] data-[state=active]:text-black data-[state=active]:font-bold data-[state=inactive]:text-gray-400 data-[state=inactive]:font-normal">Applications</TabsTrigger>
              </TabsList>
            </div>
            <a href="/news-feed" className="flex items-center gap-2 px-5 py-2 rounded-lg border border-[rgb(17,20,34)] bg-transparent text-white font-semibold hover:bg-[rgb(17,20,34)] transition shadow-lg backdrop-blur-lg">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2z" /><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" /></svg>
              News Feed
            </a>
          </div>

          <TabsContent value="submissions">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-4xl font-bold text-white">Startup Submissions</h1>
                <p className="text-gray-400 mt-2">
                  View and manage your startup submissions
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={() => downloadCsv()} style={{ backgroundColor: 'rgb(245,168,61)' }} className="hover:opacity-95 text-black font-semibold px-4 py-2 rounded shadow">
                  Download CSV
                </Button>
                <Button onClick={() => navigate("/startup-submit")} style={{ backgroundColor: 'rgb(245,168,61)' }} className="hover:opacity-95 text-black font-semibold px-6 py-2 rounded shadow">
                  <Plus className="mr-2 h-4 w-4" />
                  New Submission
                </Button>
              </div>
            </div>

            {/* Glass tile summary blocks using evaluation scores */}
            {(() => {
              // Helper to get average score from evaluation
              const getEvalScore = (startupName, submissionId?: string) => {
                // Prefer to match by submission id via startup_submission_id on evaluations if available
                let ev = null;
                if (submissionId) {
                  ev = evaluations?.find((e: any) => e.startup_submission_id === submissionId) ?? null;
                }
                if (!ev) ev = evaluations?.find((e: any) => e.startup_name === startupName) ?? null;
                if (!ev) return null;
                if (ev.overall_average) return ev.overall_average;
                const scores = Object.keys(ev)
                  .filter(key => key.endsWith('_score') && ev[key] !== null)
                  .map(key => ev[key]);
                if (scores.length === 0) return null;
                return scores.reduce((acc, score) => acc + score, 0) / scores.length;
              };
              const totalStartups = submissions.length;
              let highPotential = 0, mediumPotential = 0, badPotential = 0;
              submissions.forEach(s => {
                const score = getEvalScore(s.startup_name);
                if (score === null) return;
                if (score >= 15) highPotential++;
                else if (score >= 10) mediumPotential++;
                else badPotential++;
              });
              return (
                <div className="grid grid-cols-4 gap-6 mb-8">
                  <div className="rounded-xl p-6 text-center border bg-[#111422] border-[#111422] shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
                    <div className="text-3xl font-bold text-white">{totalStartups}</div>
                    <div className="text-gray-400 mt-2">Total Startups</div>
                  </div>
                  <div className="rounded-xl p-6 text-center border bg-[#111422] border-[#111422] shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
                    <div className="text-3xl font-bold text-green-400">{highPotential}</div>
                    <div className="text-gray-400 mt-2">High Potential</div>
                  </div>
                  <div className="rounded-xl p-6 text-center border bg-[#111422] border-[#111422] shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
                    <div className="text-3xl font-bold text-yellow-400">{mediumPotential}</div>
                    <div className="text-gray-400 mt-2">Medium Potential</div>
                  </div>
                  <div className="rounded-xl p-6 text-center border bg-[#111422] border-[#111422] shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
                    <div className="text-3xl font-bold text-red-400">{badPotential}</div>
                    <div className="text-gray-400 mt-2">Bad Potential</div>
                  </div>
                </div>
              );
            })()}

            {/* Table Layout with scores and potential badges */}
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-400">Loading submissions...</p>
              </div>
            ) : submissions.length === 0 ? (
              <Card className="border-none bg-[#111422]">
                <CardContent className="py-12 text-center">
                  <p className="text-gray-400 mb-4">
                    No submissions yet. Create your first one!
                  </p>
                  <Button onClick={() => navigate("/startup-submit")} className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-2 rounded shadow">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Submission
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full rounded-lg bg-[#111422]">
                  <thead>
                    <tr className="text-gray-400 text-left border-b border-[#23262F]">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Startup Name</th>
                      <th className="py-3 px-4">ID</th>
                      <th className="py-3 px-4 cursor-pointer" onClick={() => setScoreSortAsc(prev => prev === null ? false : !prev)}>
                        Score
                        <span className="ml-2 text-sm text-gray-400">{scoreSortAsc === null ? '' : scoreSortAsc ? '↑' : '↓'}</span>
                      </th>
                      <th className="py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const rows = submissions.map((submission) => ({ submission, score: getEvalScore(submission.startup_name, submission.id) }));
                      if (scoreSortAsc !== null) {
                        rows.sort((a, b) => {
                          const as = a.score ?? -Infinity;
                          const bs = b.score ?? -Infinity;
                          return scoreSortAsc ? as - bs : bs - as;
                        });
                      }
                      return rows.map(({ submission, score }) => {
                        const ev = evaluations?.find((e: any) => e.startup_submission_id === submission.id) ?? evaluations?.find((e: any) => e.startup_name === submission.startup_name);
                        let displayScore = score;
                        if (displayScore == null) {
                          if (ev) {
                            if (ev.overall_average) displayScore = ev.overall_average;
                            else {
                              const scores = Object.keys(ev)
                                .filter((key) => key.endsWith('_score') && ev[key] !== null)
                                .map((key) => ev[key]);
                              if (scores.length > 0) displayScore = scores.reduce((acc, s) => acc + s, 0) / scores.length;
                            }
                          }
                        }
                        let potential = '';
                        let badgeClass = '';
                        if (displayScore !== null) {
                          if (displayScore >= 15) {
                            potential = 'High';
                            badgeClass = 'bg-green-100 text-green-700';
                          } else if (displayScore >= 10) {
                            potential = 'Medium';
                            badgeClass = 'bg-yellow-100 text-yellow-700';
                          } else {
                            potential = 'Bad';
                            badgeClass = 'bg-red-100 text-red-700';
                          }
                        }
                        return (
                          <tr key={submission.id} className="border-b border-[#23262F] hover:bg-[#20222A] transition">
                            <td className="py-3 px-4 text-gray-300">{new Date(submission.created_at).toLocaleDateString('en-US')}</td>
                            <td className="py-3 px-4 text-white font-medium">{submission.startup_name}</td>
                            <td className="py-3 px-4 text-white">
                              <button
                                className="text-blue-400 hover:text-blue-300 underline cursor-pointer transition"
                                onClick={async () => {
                                  try {
                                    const { data: { user } } = await supabase.auth.getUser();
                                    if (!user) throw new Error('Not authenticated');

                                    // Find or create company from submission
                                    let companyId: string | null = null;

                                    // Check if company already exists for this submission
                                    const { data: existingCompanies } = await supabase
                                      .from('companies')
                                      .select('id')
                                      .eq('name', submission.startup_name)
                                      .eq('user_id', user.id)
                                      .limit(1);

                                    if (existingCompanies && existingCompanies.length > 0) {
                                      companyId = existingCompanies[0].id;
                                    } else {
                                      // Create new company from submission data
                                      const evaluation = evaluations?.find((e: any) => 
                                        e.startup_submission_id === submission.id || e.startup_name === submission.startup_name
                                      );

                                      const overallScore = evaluation?.overall_average || displayScore || 0;

                                      // Get full submission data
                                      const { data: fullSubmission } = await supabase
                                        .from('startup_submissions')
                                        .select('*')
                                        .eq('id', submission.id)
                                        .single();

                                      // Prepare assessment points from evaluation and submission
                                      const assessmentPoints = [];
                                      if (fullSubmission?.problem_statement) {
                                        assessmentPoints.push(`Problem: ${fullSubmission.problem_statement}`);
                                      }
                                      if (fullSubmission?.solution) {
                                        assessmentPoints.push(`Solution: ${fullSubmission.solution}`);
                                      }
                                      if (evaluation?.ai_analysis_summary) {
                                        assessmentPoints.push(`AI Analysis: ${evaluation.ai_analysis_summary}`);
                                      }

                                      // Store submission and evaluation data in response_received as JSON
                                      const responseData = {
                                        submission: fullSubmission,
                                        evaluation: evaluation,
                                        source: 'startup_submission',
                                        submission_id: submission.id
                                      };

                                      const { data: newCompany, error: createError } = await supabase
                                        .from('companies')
                                        .insert({
                                          name: submission.startup_name,
                                          user_id: user.id,
                                          email: submission.founder_email,
                                          overall_score: overallScore,
                                          source: 'startup_submission',
                                          created_at: submission.created_at,
                                          assessment_points: assessmentPoints,
                                          response_received: JSON.stringify(responseData),
                                        })
                                        .select('id')
                                        .single();

                                      if (createError) throw createError;
                                      companyId = newCompany.id;
                                    }

                                    if (companyId) {
                                      navigate(`/company/${companyId}`);
                                    }
                                  } catch (err) {
                                    console.error('Navigation error:', err);
                                    toast({
                                      title: 'Error',
                                      description: 'Failed to navigate to company page',
                                      variant: 'destructive',
                                    });
                                  }
                                }}
                              >
                                EU{submission.id.slice(-7).toUpperCase()}
                              </button>
                            </td>
                            <td className="py-3 px-4">
                              {displayScore !== null ? (
                                (() => {
                                  const pct = Math.round((displayScore / 20) * 100);
                                  const colorClass = pct >= 75 ? 'bg-blue-100 text-blue-700' : pct >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
                                  return <span className={`px-3 py-1 rounded-full font-semibold ${colorClass}`}>{pct}/100</span>;
                                })()
                              ) : (
                                <span className="px-2 py-1 rounded bg-gray-700 text-gray-300">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <Button
                                variant="ghost"
                                onClick={async () => {
                                  try {
                                    const { data: { session } } = await supabase.auth.getSession();
                                    if (!session) throw new Error('You must be logged in to delete submissions');
                                    const deleted = submission;
                                    setLastDeleted(deleted);
                                    const { data: evalsData } = await supabase
                                      .from('submission_evaluations')
                                      .select('*')
                                      .eq('startup_submission_id', submission.id);
                                    setLastDeletedEvals(evalsData ?? null);
                                    const { error } = await supabase
                                      .from('startup_submissions')
                                      .delete()
                                      .eq('id', submission.id);
                                    if (error) throw error;
                                    if (evalsData && evalsData.length > 0) {
                                      await supabase
                                        .from('submission_evaluations')
                                        .delete()
                                        .eq('startup_submission_id', submission.id);
                                    }
                                    toast({ title: 'Deleted', description: 'Submission deleted.' });
                                    await fetchSubmissions();
                                  } catch (err: any) {
                                    console.error('Delete submission error:', err);
                                    toast({ title: 'Delete failed', description: err?.message || String(err || 'Unknown error'), variant: 'destructive' });
                                  }
                                }}
                                className="text-red-500 hover:bg-red-50 rounded p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="applications">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-white">New Applications</h1>
                <p className="text-gray-400">Recent submissions across all your forms and channels</p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => { fetchSubmissions(); }} className="px-4 py-2">Refresh</Button>
                <Button onClick={() => { /* placeholder for re-run failed */ }} className="px-4 py-2">Re-run Failed/Rejected</Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full rounded-lg bg-[#111422]">
                <thead>
                  <tr className="text-gray-400 text-left border-b border-[#23262F]">
                    <th className="py-3 px-4">Company Name</th>
                    <th className="py-3 px-4">Submitted</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map(sub => {
                    const ev = evaluations?.find((e: any) => e.startup_submission_id === sub.id) ?? evaluations?.find((e: any) => e.startup_name === sub.startup_name);
                    const status = ev ? 'Analyzed' : '-';
                    const timeAgo = (d: string) => {
                      const ago = Date.now() - new Date(d).getTime();
                      const days = Math.floor(ago / (1000 * 60 * 60 * 24));
                      if (days === 0) return 'today';
                      if (days === 1) return '1 day ago';
                      if (days < 30) return `${days} days ago`;
                      const months = Math.floor(days / 30);
                      if (months === 1) return 'about 1 month ago';
                      return `about ${months} months ago`;
                    };
                    return (
                      <tr key={sub.id} className="border-b border-[#23262F] hover:bg-[#20222A] transition">
                        <td className="py-3 px-4 text-white">EU{sub.id.slice(-7).toUpperCase()}</td>
                        <td className="py-3 px-4 text-gray-300">{timeAgo(sub.created_at)}</td>
                        <td className="py-3 px-4"><span className="px-3 py-1 rounded-full bg-green-100 text-green-700">{status}</span></td>
                        <td className="py-3 px-4">
                          <Button variant="ghost" onClick={async () => {
                            try {
                              setEvaluatingId(sub.id);
                              // invoke evaluate edge function if available
                              await fetch('/api/evaluate-submission', { method: 'POST', body: JSON.stringify({ submissionId: sub.id }) });
                              setEvaluatingId(null);
                              toast({ title: 'Re-run invoked' });
                            } catch (err) {
                              console.error('Re-run error', err);
                              setEvaluatingId(null);
                              toast({ title: 'Error', description: 'Failed to re-run' });
                            }
                          }}>
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="max-w-6xl mx-auto">
              <div className="mb-8">
                <h2 className="text-3xl font-bold mb-2">Evaluation History</h2>
                <p className="text-muted-foreground">
                  View all past problem statement evaluations
                </p>
              </div>
              <EvaluationHistory />
            </div>
          </TabsContent>
        </Tabs>
      </div>
      {/* Details now open on their own page at /submission/:id */}
    </div>
  );
};

export default StartupDashboard;