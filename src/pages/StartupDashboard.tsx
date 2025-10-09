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
import { ProblemStatementEvaluation } from "@/components/evaluation/ProblemStatementEvaluation";

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
  const navigate = useNavigate();
  const { toast } = useToast();
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8">
        <Tabs defaultValue="submissions" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto mb-8" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <TabsTrigger value="submissions">My Submissions</TabsTrigger>
            <TabsTrigger value="evaluation">Evaluate Idea</TabsTrigger>
          </TabsList>

          <TabsContent value="submissions">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-4xl font-bold">Startup Submissions</h1>
                <p className="text-muted-foreground mt-2">
                  View and manage your startup submissions
                </p>
              </div>
              <Button onClick={() => navigate("/startup-submit")}>
                <Plus className="mr-2 h-4 w-4" />
                New Submission
              </Button>
            </div>

            {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading submissions...</p>
          </div>
        ) : submissions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                No submissions yet. Create your first one!
              </p>
              <Button onClick={() => navigate("/startup-submit")}>
                <Plus className="mr-2 h-4 w-4" />
                Create Submission
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {submissions.map((submission) => (
              <Card key={submission.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{submission.startup_name}</CardTitle>
                      <CardDescription>
                        {new Date(submission.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </CardDescription>
                    </div>
                    {submission.campus_affiliation && (
                      <Badge variant="secondary">Campus-based</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-1">Contact</h4>
                      <p className="text-sm text-muted-foreground">
                        {submission.founder_email}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Problem Statement</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {submission.problem_statement}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Solution</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {submission.solution}
                      </p>
                    </div>
                    {(submission.pdf_file_url || submission.ppt_file_url) && (
                      <div className="flex gap-2">
                        {submission.pdf_file_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(submission.pdf_file_url!, "_blank")}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View PDF
                          </Button>
                        )}
                        {submission.ppt_file_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(submission.ppt_file_url!, "_blank")}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View PPT
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
          </TabsContent>

          <TabsContent value="evaluation">
            <ProblemStatementEvaluation />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StartupDashboard;