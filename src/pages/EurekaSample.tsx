
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, GraduationCap } from "lucide-react";

const EurekaSample = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    company_name: "",
    submitter_email: "",
    poc_name: "",
    phoneno: "",
    company_linkedin_url: "",
    company_registration_type: "",
    company_type: "",
    executive_summary: "",
    question_1: "",
    question_2: "",
    question_3: "",
    question_4: "",
    question_5: "",
    founder_linkedin_urls: [""]
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFounderLinkedInChange = (index: number, value: string) => {
    const newUrls = [...formData.founder_linkedin_urls];
    newUrls[index] = value;
    setFormData(prev => ({
      ...prev,
      founder_linkedin_urls: newUrls
    }));
  };

  const addFounderLinkedIn = () => {
    setFormData(prev => ({
      ...prev,
      founder_linkedin_urls: [...prev.founder_linkedin_urls, ""]
    }));
  };

  const removeFounderLinkedIn = (index: number) => {
    if (formData.founder_linkedin_urls.length > 1) {
      const newUrls = formData.founder_linkedin_urls.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        founder_linkedin_urls: newUrls
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('barc_form_submissions')
        .insert({
          ...formData,
          form_slug: slug || 'eureka-sample',
          founder_linkedin_urls: formData.founder_linkedin_urls.filter(url => url.trim() !== "")
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your application has been submitted successfully.",
      });

      navigate("/thank-you");
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Error",
        description: "There was an error submitting your application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <GraduationCap className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-gray-900">Eureka Sample Application</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Submit your startup application for consideration. Please fill out all required fields with accurate information.
          </p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="text-2xl">Application Form</CardTitle>
            <CardDescription className="text-blue-100">
              Please provide detailed information about your company and founding team.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Company Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Company Name *</Label>
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) => handleInputChange('company_name', e.target.value)}
                      required
                      className="border-gray-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company_linkedin_url">Company LinkedIn URL</Label>
                    <Input
                      id="company_linkedin_url"
                      type="url"
                      value={formData.company_linkedin_url}
                      onChange={(e) => handleInputChange('company_linkedin_url', e.target.value)}
                      placeholder="https://linkedin.com/company/yourcompany"
                      className="border-gray-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_registration_type">Company Registration Type</Label>
                    <Select value={formData.company_registration_type} onValueChange={(value) => handleInputChange('company_registration_type', value)}>
                      <SelectTrigger className="border-gray-300">
                        <SelectValue placeholder="Select registration type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private_limited">Private Limited Company</SelectItem>
                        <SelectItem value="public_limited">Public Limited Company</SelectItem>
                        <SelectItem value="llp">Limited Liability Partnership (LLP)</SelectItem>
                        <SelectItem value="partnership">Partnership</SelectItem>
                        <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company_type">Company Type</Label>
                    <Select value={formData.company_type} onValueChange={(value) => handleInputChange('company_type', value)}>
                      <SelectTrigger className="border-gray-300">
                        <SelectValue placeholder="Select company type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="startup">Startup</SelectItem>
                        <SelectItem value="sme">Small & Medium Enterprise</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                        <SelectItem value="nonprofit">Non-Profit</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="executive_summary">Executive Summary *</Label>
                  <Textarea
                    id="executive_summary"
                    value={formData.executive_summary}
                    onChange={(e) => handleInputChange('executive_summary', e.target.value)}
                    required
                    rows={4}
                    placeholder="Provide a brief executive summary of your company..."
                    className="border-gray-300"
                  />
                </div>
              </div>

              {/* Contact Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Contact Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="poc_name">Point of Contact Name *</Label>
                    <Input
                      id="poc_name"
                      value={formData.poc_name}
                      onChange={(e) => handleInputChange('poc_name', e.target.value)}
                      required
                      className="border-gray-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="submitter_email">Email Address *</Label>
                    <Input
                      id="submitter_email"
                      type="email"
                      value={formData.submitter_email}
                      onChange={(e) => handleInputChange('submitter_email', e.target.value)}
                      required
                      className="border-gray-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneno">Phone Number</Label>
                    <Input
                      id="phoneno"
                      type="tel"
                      value={formData.phoneno}
                      onChange={(e) => handleInputChange('phoneno', e.target.value)}
                      className="border-gray-300"
                    />
                  </div>
                </div>
              </div>

              {/* Founder LinkedIn URLs Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Founder Information</h3>
                
                <div className="space-y-3">
                  <Label>Founder LinkedIn Profiles</Label>
                  {formData.founder_linkedin_urls.map((url, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        type="url"
                        value={url}
                        onChange={(e) => handleFounderLinkedInChange(index, e.target.value)}
                        placeholder="https://linkedin.com/in/founder-name"
                        className="border-gray-300"
                      />
                      {formData.founder_linkedin_urls.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => removeFounderLinkedIn(index)}
                          className="px-3"
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
                    className="mt-2"
                  >
                    Add Another Founder
                  </Button>
                </div>
              </div>

              {/* Questions Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Additional Questions</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="question_1">What problem does your company solve?</Label>
                    <Textarea
                      id="question_1"
                      value={formData.question_1}
                      onChange={(e) => handleInputChange('question_1', e.target.value)}
                      rows={3}
                      className="border-gray-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="question_2">What is your target market and customer base?</Label>
                    <Textarea
                      id="question_2"
                      value={formData.question_2}
                      onChange={(e) => handleInputChange('question_2', e.target.value)}
                      rows={3}
                      className="border-gray-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="question_3">What is your business model and revenue strategy?</Label>
                    <Textarea
                      id="question_3"
                      value={formData.question_3}
                      onChange={(e) => handleInputChange('question_3', e.target.value)}
                      rows={3}
                      className="border-gray-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="question_4">What stage is your company currently in?</Label>
                    <Textarea
                      id="question_4"
                      value={formData.question_4}
                      onChange={(e) => handleInputChange('question_4', e.target.value)}
                      rows={3}
                      className="border-gray-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="question_5">What are your funding requirements and future plans?</Label>
                    <Textarea
                      id="question_5"
                      value={formData.question_5}
                      onChange={(e) => handleInputChange('question_5', e.target.value)}
                      rows={3}
                      className="border-gray-300"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6 border-t">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 text-lg font-semibold"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Submitting Application...
                    </>
                  ) : (
                    'Submit Application'
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
