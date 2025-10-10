import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export const StartupSubmissionForm = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pptFile, setPptFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    problem_statement: "",
    solution: "",
    market_understanding: "",
    customer_understanding: "",
    competitive_understanding: "",
    unique_selling_proposition: "",
    technical_understanding: "",
    vision: "",
    campus_affiliation: false,
    startup_name: "",
    founder_email: "",
    linkedin_profile_url: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'pdf' | 'ppt') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'pdf') {
        setPdfFile(file);
      } else {
        setPptFile(file);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Check authentication first
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !authUser) {
        toast({
          title: "Authentication Required",
          description: "Please log in to submit your startup details.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Prepare form data for the edge function
      const submissionData = new FormData();

      // Add all form fields
      Object.entries(formData).forEach(([key, value]) => {
        submissionData.append(key, value.toString());
      });

      // Add files if present
      if (pdfFile) {
        submissionData.append('pdfFile', pdfFile);
      }
      if (pptFile) {
        submissionData.append('pptFile', pptFile);
      }

      // Get the current session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        toast({
          title: "Session Error",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Call the adding-startup-studio-details edge function with explicit auth
      const { data, error } = await supabase.functions.invoke('adding-startup-studio-details', {
        body: submissionData,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your startup details have been submitted successfully.",
      });

      // Trigger automatic evaluation (only for logged in users)
      try {
        const {
          data: { user: evalUser },
        } = await supabase.auth.getUser();

        if (evalUser && data?.data) {
          // Invoke edge function to evaluate the full submission automatically
          try {
            const evalResp = await supabase.functions.invoke('evaluate-submission', {
              body: {
                submission: data.data
              }
            });

            // If evalResp contains error field, log it but don't block navigation
            if ((evalResp as any).error) {
              console.error('Evaluation function error:', (evalResp as any).error);
            }
          } catch (fnErr: any) {
            console.error('Auto-evaluation failed (edge function unreachable):', fnErr?.message || fnErr);
            // Non-fatal: surface a friendly console note with guidance for local runs
            console.warn('Tip: run the helper script from PowerShell to evaluate a submission locally:\n  powershell.exe -File .\\supabase\\evaluate_submission_by_id.ps1 -name "<Startup Name>"');
          }
        }
      } catch (e) {
        console.error('Auto-evaluation unexpected error:', e);
      }

      // Navigate to dashboard only if logged in
      const {
        data: { user: navUser },
      } = await supabase.auth.getUser();

      if (navUser) {
        navigate("/startup-dashboard");
      } else {
        navigate("/thank-you");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: "Failed to submit the form. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Startup Information Form</CardTitle>
          <CardDescription>
            Submit your startup details for review
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="startup_name">Startup Name *</Label>
                <Input
                  id="startup_name"
                  name="startup_name"
                  value={formData.startup_name}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter your startup name"
                />
              </div>

              <div>
                <Label htmlFor="founder_email">Founder's Email *</Label>
                <Input
                  id="founder_email"
                  name="founder_email"
                  type="email"
                  value={formData.founder_email}
                  onChange={handleInputChange}
                  required
                  placeholder="founder@example.com"
                />
              </div>

              <div>
                <Label htmlFor="linkedin_profile_url">LinkedIn Profile URL</Label>
                <Input
                  id="linkedin_profile_url"
                  name="linkedin_profile_url"
                  value={formData.linkedin_profile_url}
                  onChange={handleInputChange}
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>

              <div>
                <Label htmlFor="problem_statement">Problem Statement *</Label>
                <Textarea
                  id="problem_statement"
                  name="problem_statement"
                  value={formData.problem_statement}
                  onChange={handleInputChange}
                  required
                  placeholder="What problem are you solving, and who experiences it most directly?"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="solution">Solution *</Label>
                <Textarea
                  id="solution"
                  name="solution"
                  value={formData.solution}
                  onChange={handleInputChange}
                  required
                  placeholder="What exactly are you building, in simple terms, and how does it address the problem?"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="market_understanding">Market Understanding *</Label>
                <Textarea
                  id="market_understanding"
                  name="market_understanding"
                  value={formData.market_understanding}
                  onChange={handleInputChange}
                  required
                  placeholder="How large is the opportunity, and why is now the right time?"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="customer_understanding">Customer Understanding *</Label>
                <Textarea
                  id="customer_understanding"
                  name="customer_understanding"
                  value={formData.customer_understanding}
                  onChange={handleInputChange}
                  required
                  placeholder="Who are your initial customers or users, and how do you plan to reach them?"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="competitive_understanding">Competitive Understanding *</Label>
                <Textarea
                  id="competitive_understanding"
                  name="competitive_understanding"
                  value={formData.competitive_understanding}
                  onChange={handleInputChange}
                  required
                  placeholder="Who else is addressing this problem (including substitutes), and how are they doing it?"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="unique_selling_proposition">Unique Selling Proposition (USP) *</Label>
                <Textarea
                  id="unique_selling_proposition"
                  name="unique_selling_proposition"
                  value={formData.unique_selling_proposition}
                  onChange={handleInputChange}
                  required
                  placeholder="What makes your solution unique, defensible, or hard to replicate?"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="technical_understanding">Technical Understanding *</Label>
                <Textarea
                  id="technical_understanding"
                  name="technical_understanding"
                  value={formData.technical_understanding}
                  onChange={handleInputChange}
                  required
                  placeholder="Outline the key components, infrastructure, or technical steps needed to build your product."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="vision">Vision *</Label>
                <Textarea
                  id="vision"
                  name="vision"
                  value={formData.vision}
                  onChange={handleInputChange}
                  required
                  placeholder="What's your long-term vision for building this startup?"
                  rows={4}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="campus_affiliation"
                  checked={formData.campus_affiliation}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, campus_affiliation: checked }))
                  }
                />
                <Label htmlFor="campus_affiliation">Campus-based startup</Label>
              </div>

              <div>
                <Label htmlFor="pdf_file">Upload PDF (Optional)</Label>
                <div className="mt-2">
                  <Input
                    id="pdf_file"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => handleFileChange(e, 'pdf')}
                    className="cursor-pointer"
                  />
                  {pdfFile && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Selected: {pdfFile.name}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="ppt_file">Upload PPT (Optional)</Label>
                <div className="mt-2">
                  <Input
                    id="ppt_file"
                    type="file"
                    accept=".ppt,.pptx"
                    onChange={(e) => handleFileChange(e, 'ppt')}
                    className="cursor-pointer"
                  />
                  {pptFile && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Selected: {pptFile.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Submit Startup Details
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};