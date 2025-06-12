
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, CheckCircle, Building } from "lucide-react";

const BarcSubmit = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formExists, setFormExists] = useState<boolean | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    founder_name: "",
    founder_email: "",
    founder_contact: "",
    founder_gender: "",
    website_url: "",
    company_stage: "",
    industry: "",
    company_type: "",
    company_registration_type: "",
    registration_number: "",
    dpiit_recognition_number: "",
    indian_citizen_shareholding: "",
    employee_count: "",
    products_services: "",
    executive_summary: "",
    funds_raised: "",
    valuation: "",
    last_fy_revenue: "",
    last_quarter_revenue: "",
    question: ""
  });

  useEffect(() => {
    const checkFormExists = async () => {
      if (!slug) {
        setFormExists(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('public_submission_forms')
          .select('id, form_name, is_active')
          .eq('form_slug', slug)
          .eq('form_type', 'barc')
          .eq('is_active', true)
          .maybeSingle();

        if (error) {
          console.error("Error checking form:", error);
          setFormExists(false);
          return;
        }

        setFormExists(!!data);
      } catch (error) {
        console.error("Error:", error);
        setFormExists(false);
      }
    };

    checkFormExists();
  }, [slug]);

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast({
        title: "File required",
        description: "Please upload a pitch deck PDF",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `public-submissions/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('pitch-decks')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('pitch-decks')
        .getPublicUrl(filePath);

      // Submit form data
      const submissionData = {
        ...formData,
        form_slug: slug,
        pdf_url: publicUrl,
        employee_count: formData.employee_count ? parseInt(formData.employee_count) : null,
      };

      const { error: submitError } = await supabase
        .from('public_form_submissions')
        .insert([submissionData]);

      if (submitError) {
        throw submitError;
      }

      setIsSubmitted(true);
      toast({
        title: "Application submitted successfully",
        description: "Thank you for your submission. We will review it and get back to you.",
      });

    } catch (error: any) {
      console.error("Submission error:", error);
      toast({
        title: "Submission failed",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (formExists === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (formExists === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-destructive">Form Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              The application form you're looking for doesn't exist or is no longer active.
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-xl text-green-700">Application Submitted!</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Thank you for your application. We have received your submission and will review it shortly.
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader className="text-center border-b">
            <div className="flex items-center justify-center mb-4">
              <Building className="h-8 w-8 text-primary mr-2" />
              <CardTitle className="text-2xl">IIT Bombay Application Form</CardTitle>
            </div>
            <p className="text-muted-foreground">
              Please fill out all required fields to submit your application
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Company Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Company Name *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="website_url">Website URL</Label>
                    <Input
                      id="website_url"
                      type="url"
                      value={formData.website_url}
                      onChange={(e) => handleInputChange('website_url', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Company Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="company_stage">Company Stage</Label>
                    <Select onValueChange={(value) => handleInputChange('company_stage', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="idea">Idea</SelectItem>
                        <SelectItem value="prototype">Prototype</SelectItem>
                        <SelectItem value="pre-seed">Pre-seed</SelectItem>
                        <SelectItem value="seed">Seed</SelectItem>
                        <SelectItem value="series-a">Series A</SelectItem>
                        <SelectItem value="series-b">Series B</SelectItem>
                        <SelectItem value="growth">Growth</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="industry">Industry</Label>
                    <Input
                      id="industry"
                      value={formData.industry}
                      onChange={(e) => handleInputChange('industry', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="employee_count">Employee Count</Label>
                    <Input
                      id="employee_count"
                      type="number"
                      value={formData.employee_count}
                      onChange={(e) => handleInputChange('employee_count', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Founder Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Founder Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="founder_name">Founder Name *</Label>
                    <Input
                      id="founder_name"
                      value={formData.founder_name}
                      onChange={(e) => handleInputChange('founder_name', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="founder_email">Founder Email *</Label>
                    <Input
                      id="founder_email"
                      type="email"
                      value={formData.founder_email}
                      onChange={(e) => handleInputChange('founder_email', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="founder_contact">Contact Number</Label>
                    <Input
                      id="founder_contact"
                      value={formData.founder_contact}
                      onChange={(e) => handleInputChange('founder_contact', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="founder_gender">Gender</Label>
                    <Select onValueChange={(value) => handleInputChange('founder_gender', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Business Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Business Details</h3>
                
                <div>
                  <Label htmlFor="executive_summary">Executive Summary</Label>
                  <Textarea
                    id="executive_summary"
                    value={formData.executive_summary}
                    onChange={(e) => handleInputChange('executive_summary', e.target.value)}
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="products_services">Products/Services</Label>
                  <Textarea
                    id="products_services"
                    value={formData.products_services}
                    onChange={(e) => handleInputChange('products_services', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="funds_raised">Funds Raised</Label>
                    <Input
                      id="funds_raised"
                      value={formData.funds_raised}
                      onChange={(e) => handleInputChange('funds_raised', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="valuation">Current Valuation</Label>
                    <Input
                      id="valuation"
                      value={formData.valuation}
                      onChange={(e) => handleInputChange('valuation', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="last_fy_revenue">Last FY Revenue</Label>
                    <Input
                      id="last_fy_revenue"
                      value={formData.last_fy_revenue}
                      onChange={(e) => handleInputChange('last_fy_revenue', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="last_quarter_revenue">Last Quarter Revenue</Label>
                    <Input
                      id="last_quarter_revenue"
                      value={formData.last_quarter_revenue}
                      onChange={(e) => handleInputChange('last_quarter_revenue', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Document Upload */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Document Upload</h3>
                
                <div>
                  <Label htmlFor="pitch-deck">Pitch Deck (PDF) *</Label>
                  <Input
                    id="pitch-deck"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    required
                  />
                  {file && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Selected: {file.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Additional Information</h3>
                
                <div>
                  <Label htmlFor="question">Any specific questions or additional information?</Label>
                  <Textarea
                    id="question"
                    value={formData.question}
                    onChange={(e) => handleInputChange('question', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting Application...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Submit Application
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BarcSubmit;
