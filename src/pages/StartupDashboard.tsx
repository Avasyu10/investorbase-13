import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Plus, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

  return (
    <div className="min-h-screen w-full flex flex-col" style={{ backgroundColor: 'rgb(12, 14, 24)' }}>
      <div className="container mx-auto py-8">
        <Tabs defaultValue="submissions" className="w-full">
          <div className="flex items-center justify-between mb-8">
            <div className="flex gap-2">
              <TabsList className="flex gap-2 bg-transparent p-0">
                <TabsTrigger value="submissions" className="px-4 py-2 rounded-lg font-semibold text-base focus:outline-none transition-colors duration-200 data-[state=active]:bg-[rgb(17,20,34)] data-[state=active]:text-white data-[state=active]:font-bold data-[state=inactive]:text-gray-400 data-[state=inactive]:font-normal">Eureka Prospects</TabsTrigger>
                <TabsTrigger value="history" className="px-4 py-2 rounded-lg font-semibold text-base focus:outline-none transition-colors duration-200 data-[state=active]:bg-[rgb(17,20,34)] data-[state=active]:text-white data-[state=active]:font-bold data-[state=inactive]:text-gray-400 data-[state=inactive]:font-normal">New Applications</TabsTrigger>
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
              <Button onClick={() => navigate("/startup-submit")} className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-2 rounded shadow">
                <Plus className="mr-2 h-4 w-4" />
                New Submission
              </Button>
            </div>

            {/* Glass tile summary blocks using evaluation scores */}
            {(() => {
              // Helper to get average score from evaluation
              const getEvalScore = (startupName) => {
                const ev = evaluations?.find(e => e.startup_name === startupName);
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
                  <div className="rounded-xl p-6 text-center border" style={{ backgroundColor: 'rgb(17, 20, 34)', borderColor: 'rgb(17, 20, 34)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
                    <div className="text-3xl font-bold text-white">{totalStartups}</div>
                    <div className="text-gray-400 mt-2">Total Startups</div>
                  </div>
                  <div className="rounded-xl p-6 text-center border" style={{ backgroundColor: 'rgb(17, 20, 34)', borderColor: 'rgb(17, 20, 34)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
                    <div className="text-3xl font-bold text-green-400">{highPotential}</div>
                    <div className="text-gray-400 mt-2">High Potential</div>
                  </div>
                  <div className="rounded-xl p-6 text-center border" style={{ backgroundColor: 'rgb(17, 20, 34)', borderColor: 'rgb(17, 20, 34)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
                    <div className="text-3xl font-bold text-yellow-400">{mediumPotential}</div>
                    <div className="text-gray-400 mt-2">Medium Potential</div>
                  </div>
                  <div className="rounded-xl p-6 text-center border" style={{ backgroundColor: 'rgb(17, 20, 34)', borderColor: 'rgb(17, 20, 34)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
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
              <Card className="border-none" style={{ backgroundColor: 'rgb(17, 20, 34)' }}>
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
                <table className="min-w-full rounded-lg" style={{ backgroundColor: 'rgb(17, 20, 34)' }}>
                  <thead>
                    <tr className="text-gray-400 text-left border-b border-[#23262F]">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Startup Name</th>
                      <th className="py-3 px-4">Founder Email</th>
                      <th className="py-3 px-4">Campus</th>
                      <th className="py-3 px-4">Score</th>
                      <th className="py-3 px-4">Potential</th>
                      <th className="py-3 px-4">PDF</th>
                      <th className="py-3 px-4">PPT</th>
                      <th className="py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((submission) => {
                      // Get score from evaluation history
                      const ev = evaluations?.find(e => e.startup_name === submission.startup_name);
                      let score = null;
                      if (ev) {
                        if (ev.overall_average) score = ev.overall_average;
                        else {
                          const scores = Object.keys(ev)
                            .filter(key => key.endsWith('_score') && ev[key] !== null)
                            .map(key => ev[key]);
                          if (scores.length > 0) score = scores.reduce((acc, s) => acc + s, 0) / scores.length;
                        }
                      }
                      let potential = '';
                      let badgeClass = '';
                      if (score !== null) {
                        if (score >= 15) {
                          potential = 'High';
                          badgeClass = 'bg-green-100 text-green-700';
                        } else if (score >= 10) {
                          potential = 'Medium';
                          badgeClass = 'bg-yellow-100 text-yellow-700';
                        } else {
                          potential = 'Bad';
                          badgeClass = 'bg-red-100 text-red-700';
                        }
                      }
                      return (
                        <tr key={submission.id} className="border-b border-[#23262F] hover:bg-[#20222A] transition">
                          <td className="py-3 px-4 text-white font-medium">{new Date(submission.created_at).toLocaleDateString("en-US")}</td>
                          <td className="py-3 px-4 text-white font-semibold">{submission.startup_name}</td>
                          <td className="py-3 px-4 text-gray-300">{submission.founder_email}</td>
                          <td className="py-3 px-4">
                            {submission.campus_affiliation ? (
                              <span className="px-2 py-1 rounded bg-green-100 text-green-700 font-semibold">Campus</span>
                            ) : (
                              <span className="px-2 py-1 rounded bg-gray-700 text-gray-300">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {score !== null ? (
                              <span className={`px-2 py-1 rounded font-semibold ${score >= 15 ? 'bg-blue-100 text-blue-700' : score >= 10 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{score.toFixed(1)}/20</span>
                            ) : (
                              <span className="px-2 py-1 rounded bg-gray-700 text-gray-300">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {score !== null ? (
                              <span className={`px-2 py-1 rounded font-semibold ${badgeClass}`}>{potential}</span>
                            ) : (
                              <span className="px-2 py-1 rounded bg-gray-700 text-gray-300">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {submission.pdf_file_url ? (
                              <Button variant="outline" size="sm" className="bg-blue-100 text-blue-700 font-semibold px-3 py-1 rounded" onClick={() => window.open(submission.pdf_file_url!, "_blank")}>PDF</Button>
                            ) : (
                              <span className="px-2 py-1 rounded bg-gray-700 text-gray-300">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {submission.ppt_file_url ? (
                              <Button variant="outline" size="sm" className="bg-yellow-100 text-yellow-700 font-semibold px-3 py-1 rounded" onClick={() => window.open(submission.ppt_file_url!, "_blank")}>PPT</Button>
                            ) : (
                              <span className="px-2 py-1 rounded bg-gray-700 text-gray-300">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              onClick={async () => {
                                try {
                                  const { data: { session } } = await supabase.auth.getSession();
                                  if (!session) throw new Error('You must be logged in to evaluate');
                                  setEvaluatingId(submission.id);
                                  toast({ title: 'Evaluating...', description: 'AI evaluation in progress', duration: 2000 });
                                  const { data, error } = await supabase.functions.invoke('evaluate-submission', {
                                    body: { submission }
                                  });
                                  if (error) throw error;
                                  toast({ title: 'Evaluation queued', description: 'Evaluation completed and saved', duration: 3000 });
                                  await fetchSubmissions();
                                } catch (err: any) {
                                  console.error('Evaluate submission error:', err);
                                  const message = err?.message || String(err || 'Unknown error');
                                  if (message.includes('Failed to send a request') || message.includes('Edge Function') || message.toLowerCase().includes('network')) {
                                    toast({
                                      title: 'Evaluation failed',
                                      description: 'Could not reach the Edge Function. Ensure your Supabase functions are deployed and reachable. To run a one-off evaluation locally, use the helper script `supabase\\evaluate_submission_by_id.ps1` (run in PowerShell with: powershell.exe -File .\\supabase\\evaluate_submission_by_id.ps1 -name "<Startup Name>").',
                                      variant: 'destructive',
                                      duration: 8000,
                                    });
                                  } else {
                                    toast({ title: 'Evaluation failed', description: message, variant: 'destructive' });
                                  }
                                } finally {
                                  setEvaluatingId(null);
                                }
                              }}
                              disabled={evaluatingId === submission.id}
                              className="bg-red-100 text-red-700 font-semibold px-3 py-1 rounded hover:bg-red-200"
                            >
                              {evaluatingId === submission.id ? 'Evaluating...' : 'Evaluate'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
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
    </div>
  );
};

export default StartupDashboard;