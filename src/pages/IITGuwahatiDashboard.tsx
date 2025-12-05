/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Plus, ExternalLink, Trash2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
        return <Badge className="bg-green-100 text-green-700">Analyzed</Badge>;
      case 'analyzing':
        return <Badge className="bg-yellow-100 text-yellow-700">Analyzing</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-700">Error</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700">Pending</Badge>;
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#0c0e18]">
      <div className="container mx-auto py-8">
        <Tabs defaultValue="submissions" className="w-full">
          <div className="flex items-center justify-between mb-8">
            <div className="flex gap-2">
              <TabsList className="flex gap-2 bg-transparent p-0">
                <TabsTrigger value="submissions" className="px-4 py-2 rounded-lg font-semibold text-base focus:outline-none transition-colors duration-200 data-[state=active]:bg-[rgb(245,168,61)] data-[state=active]:text-black data-[state=active]:font-bold data-[state=inactive]:text-gray-400 data-[state=inactive]:font-normal">
                  Startup Applications
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="submissions">
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
                <div className="text-3xl font-bold text-green-400">{submissions.filter(s => s.analysis_status === 'completed').length}</div>
                <div className="text-gray-400 mt-2">Analyzed</div>
              </div>
              <div className="rounded-xl p-6 text-center border bg-[#111422] border-[#111422] shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
                <div className="text-3xl font-bold text-yellow-400">{submissions.filter(s => s.analysis_status === 'pending' || !s.analysis_status).length}</div>
                <div className="text-gray-400 mt-2">Pending</div>
              </div>
              <div className="rounded-xl p-6 text-center border bg-[#111422] border-[#111422] shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
                <div className="text-3xl font-bold text-blue-400">
                  {submissions.filter(s => s.total_funding_sought).length}
                </div>
                <div className="text-gray-400 mt-2">Seeking Funding</div>
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
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Startup Name</th>
                      <th className="py-3 px-4">Founder</th>
                      <th className="py-3 px-4">Domain</th>
                      <th className="py-3 px-4">Stage</th>
                      <th className="py-3 px-4">Funding Sought</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((submission) => (
                      <tr
                        key={submission.id}
                        className="border-b border-[#23262F] hover:bg-[#181c2a] transition-colors cursor-pointer"
                        onClick={() => navigate(`/iitguwahati-company/${submission.id}`)}
                      >
                        <td className="py-3 px-4 text-gray-300">
                          {new Date(submission.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 font-medium text-white">
                          {submission.startup_name}
                        </td>
                        <td className="py-3 px-4 text-gray-300">
                          {submission.founder_name || '-'}
                        </td>
                        <td className="py-3 px-4 text-gray-300 max-w-[200px] truncate">
                          {submission.domain_and_problem?.slice(0, 50) || '-'}
                        </td>
                        <td className="py-3 px-4 text-gray-300">
                          {submission.product_type_and_stage || '-'}
                        </td>
                        <td className="py-3 px-4 text-gray-300">
                          {submission.total_funding_sought || '-'}
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(submission.analysis_status)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/iitguwahati-company/${submission.id}`)}
                              className="text-gray-400 hover:text-white"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteSubmission(submission.id)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
