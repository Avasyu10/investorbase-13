
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Building2, ArrowLeft } from "lucide-react";

interface FormData {
  companyName: string;
  companyRegistrationType: string;
  executiveSummary: string;
  companyType: string;
  stage: string;
  question1: string;
  question2: string;
  question3: string;
  question4: string;
  question5: string;
  submitterEmail: string;
  pocName: string;
  phoneNo: string;
  companyLinkedinUrl: string;
  founderLinkedinUrls: string[];
}

const EurekaSample = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    companyRegistrationType: '',
    executiveSummary: '',
    companyType: '',
    stage: '',
    question1: '',
    question2: '',
    question3: '',
    question4: '',
    question5: '',
    submitterEmail: '',
    pocName: '',
    phoneNo: '',
    companyLinkedinUrl: '',
    founderLinkedinUrls: ['']
  });

  // Check if the form exists and is active
  const { data: form, isLoading: isFormLoading, error: formError } = useQuery({
    queryKey: ['public-form', slug],
    queryFn: async () => {
      if (!slug) return null;
      
      const { data, error } = await supabase
        .from('public_submission_forms')
        .select('*')
        .eq('form_slug', slug)
        .eq('form_type', 'barc')
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!slug
  });

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFounderLinkedInChange = (index: number, value: string) => {
    const newUrls = [...formData.founderLinkedinUrls];
    newUrls[index] = value;
    setFormData(prev => ({
      ...prev,
      founderLinkedinUrls: newUrls
    }));
  };

  const addFounderLinkedIn = () => {
    setFormData(prev => ({
      ...prev,
      founderLinkedinUrls: [...prev.founderLinkedinUrls, '']
    }));
  };

  const removeFounderLinkedIn = (index: number) => {
    if (formData.founderLinkedinUrls.length > 1) {
      const newUrls = formData.founderLinkedinUrls.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        founderLinkedinUrls: newUrls
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form) {
      toast.error("Form configuration not found");
      return;
    }

    setIsSubmitting(true);

    try {
      const submissionData = {
        form_slug: slug || '',
        company_name: formData.companyName,
        company_registration_type: formData.companyRegistrationType,
        executive_summary: formData.executiveSummary,
        company_type: `${formData.companyType} | Stage: ${formData.stage}`,
        question_1: formData.question1,
        question_2: formData.question2,
        question_3: formData.question3,
        question_4: formData.question4,
        question_5: formData.question5,
        submitter_email: formData.submitterEmail,
        poc_name: formData.pocName,
        phoneno: formData.phoneNo,
        company_linkedin_url: formData.companyLinkedinUrl,
        founder_linkedin_urls: formData.founderLinkedinUrls.filter(url => url.trim() !== ''),
        analysis_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('barc_form_submissions')
        .insert(submissionData);

      if (error) throw error;

      toast.success("Application submitted successfully!");
      navigate('/thank-you');
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast.error(`Failed to submit application: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isFormLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (formError || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Form Not Found</h3>
            <p className="text-muted-foreground text-center mb-4">
              The form you're looking for doesn't exist or is no longer active.
            </p>
            <Button onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">IIT Bombay Eureka Sample</h1>
          <p className="text-muted-foreground">
            Submit your startup application for review
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Startup Application Form</CardTitle>
            <CardDescription>
              Please fill out all the required information below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="companyRegistrationType">Registration Type</Label>
                  <Select value={formData.companyRegistrationType} onValueChange={(value) => handleInputChange('companyRegistrationType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select registration type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private_limited">Private Limited Company</SelectItem>
                      <SelectItem value="llp">Limited Liability Partnership (LLP)</SelectItem>
                      <SelectItem value="partnership">Partnership Firm</SelectItem>
                      <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
                      <SelectItem value="section_8">Section 8 Company</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="executiveSummary">Executive Summary</Label>
                <Textarea
                  id="executiveSummary"
                  value={formData.executiveSummary}
                  onChange={(e) => handleInputChange('executiveSummary', e.target.value)}
                  rows={3}
                  placeholder="Provide a brief overview of your company..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyType">Company Type</Label>
                  <Input
                    id="companyType"
                    value={formData.companyType}
                    onChange={(e) => handleInputChange('companyType', e.target.value)}
                    placeholder="e.g., Technology, Healthcare, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stage">Stage *</Label>
                  <Select value={formData.stage} onValueChange={(value) => handleInputChange('stage', value)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="idea">Idea Stage</SelectItem>
                      <SelectItem value="prototype">Prototype/MVP</SelectItem>
                      <SelectItem value="early_revenue">Early Revenue</SelectItem>
                      <SelectItem value="growth">Growth Stage</SelectItem>
                      <SelectItem value="scale">Scale Stage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="question1">Problem Statement & Solution *</Label>
                  <Textarea
                    id="question1"
                    value={formData.question1}
                    onChange={(e) => handleInputChange('question1', e.target.value)}
                    rows={3}
                    placeholder="Describe the problem you're solving and your solution..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="question2">Market Analysis & Target Customers *</Label>
                  <Textarea
                    id="question2"
                    value={formData.question2}
                    onChange={(e) => handleInputChange('question2', e.target.value)}
                    rows={3}
                    placeholder="Describe your target market and customers..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="question3">Competitive Advantage *</Label>
                  <Textarea
                    id="question3"
                    value={formData.question3}
                    onChange={(e) => handleInputChange('question3', e.target.value)}
                    rows={3}
                    placeholder="What makes your solution unique..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="question4">Team & Execution *</Label>
                  <Textarea
                    id="question4"
                    value={formData.question4}
                    onChange={(e) => handleInputChange('question4', e.target.value)}
                    rows={3}
                    placeholder="Tell us about your team and execution capability..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="question5">Business Model & Financials *</Label>
                  <Textarea
                    id="question5"
                    value={formData.question5}
                    onChange={(e) => handleInputChange('question5', e.target.value)}
                    rows={3}
                    placeholder="Describe your business model and financial projections..."
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="submitterEmail">Email *</Label>
                  <Input
                    id="submitterEmail"
                    type="email"
                    value={formData.submitterEmail}
                    onChange={(e) => handleInputChange('submitterEmail', e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="pocName">Contact Name</Label>
                  <Input
                    id="pocName"
                    value={formData.pocName}
                    onChange={(e) => handleInputChange('pocName', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNo">Phone Number</Label>
                  <Input
                    id="phoneNo"
                    value={formData.phoneNo}
                    onChange={(e) => handleInputChange('phoneNo', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="companyLinkedinUrl">Company LinkedIn</Label>
                  <Input
                    id="companyLinkedinUrl"
                    value={formData.companyLinkedinUrl}
                    onChange={(e) => handleInputChange('companyLinkedinUrl', e.target.value)}
                    placeholder="https://linkedin.com/company/..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Founder LinkedIn Profiles</Label>
                {formData.founderLinkedinUrls.map((url, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={url}
                      onChange={(e) => handleFounderLinkedInChange(index, e.target.value)}
                      placeholder="https://linkedin.com/in/..."
                    />
                    {formData.founderLinkedinUrls.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => removeFounderLinkedIn(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addFounderLinkedIn}
                  className="w-full"
                >
                  Add Founder Profile
                </Button>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EurekaSample;
