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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Upload files first
      let pdfUrl = null;
      let pptUrl = null;

      const uploaderId = user?.id || 'anonymous';

      if (pdfFile) {
        const pdfPath = `${uploaderId}/${Date.now()}-${pdfFile.name}`;
        const { error: pdfError, data: pdfData } = await supabase.storage
          .from('startup-files')
          .upload(pdfPath, pdfFile);

        if (pdfError) throw pdfError;

        const { data: pdfUrlData } = supabase.storage
          .from('startup-files')
          .getPublicUrl(pdfPath);
        pdfUrl = pdfUrlData.publicUrl;
      }

      if (pptFile) {
        const pptPath = `${uploaderId}/${Date.now()}-${pptFile.name}`;
        const { error: pptError } = await supabase.storage
          .from('startup-files')
          .upload(pptPath, pptFile);

        if (pptError) throw pptError;

        const { data: pptUrlData } = supabase.storage
          .from('startup-files')
          .getPublicUrl(pptPath);
        pptUrl = pptUrlData.publicUrl;
      }

      // Insert submission
      const { error } = await supabase
        .from('startup_submissions')
        .insert({
          ...formData,
          user_id: user?.id || null,
          pdf_file_url: pdfUrl,
          ppt_file_url: pptUrl,
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your startup details have been submitted successfully.",
      });

      // Navigate to dashboard only if logged in
      if (user) {
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