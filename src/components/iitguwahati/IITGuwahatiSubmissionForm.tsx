import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export const IITGuwahatiSubmissionForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    startup_name: "",
    founder_name: "",
    submitter_email: "",
    linkedin_url: "",
    phone_number: "",
    domain_and_problem: "",
    target_market_size: "",
    unique_proposition: "",
    product_type_and_stage: "",
    primary_revenue_model: "",
    ltv_cac_ratio: "",
    total_funding_sought: "",
    key_traction_metric: "",
    ip_moat_status: "",
    twelve_month_roadmap: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        toast({
          title: "Error",
          description: "You must be logged in to submit an application.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const insertPayload = {
        startup_name: formData.startup_name.trim(),
        submitter_email: formData.submitter_email.trim(),
        founder_name: formData.founder_name?.trim() || null,
        linkedin_url: formData.linkedin_url?.trim() || null,
        phone_number: formData.phone_number?.trim() || null,
        domain_and_problem: formData.domain_and_problem?.trim() || null,
        target_market_size: formData.target_market_size?.trim() || null,
        unique_proposition: formData.unique_proposition?.trim() || null,
        product_type_and_stage: formData.product_type_and_stage?.trim() || null,
        primary_revenue_model: formData.primary_revenue_model?.trim() || null,
        ltv_cac_ratio: formData.ltv_cac_ratio?.trim() || null,
        total_funding_sought: formData.total_funding_sought?.trim() || null,
        key_traction_metric: formData.key_traction_metric?.trim() || null,
        ip_moat_status: formData.ip_moat_status?.trim() || null,
        twelve_month_roadmap: formData.twelve_month_roadmap?.trim() || null,
        user_id: session.user.id,
        form_slug: "iitguwahati-incubator",
      };

      const { data, error } = await supabase
        .from("iitguwahati_form_submissions")
        .insert(insertPayload)
        .select('id')
        .single();

      if (error) {
        console.error("Supabase insert error:", error);
        throw new Error(error.message || "Database error");
      }

      // Trigger auto-evaluation in the background
      if (data?.id) {
        supabase.functions.invoke('auto-evaluate-iitguwahati', {
          body: { submissionId: data.id }
        }).then(response => {
          console.log('Auto-evaluation triggered:', response);
        }).catch(err => {
          console.error('Auto-evaluation error:', err);
        });
      }

      toast({
        title: "Success",
        description: "Application submitted successfully! AI evaluation is running...",
      });

      navigate("/iitguwahati-dashboard");
    } catch (error: any) {
      console.error("Submission error:", error);
      
      const errorMessage = error?.message?.includes("fetch") 
        ? "Network error. Please check your connection and try again."
        : error?.message || "Failed to submit application. Please try again.";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const sectionClass = "space-y-4 p-6 rounded-lg bg-[#111422] border border-[#23262F]";
  const labelClass = "text-white font-medium";

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card className="bg-[#0c0e18] border-[#23262F]">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-white">IIT Guwahati Incubator Application</CardTitle>
          <CardDescription className="text-gray-400">
            Submit your startup for evaluation and incubation consideration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info */}
            <div className={sectionClass}>
              <h3 className="text-xl font-semibold text-[rgb(245,168,61)] mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={labelClass}>Startup Name *</Label>
                  <Input
                    name="startup_name"
                    value={formData.startup_name}
                    onChange={handleChange}
                    required
                    className="bg-[#1a1d2e] border-[#23262F] text-white"
                    placeholder="Enter startup name"
                  />
                </div>
                <div className="space-y-2">
                  <Label className={labelClass}>Founder Name</Label>
                  <Input
                    name="founder_name"
                    value={formData.founder_name}
                    onChange={handleChange}
                    className="bg-[#1a1d2e] border-[#23262F] text-white"
                    placeholder="Enter founder name"
                  />
                </div>
                <div className="space-y-2">
                  <Label className={labelClass}>Email *</Label>
                  <Input
                    name="submitter_email"
                    type="email"
                    value={formData.submitter_email}
                    onChange={handleChange}
                    required
                    className="bg-[#1a1d2e] border-[#23262F] text-white"
                    placeholder="Enter email address"
                  />
                </div>
                <div className="space-y-2">
                  <Label className={labelClass}>Phone Number</Label>
                  <Input
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    className="bg-[#1a1d2e] border-[#23262F] text-white"
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className={labelClass}>LinkedIn URL</Label>
                  <Input
                    name="linkedin_url"
                    value={formData.linkedin_url}
                    onChange={handleChange}
                    className="bg-[#1a1d2e] border-[#23262F] text-white"
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
              </div>
            </div>

            {/* I. The Problem */}
            <div className={sectionClass}>
              <h3 className="text-xl font-semibold text-[rgb(245,168,61)] mb-4">I. The Problem</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className={labelClass}>Domain & Problem</Label>
                  <Textarea
                    name="domain_and_problem"
                    value={formData.domain_and_problem}
                    onChange={handleChange}
                    className="bg-[#1a1d2e] border-[#23262F] text-white min-h-[100px]"
                    placeholder="Describe your industry and the core pain point you're addressing"
                  />
                </div>
                <div className="space-y-2">
                  <Label className={labelClass}>Target Market Size (TAM/SAM/SOM)</Label>
                  <Input
                    name="target_market_size"
                    value={formData.target_market_size}
                    onChange={handleChange}
                    className="bg-[#1a1d2e] border-[#23262F] text-white"
                    placeholder="e.g., $5B TAM, $500M SAM, $50M SOM"
                  />
                </div>
              </div>
            </div>

            {/* II. The Solution */}
            <div className={sectionClass}>
              <h3 className="text-xl font-semibold text-[rgb(245,168,61)] mb-4">II. The Solution</h3>
              <div className="space-y-2">
                <Label className={labelClass}>Unique Proposition & Differentiator</Label>
                <Textarea
                  name="unique_proposition"
                  value={formData.unique_proposition}
                  onChange={handleChange}
                  className="bg-[#1a1d2e] border-[#23262F] text-white min-h-[100px]"
                  placeholder="What is your innovative core and key competitive advantage?"
                />
              </div>
            </div>

            {/* III. The Product */}
            <div className={sectionClass}>
              <h3 className="text-xl font-semibold text-[rgb(245,168,61)] mb-4">III. The Product</h3>
              <div className="space-y-2">
                <Label className={labelClass}>Product Type & Stage</Label>
                <Input
                  name="product_type_and_stage"
                  value={formData.product_type_and_stage}
                  onChange={handleChange}
                  className="bg-[#1a1d2e] border-[#23262F] text-white"
                  placeholder="e.g., SaaS Platform / MVP, Hardware / Prototype"
                />
              </div>
            </div>

            {/* IV. Business Model */}
            <div className={sectionClass}>
              <h3 className="text-xl font-semibold text-[rgb(245,168,61)] mb-4">IV. Business Model</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={labelClass}>Primary Revenue Model</Label>
                  <Input
                    name="primary_revenue_model"
                    value={formData.primary_revenue_model}
                    onChange={handleChange}
                    className="bg-[#1a1d2e] border-[#23262F] text-white"
                    placeholder="e.g., Subscription, Transaction Fee, Licensing"
                  />
                </div>
                <div className="space-y-2">
                  <Label className={labelClass}>LTV:CAC Ratio (Projected/Actual)</Label>
                  <Input
                    name="ltv_cac_ratio"
                    value={formData.ltv_cac_ratio}
                    onChange={handleChange}
                    className="bg-[#1a1d2e] border-[#23262F] text-white"
                    placeholder="e.g., 3:1 (projected)"
                  />
                </div>
              </div>
            </div>

            {/* V. Finances */}
            <div className={sectionClass}>
              <h3 className="text-xl font-semibold text-[rgb(245,168,61)] mb-4">V. Finances</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={labelClass}>Total Funding Sought ($)</Label>
                  <Input
                    name="total_funding_sought"
                    value={formData.total_funding_sought}
                    onChange={handleChange}
                    className="bg-[#1a1d2e] border-[#23262F] text-white"
                    placeholder="e.g., $500,000"
                  />
                </div>
                <div className="space-y-2">
                  <Label className={labelClass}>Key Traction Metric</Label>
                  <Input
                    name="key_traction_metric"
                    value={formData.key_traction_metric}
                    onChange={handleChange}
                    className="bg-[#1a1d2e] border-[#23262F] text-white"
                    placeholder="e.g., $10K MRR, 5,000 Users, 3 Pilot Customers"
                  />
                </div>
              </div>
            </div>

            {/* VI. Patents & Legalities */}
            <div className={sectionClass}>
              <h3 className="text-xl font-semibold text-[rgb(245,168,61)] mb-4">VI. Patents & Legalities</h3>
              <div className="space-y-2">
                <Label className={labelClass}>IP/Moat Status</Label>
                <Input
                  name="ip_moat_status"
                  value={formData.ip_moat_status}
                  onChange={handleChange}
                  className="bg-[#1a1d2e] border-[#23262F] text-white"
                  placeholder="e.g., Patent Filed, Trademarked, Trade Secret, None"
                />
              </div>
            </div>

            {/* VII. Future Goals */}
            <div className={sectionClass}>
              <h3 className="text-xl font-semibold text-[rgb(245,168,61)] mb-4">VII. Future Goals</h3>
              <div className="space-y-2">
                <Label className={labelClass}>12-Month Roadmap Key Milestone</Label>
                <Textarea
                  name="twelve_month_roadmap"
                  value={formData.twelve_month_roadmap}
                  onChange={handleChange}
                  className="bg-[#1a1d2e] border-[#23262F] text-white min-h-[100px]"
                  placeholder="What is your biggest goal for the next year? (e.g., Launch V2, Enter EU Market, Reach $100K MRR)"
                />
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/iitguwahati-dashboard")}
                className="border-[#23262F] text-gray-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                style={{ backgroundColor: 'rgb(245,168,61)' }}
                className="text-black font-semibold hover:opacity-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Application"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
