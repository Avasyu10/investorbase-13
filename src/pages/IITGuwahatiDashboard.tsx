/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Plus, ExternalLink, Trash2, Download, RefreshCw, Newspaper } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";

interface IITGuwahatiSubmission {
  id: string;
  created_at: string;
  startup_name: string;
  founder_name: string | null;
  submitter_email: string;
  linkedin_url: string | null;
  phone_number: string | null;
  domain_and_problem: string | null;
  target_market_size: string | null;
  unique_proposition: string | null;
  product_type_and_stage: string | null;
  primary_revenue_model: string | null;
  ltv_cac_ratio: string | null;
  total_funding_sought: string | null;
  key_traction_metric: string | null;
  ip_moat_status: string | null;
  twelve_month_roadmap: string | null;
  analysis_status: string | null;
  analysis_result: any;
}

const IITGuwahatiDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<IITGuwahatiSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate("/");
        return;
      }

      const { data, error } = await supabase
        .from("iitguwahati_form_submissions")
        .select("*")
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

  const deleteSubmission = async (id: string) => {
    try {
      const { error } = await supabase
        .from("iitguwahati_form_submissions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setSubmissions(submissions.filter(s => s.id !== id));
      toast({
        title: "Deleted",
        description: "Submission deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting submission:", error);
      toast({
        title: "Error",
        description: "Failed to delete submission",
        variant: "destructive",
      });
    }
  };

  const downloadCsv = () => {
    try {
      const headers = [
        'id', 'created_at', 'startup_name', 'founder_name', 'submitter_email', 'linkedin_url', 'phone_number',
        'domain_and_problem', 'target_market_size', 'unique_proposition', 'product_type_and_stage',
        'primary_revenue_model', 'ltv_cac_ratio', 'total_funding_sought', 'key_traction_metric',
        'ip_moat_status', 'twelve_month_roadmap', 'analysis_status'
      ];

      const escape = (v: any) => {
        if (v === null || v === undefined) return '';
        const s = String(v).replace(/"/g, '""');
        return `"${s}"`;
      };

      const csv = [headers.map(h => `"${h}"`).join(',')]
        .concat(submissions.map(s => headers.map(h => escape((s as any)[h])).join(',')))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `iitguwahati_submissions_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV download error', err);
      toast({ title: 'Error', description: 'Failed to generate CSV', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-900/50 text-green-400 border border-green-700/50">Analyzed</Badge>;
      case 'analyzing':
        return <Badge className="bg-yellow-900/50 text-yellow-400 border border-yellow-700/50">Analyzing</Badge>;
      case 'error':
        return <Badge className="bg-red-900/50 text-red-400 border border-red-700/50">Error</Badge>;
      default:
        return <Badge className="bg-gray-800/50 text-gray-400 border border-gray-700/50">Pending</Badge>;
    }
  };

  const [isRevaluating, setIsRevaluating] = useState(false);

  const reEvaluateAll = async () => {
    setIsRevaluating(true);
    try {
      for (const submission of submissions) {
        await supabase
          .from("iitguwahati_form_submissions")
          .update({ analysis_status: 'pending' })
          .eq("id", submission.id);
      }
      toast({
        title: "Re-evaluation started",
        description: "All submissions are being re-evaluated",
      });
      fetchSubmissions();
    } catch (error) {
      console.error("Error re-evaluating:", error);
      toast({
        title: "Error",
        description: "Failed to re-evaluate submissions",
        variant: "destructive",
      });
    } finally {
      setIsRevaluating(false);
    }
  };

  const reEvaluateSingle = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await supabase
        .from("iitguwahati_form_submissions")
        .update({ analysis_status: 'pending' })
        .eq("id", id);
      toast({
        title: "Re-evaluation started",
        description: "Submission is being re-evaluated",
      });
      fetchSubmissions();
    } catch (error) {
      console.error("Error re-evaluating:", error);
      toast({
        title: "Error",
        description: "Failed to re-evaluate submission",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#0c0e18]">
      <div className="container mx-auto py-8">
        <Tabs defaultValue="prospects" className="w-full">
          <div className="flex items-center justify-between mb-8">
            <div className="flex gap-2">
              <TabsList className="flex gap-2 bg-transparent p-0">
                <TabsTrigger value="prospects" className="px-4 py-2 rounded-lg font-semibold text-base focus:outline-none transition-colors duration-200 data-[state=active]:bg-[rgb(245,168,61)] data-[state=active]:text-black data-[state=active]:font-bold data-[state=inactive]:text-gray-400 data-[state=inactive]:font-normal">
                  Eureka Prospects
                </TabsTrigger>
                <TabsTrigger value="applications" className="px-4 py-2 rounded-lg font-semibold text-base focus:outline-none transition-colors duration-200 data-[state=active]:bg-[rgb(245,168,61)] data-[state=active]:text-black data-[state=active]:font-bold data-[state=inactive]:text-gray-400 data-[state=inactive]:font-normal">
                  Applications
                </TabsTrigger>
              </TabsList>
            </div>
            <Button 
              variant="outline" 
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
              onClick={() => navigate("/news-feed")}
            >
              <Newspaper className="mr-2 h-4 w-4" />
              News Feed
            </Button>
          </div>

          {/* Eureka Prospects Tab */}
          <TabsContent value="prospects">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-4xl font-bold text-white">IIT Guwahati Incubator</h1>
                <p className="text-gray-400 mt-2">
                  View and manage startup applications
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={downloadCsv} style={{ backgroundColor: 'rgb(245,168,61)' }} className="hover:opacity-95 text-black font-semibold px-4 py-2 rounded shadow">
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV
                </Button>
                <Button onClick={() => navigate("/iitguwahati-submit")} style={{ backgroundColor: 'rgb(245,168,61)' }} className="hover:opacity-95 text-black font-semibold px-6 py-2 rounded shadow">
                  <Plus className="mr-2 h-4 w-4" />
                  New Application
                </Button>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-6 mb-8">
              <div className="rounded-xl p-6 text-center border bg-[#111422] border-[#111422] shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
                <div className="text-3xl font-bold text-white">{submissions.length}</div>
                <div className="text-gray-400 mt-2">Total Applications</div>
              </div>
              <div className="rounded-xl p-6 text-center border bg-[#111422] border-[#111422] shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
                <div className="text-3xl font-bold text-green-400">
                  {submissions.filter(s => {
                    const score = s.analysis_result?.overall_score;
                    return score !== undefined && score >= 75;
                  }).length}
                </div>
                <div className="text-gray-400 mt-2">High Potential</div>
              </div>
              <div className="rounded-xl p-6 text-center border bg-[#111422] border-[#111422] shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
                <div className="text-3xl font-bold text-yellow-400">
                  {submissions.filter(s => {
                    const score = s.analysis_result?.overall_score;
                    return score !== undefined && score >= 50 && score < 75;
                  }).length}
                </div>
                <div className="text-gray-400 mt-2">Medium Potential</div>
              </div>
              <div className="rounded-xl p-6 text-center border bg-[#111422] border-[#111422] shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
                <div className="text-3xl font-bold text-red-400">
                  {submissions.filter(s => {
                    const score = s.analysis_result?.overall_score;
                    return score !== undefined && score < 50;
                  }).length}
                </div>
                <div className="text-gray-400 mt-2">Low Potential</div>
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-400">Loading applications...</p>
              </div>
            ) : submissions.length === 0 ? (
              <Card className="border-none bg-[#111422]">
                <CardContent className="py-12 text-center">
                  <p className="text-gray-400 mb-4">
                    No applications yet. Create your first one!
                  </p>
                  <Button onClick={() => navigate("/iitguwahati-submit")} className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-2 rounded shadow">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Application
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full rounded-lg bg-[#111422]">
                  <thead>
                    <tr className="text-gray-400 text-left border-b border-[#23262F]">
                      <th className="py-4 px-6">Date</th>
                      <th className="py-4 px-6">Startup Name</th>
                      <th className="py-4 px-6">ID</th>
                      <th className="py-4 px-6">Score</th>
                      <th className="py-4 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((submission) => {
                      const score = submission.analysis_result?.overall_score;
                      const shortId = `EU${submission.id.slice(0, 8).toUpperCase()}`;
                      return (
                        <tr
                          key={submission.id}
                          className="border-b border-[#23262F] hover:bg-[#181c2a] transition-colors cursor-pointer"
                          onClick={() => navigate(`/iitguwahati-company/${submission.id}`)}
                        >
                          <td className="py-4 px-6 text-gray-300">
                            {new Date(submission.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-6 font-medium text-white">
                            {submission.startup_name}
                          </td>
                          <td className="py-4 px-6 text-gray-400">
                            {shortId}
                          </td>
                          <td className="py-4 px-6">
                            {score !== undefined ? (
                              <Badge className={`${
                                score >= 75 ? 'bg-green-900/50 text-green-400 border border-green-700/50' :
                                score >= 50 ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-700/50' :
                                'bg-red-900/50 text-red-400 border border-red-700/50'
                              }`}>
                                {Math.round(score)}/100
                              </Badge>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); deleteSubmission(submission.id); }}
                              className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
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

          {/* Applications Tab */}
          <TabsContent value="applications">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-4xl font-bold text-white">New Applications</h1>
                <p className="text-gray-400 mt-2">
                  Recent submissions across all your forms and channels
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  onClick={fetchSubmissions} 
                  variant="outline"
                  className="border-[rgb(245,168,61)] text-[rgb(245,168,61)] hover:bg-[rgb(245,168,61)]/10"
                >
                  Refresh
                </Button>
                <Button 
                  onClick={reEvaluateAll} 
                  disabled={isRevaluating}
                  variant="outline"
                  className="border-[rgb(245,168,61)] text-[rgb(245,168,61)] hover:bg-[rgb(245,168,61)]/10"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRevaluating ? 'animate-spin' : ''}`} />
                  Re-evaluate All
                </Button>
              </div>
            </div>

            {/* Applications Table */}
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-400">Loading applications...</p>
              </div>
            ) : submissions.length === 0 ? (
              <Card className="border-none bg-[#111422]">
                <CardContent className="py-12 text-center">
                  <p className="text-gray-400 mb-4">
                    No applications yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full rounded-lg bg-[#111422]">
                  <thead>
                    <tr className="text-gray-400 text-left border-b border-[#23262F]">
                      <th className="py-4 px-6">Company Name</th>
                      <th className="py-4 px-6">Submitted</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((submission) => (
                      <tr
                        key={submission.id}
                        className="border-b border-[#23262F] hover:bg-[#181c2a] transition-colors cursor-pointer"
                        onClick={() => navigate(`/iitguwahati-company/${submission.id}`)}
                      >
                        <td className="py-4 px-6 font-medium text-[rgb(245,168,61)]">
                          {submission.startup_name}
                        </td>
                        <td className="py-4 px-6 text-gray-300">
                          {formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })}
                        </td>
                        <td className="py-4 px-6">
                          {getStatusBadge(submission.analysis_status)}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => reEvaluateSingle(submission.id, e)}
                            className="text-gray-400 hover:text-white"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default IITGuwahatiDashboard;
