
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
        company_type: `${formData.companyType} | Stage: ${formData.stage}`, // Include stage in company_type
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Building2 className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">IIT Bombay Eureka Sample</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Submit your startup application for review. Please provide detailed information about your company and innovation.
          </p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="text-2xl font-bold text-center">
              Startup Application Form
            </CardTitle>
            <CardDescription className="text-blue-100 text-center text-lg">
              Fill out all required fields to submit your application
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Company Information Section */}
              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Company Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="text-sm font-medium text-gray-700">
                      Company Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      className="border-gray-300 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="companyRegistrationType" className="text-sm font-medium text-gray-700">
                      Registration Type
                    </Label>
                    <Select value={formData.companyRegistrationType} onValueChange={(value) => handleInputChange('companyRegistrationType', value)}>
                      <SelectTrigger className="border-gray-300 focus:border-blue-500">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="companyType" className="text-sm font-medium text-gray-700">
                      Industry/Sector
                    </Label>
                    <Input
                      id="companyType"
                      value={formData.companyType}
                      onChange={(e) => handleInputChange('companyType', e.target.value)}
                      placeholder="e.g., FinTech, HealthTech, EdTech, AgriTech"
                      className="border-gray-300 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="stage" className="text-sm font-medium text-gray-700">
                      Company Stage <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.stage} onValueChange={(value) => handleInputChange('stage', value)} required>
                      <SelectTrigger className="border-gray-300 focus:border-blue-500">
                        <SelectValue placeholder="Select company stage" />
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

                <div className="space-y-2">
                  <Label htmlFor="executiveSummary" className="text-sm font-medium text-gray-700">
                    Executive Summary
                  </Label>
                  <Textarea
                    id="executiveSummary"
                    value={formData.executiveSummary}
                    onChange={(e) => handleInputChange('executiveSummary', e.target.value)}
                    rows={4}
                    placeholder="Provide a concise overview of your company, including your mission, vision, and key value proposition..."
                    className="border-gray-300 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Application Questions Section */}
              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Application Questions</h3>
                  <p className="text-gray-600">Please provide detailed responses to the following questions</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="question1" className="text-sm font-medium text-gray-700">
                      1. Problem Statement & Solution <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="question1"
                      value={formData.question1}
                      onChange={(e) => handleInputChange('question1', e.target.value)}
                      rows={4}
                      placeholder="Describe the problem you're solving and your innovative solution approach..."
                      className="border-gray-300 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="question2" className="text-sm font-medium text-gray-700">
                      2. Market Analysis & Target Customers <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="question2"
                      value={formData.question2}
                      onChange={(e) => handleInputChange('question2', e.target.value)}
                      rows={4}
                      placeholder="Explain your target market, customer segments, and go-to-market strategy..."
                      className="border-gray-300 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="question3" className="text-sm font-medium text-gray-700">
                      3. Competitive Advantage & Innovation <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="question3"
                      value={formData.question3}
                      onChange={(e) => handleInputChange('question3', e.target.value)}
                      rows={4}
                      placeholder="What makes your solution unique? Describe your competitive advantages and innovation..."
                      className="border-gray-300 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="question4" className="text-sm font-medium text-gray-700">
                      4. Team & Execution Capability <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="question4"
                      value={formData.question4}
                      onChange={(e) => handleInputChange('question4', e.target.value)}
                      rows={4}
                      placeholder="Tell us about your founding team, key members, and your execution track record..."
                      className="border-gray-300 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="question5" className="text-sm font-medium text-gray-700">
                      5. Business Model & Financial Projections <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="question5"
                      value={formData.question5}
                      onChange={(e) => handleInputChange('question5', e.target.value)}
                      rows={4}
                      placeholder="Describe your revenue model, current financial status, and growth projections..."
                      className="border-gray-300 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information Section */}
              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Contact Information</h3>
                  <p className="text-gray-600">Provide your contact details for follow-up communication</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="submitterEmail" className="text-sm font-medium text-gray-700">
                      Email Address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="submitterEmail"
                      type="email"
                      value={formData.submitterEmail}
                      onChange={(e) => handleInputChange('submitterEmail', e.target.value)}
                      className="border-gray-300 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="pocName" className="text-sm font-medium text-gray-700">
                      Primary Contact Name
                    </Label>
                    <Input
                      id="pocName"
                      value={formData.pocName}
                      onChange={(e) => handleInputChange('pocName', e.target.value)}
                      className="border-gray-300 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="phoneNo" className="text-sm font-medium text-gray-700">
                      Phone Number
                    </Label>
                    <Input
                      id="phoneNo"
                      value={formData.phoneNo}
                      onChange={(e) => handleInputChange('phoneNo', e.target.value)}
                      placeholder="+91 XXXXX XXXXX"
                      className="border-gray-300 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="companyLinkedinUrl" className="text-sm font-medium text-gray-700">
                      Company LinkedIn URL
                    </Label>
                    <Input
                      id="companyLinkedinUrl"
                      value={formData.companyLinkedinUrl}
                      onChange={(e) => handleInputChange('companyLinkedinUrl', e.target.value)}
                      placeholder="https://linkedin.com/company/your-company"
                      className="border-gray-300 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-sm font-medium text-gray-700">Founder LinkedIn Profiles</Label>
                  {formData.founderLinkedinUrls.map((url, index) => (
                    <div key={index} className="flex gap-3">
                      <Input
                        value={url}
                        onChange={(e) => handleFounderLinkedInChange(index, e.target.value)}
                        placeholder={`https://linkedin.com/in/founder-${index + 1}`}
                        className="border-gray-300 focus:border-blue-500"
                      />
                      {formData.founderLinkedinUrls.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => removeFounderLinkedIn(index)}
                          className="px-4"
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
                    className="w-full border-dashed border-2 border-gray-300 hover:border-blue-500"
                  >
                    + Add Another Founder Profile
                  </Button>
                </div>
              </div>

              <div className="pt-6 border-t">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 text-lg"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                      Submitting Application...
                    </>
                  ) : (
                    <>
                      <Building2 className="h-5 w-5 mr-3" />
                      Submit Application
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EurekaSample;
