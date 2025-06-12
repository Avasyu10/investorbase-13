
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIITBombayUser } from "@/hooks/useIITBombayUser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Upload, FileText, Building2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

const IITBombayForm = () => {
  const { user } = useAuth();
  const { isIITBombayUser, isLoading } = useIITBombayUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    companyName: "",
    founderName: "",
    founderEmail: "",
    companyStage: "",
    industry: "",
    description: "",
    executiveSummary: "",
    websiteUrl: "",
    fundingRequired: "",
    currentFunding: "",
    revenueModel: "",
    teamSize: "",
    location: ""
  });

  // Redirect if not an IIT Bombay user
  if (!isLoading && !isIITBombayUser) {
    navigate('/dashboard');
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('public_form_submissions')
        .insert({
          title: formData.companyName,
          description: formData.description,
          founder_name: formData.founderName,
          founder_email: formData.founderEmail,
          company_stage: formData.companyStage,
          industry: formData.industry,
          executive_summary: formData.executiveSummary,
          website_url: formData.websiteUrl,
          funds_raised: formData.currentFunding,
          valuation: formData.fundingRequired,
          products_services: formData.revenueModel,
          employee_count: formData.teamSize ? parseInt(formData.teamSize) : null,
          founder_address: formData.location,
          form_slug: 'iit-bombay-form',
          submitter_email: user.email
        });

      if (error) throw error;

      toast({
        title: "Application Submitted Successfully",
        description: "Your IIT Bombay startup application has been submitted for review.",
      });

      // Reset form
      setFormData({
        companyName: "",
        founderName: "",
        founderEmail: "",
        companyStage: "",
        industry: "",
        description: "",
        executiveSummary: "",
        websiteUrl: "",
        fundingRequired: "",
        currentFunding: "",
        revenueModel: "",
        teamSize: "",
        location: ""
      });

    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message || "There was an error submitting your application.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-orange-100 p-3 rounded-full">
            <GraduationCap className="h-8 w-8 text-orange-600" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">IIT Bombay Startup Application</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Submit your startup for consideration through the exclusive IIT Bombay entrepreneurship program.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-orange-600" />
            Startup Information
          </CardTitle>
          <CardDescription>
            Please provide detailed information about your startup and founding team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Enter your company name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="founderName">Founder Name *</Label>
                <Input
                  id="founderName"
                  value={formData.founderName}
                  onChange={(e) => setFormData({ ...formData, founderName: e.target.value })}
                  placeholder="Enter founder's full name"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="founderEmail">Founder Email *</Label>
                <Input
                  id="founderEmail"
                  type="email"
                  value={formData.founderEmail}
                  onChange={(e) => setFormData({ ...formData, founderEmail: e.target.value })}
                  placeholder="founder@company.com"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="websiteUrl">Website URL</Label>
                <Input
                  id="websiteUrl"
                  type="url"
                  value={formData.websiteUrl}
                  onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                  placeholder="https://yourcompany.com"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="companyStage">Company Stage *</Label>
                <Select value={formData.companyStage} onValueChange={(value) => setFormData({ ...formData, companyStage: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idea">Idea Stage</SelectItem>
                    <SelectItem value="mvp">MVP</SelectItem>
                    <SelectItem value="early-stage">Early Stage</SelectItem>
                    <SelectItem value="growth">Growth Stage</SelectItem>
                    <SelectItem value="expansion">Expansion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="industry">Industry *</Label>
                <Select value={formData.industry} onValueChange={(value) => setFormData({ ...formData, industry: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="fintech">FinTech</SelectItem>
                    <SelectItem value="edtech">EdTech</SelectItem>
                    <SelectItem value="ecommerce">E-commerce</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="agriculture">Agriculture</SelectItem>
                    <SelectItem value="energy">Energy</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Company Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide a brief description of your company and what it does"
                className="min-h-[100px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="executiveSummary">Executive Summary</Label>
              <Textarea
                id="executiveSummary"
                value={formData.executiveSummary}
                onChange={(e) => setFormData({ ...formData, executiveSummary: e.target.value })}
                placeholder="Provide a detailed executive summary of your business plan"
                className="min-h-[150px]"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="currentFunding">Current Funding Status</Label>
                <Input
                  id="currentFunding"
                  value={formData.currentFunding}
                  onChange={(e) => setFormData({ ...formData, currentFunding: e.target.value })}
                  placeholder="e.g., ₹10 lakhs seed funding"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fundingRequired">Funding Required</Label>
                <Input
                  id="fundingRequired"
                  value={formData.fundingRequired}
                  onChange={(e) => setFormData({ ...formData, fundingRequired: e.target.value })}
                  placeholder="e.g., ₹1 crore Series A"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="teamSize">Team Size</Label>
                <Input
                  id="teamSize"
                  type="number"
                  value={formData.teamSize}
                  onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                  placeholder="Number of team members"
                  min="1"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="City, State"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="revenueModel">Revenue Model & Business Strategy</Label>
              <Textarea
                id="revenueModel"
                value={formData.revenueModel}
                onChange={(e) => setFormData({ ...formData, revenueModel: e.target.value })}
                placeholder="Describe your revenue model, target market, and go-to-market strategy"
                className="min-h-[100px]"
              />
            </div>

            <div className="flex gap-4 pt-6">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Submit Application
                  </>
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="px-8"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default IITBombayForm;
