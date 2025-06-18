
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Building, Plus, X } from "lucide-react";

const BarcSubmit = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [founderLinkedIns, setFounderLinkedIns] = useState<string[]>([""]);
  
  // Form state
  const [formData, setFormData] = useState({
    companyName: "",
    executiveSummary: "",
    companyType: "",
    question1: "",
    question2: "",
    question3: "",
    question4: "",
    question5: "",
    phoneNumber: "",
    submitterEmail: "",
    pocName: "",
    companyLinkedInUrl: "",
    companyRegistrationType: "",
  });

  const addLinkedInProfile = () => {
    setFounderLinkedIns(prev => [...prev, ""]);
  };

  const removeLinkedInProfile = (index: number) => {
    setFounderLinkedIns(prev => prev.filter((_, i) => i !== index));
  };

  const updateLinkedInProfile = (index: number, value: string) => {
    setFounderLinkedIns(prev => 
      prev.map((profile, i) => i === index ? value : profile)
    );
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📝 BARC form submit triggered:', { slug, formData });
    
    // Basic validation
    if (!formData.companyName.trim()) {
      toast({
        title: "Error",
        description: "Company name is required",
        variant: "destructive",
      });
      return;
    }
    if (!formData.submitterEmail.trim()) {
      toast({
        title: "Error", 
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }
    if (!formData.pocName.trim()) {
      toast({
        title: "Error",
        description: "POC name is required", 
        variant: "destructive",
      });
      return;
    }
    if (!formData.phoneNumber.trim()) {
      toast({
        title: "Error",
        description: "Phone number is required",
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.submitterEmail)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    // Validate LinkedIn URLs format
    const invalidLinkedInUrls = founderLinkedIns.filter(url => {
      if (!url.trim()) return false; // Empty URLs are allowed
      return !url.includes('linkedin.com/');
    });

    if (invalidLinkedInUrls.length > 0) {
      toast({
        title: "Error",
        description: "Please enter valid LinkedIn URLs (e.g., https://linkedin.com/in/username)",
        variant: "destructive",
      });
      return;
    }

    console.log('✅ Validation passed, submitting...');
    setIsSubmitting(true);

    try {
      // Insert into barc_form_submissions table 
      const { data: submission, error: insertError } = await supabase
        .from('barc_form_submissions')
        .insert({
          form_slug: slug || 'iit-bombay-default', // Use slug or default for old forms
          company_name: formData.companyName,
          company_registration_type: formData.companyRegistrationType || "Not Specified",
          executive_summary: formData.executiveSummary,
          company_type: formData.companyType,
          question_1: formData.question1,
          question_2: formData.question2,
          question_3: formData.question3,
          question_4: formData.question4,
          question_5: formData.question5,
          submitter_email: formData.submitterEmail,
          founder_linkedin_urls: founderLinkedIns.filter(url => url.trim()),
          poc_name: formData.pocName,
          phoneno: formData.phoneNumber,
          company_linkedin_url: formData.companyLinkedInUrl
        })
        .select()
        .single();

      if (insertError) throw insertError;

      console.log('✅ Submission created:', submission.id);

      // Call the centralized routing function instead of direct analysis
      console.log('🔍 Starting analysis via centralized router...');
      const { data: routingData, error: routingError } = await supabase.functions.invoke('route-submission-analysis', {
        body: { submissionId: submission.id }
      });

      if (routingError) {
        console.error('Routing error:', routingError);
        toast({
          title: "Submission successful, but analysis failed",
          description: "Your application was submitted but automatic analysis encountered an error. Our team will review it manually.",
          variant: "destructive",
        });
      } else {
        console.log('✅ Analysis completed via router:', routingData);
        toast({
          title: "Success!",
          description: "🎉 Application submitted and analyzed successfully!",
        });
      }

      // Reset form
      setFormData({
        companyName: "",
        executiveSummary: "",
        companyType: "",
        question1: "",
        question2: "",
        question3: "",
        question4: "",
        question5: "",
        phoneNumber: "",
        submitterEmail: "",
        pocName: "",
        companyLinkedInUrl: "",
        companyRegistrationType: "",
      });
      setFounderLinkedIns([""]);
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
    <div className="min-h-screen bg-black py-8 px-4">
      <div className="container mx-auto max-w-3xl">
        <Card>
          <CardHeader className="text-center border-b">
            <div className="flex items-center justify-center mb-4">
              <Building className="h-8 w-8 text-primary mr-2" />
              <CardTitle className="text-2xl">BARC Application Form</CardTitle>
            </div>
            <CardDescription className="text-base">
              Submit your application for {slug} - analysis will start automatically and you'll be redirected to confirmation
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Company Information</h3>
                
                <div>
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    placeholder="Enter your company name"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="companyLinkedInUrl">Company LinkedIn URL</Label>
                    <Input
                      id="companyLinkedInUrl"
                      type="url"
                      placeholder="https://linkedin.com/company/yourcompany"
                      value={formData.companyLinkedInUrl}
                      onChange={(e) => handleInputChange('companyLinkedInUrl', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="companyRegistrationType">Company Registration Type</Label>
                    <Select onValueChange={(value) => handleInputChange('companyRegistrationType', value)}>
                      <SelectTrigger>
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
                </div>

                <div>
                  <Label htmlFor="executiveSummary">Executive Summary *</Label>
                  <Textarea
                    id="executiveSummary"
                    placeholder="Provide a brief executive summary of your company and business model"
                    className="min-h-[120px]"
                    value={formData.executiveSummary}
                    onChange={(e) => handleInputChange('executiveSummary', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="companyType">Industry *</Label>
                  <Select onValueChange={(value) => handleInputChange('companyType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Artificial Intelligence & Machine Learning">Artificial Intelligence & Machine Learning</SelectItem>
                      <SelectItem value="Software as a Service (SaaS)">Software as a Service (SaaS)</SelectItem>
                      <SelectItem value="Financial Technology (Fintech)">Financial Technology (Fintech)</SelectItem>
                      <SelectItem value="Healthcare & Medical Technology">Healthcare & Medical Technology</SelectItem>
                      <SelectItem value="Biotechnology & Life Sciences">Biotechnology & Life Sciences</SelectItem>
                      <SelectItem value="Education Technology (EdTech)">Education Technology (EdTech)</SelectItem>
                      <SelectItem value="Clean Technology & Sustainability">Clean Technology & Sustainability</SelectItem>
                      <SelectItem value="E-commerce & Retail">E-commerce & Retail</SelectItem>
                      <SelectItem value="Enterprise Software">Enterprise Software</SelectItem>
                      <SelectItem value="Cybersecurity">Cybersecurity</SelectItem>
                      <SelectItem value="Gaming & Entertainment">Gaming & Entertainment</SelectItem>
                      <SelectItem value="Augmented Reality & Virtual Reality">Augmented Reality & Virtual Reality</SelectItem>
                      <SelectItem value="Blockchain & Cryptocurrency">Blockchain & Cryptocurrency</SelectItem>
                      <SelectItem value="Agriculture Technology (AgTech)">Agriculture Technology (AgTech)</SelectItem>
                      <SelectItem value="Real Estate Technology">Real Estate Technology</SelectItem>
                      <SelectItem value="Robotics & Automation">Robotics & Automation</SelectItem>
                      <SelectItem value="Hardware & IoT">Hardware & IoT</SelectItem>
                      <SelectItem value="Social Media & Communication">Social Media & Communication</SelectItem>
                      <SelectItem value="Media & Content Creation">Media & Content Creation</SelectItem>
                      <SelectItem value="Travel & Hospitality">Travel & Hospitality</SelectItem>
                      <SelectItem value="Space Technology">Space Technology</SelectItem>
                      <SelectItem value="Logistics & Supply Chain">Logistics & Supply Chain</SelectItem>
                      <SelectItem value="Energy & Utilities">Energy & Utilities</SelectItem>
                      <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="Food & Beverage">Food & Beverage</SelectItem>
                      <SelectItem value="Fashion & Lifestyle">Fashion & Lifestyle</SelectItem>
                      <SelectItem value="Sports & Fitness">Sports & Fitness</SelectItem>
                      <SelectItem value="Automotive">Automotive</SelectItem>
                      <SelectItem value="Telecommunications">Telecommunications</SelectItem>
                      <SelectItem value="Marketplace & Platform">Marketplace & Platform</SelectItem>
                      <SelectItem value="Consulting & Professional Services">Consulting & Professional Services</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please select the industry that best describes your company's primary focus
                  </p>
                </div>
              </div>

              {/* Founder Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Founder Information</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium">Founder LinkedIn Profiles (Optional)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addLinkedInProfile}
                      disabled={isSubmitting}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Profile
                    </Button>
                  </div>
                  
                  {founderLinkedIns.map((url, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="https://linkedin.com/in/username"
                        value={url}
                        onChange={(e) => updateLinkedInProfile(index, e.target.value)}
                        disabled={isSubmitting}
                        className="flex-1"
                      />
                      {founderLinkedIns.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeLinkedInProfile(index)}
                          disabled={isSubmitting}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  <p className="text-sm text-muted-foreground">
                    Add LinkedIn profiles of founders/co-founders for team analysis. These will be used to assess team background and experience.
                  </p>
                </div>
              </div>

              {/* Application Questions */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Application Questions</h3>
                
                <div>
                  <Label htmlFor="question1">1. What specific problem are you solving, and why is now the right time to solve it?</Label>
                  <Textarea
                    id="question1"
                    placeholder="Describe the specific problem you are solving and the timing"
                    value={formData.question1}
                    onChange={(e) => handleInputChange('question1', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="question2">2. Who are your first 10 customers or users, and how did you find or plan to find them?</Label>
                  <Textarea
                    id="question2"
                    placeholder="Describe your target customers and customer acquisition strategy"
                    value={formData.question2}
                    onChange={(e) => handleInputChange('question2', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="question3">3. What is your unfair advantage or moat that will help you win over time?</Label>
                  <Textarea
                    id="question3"
                    placeholder="Describe your competitive advantage and moat"
                    value={formData.question3}
                    onChange={(e) => handleInputChange('question3', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="question4">4. How does your team's background uniquely equip you to solve this problem?</Label>
                  <Textarea
                    id="question4"
                    placeholder="Describe your team's background and expertise"
                    value={formData.question4}
                    onChange={(e) => handleInputChange('question4', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="question5">5. What milestones do you aim to achieve during the incubation period, and what support do you need from us to get there?</Label>
                  <Textarea
                    id="question5"
                    placeholder="Describe your milestones and support needs"
                    value={formData.question5}
                    onChange={(e) => handleInputChange('question5', e.target.value)}
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Contact Information</h3>
                
                <div>
                  <Label htmlFor="pocName">Point of Contact Name *</Label>
                  <Input
                    id="pocName"
                    placeholder="Enter the primary contact person's name"
                    value={formData.pocName}
                    onChange={(e) => handleInputChange('pocName', e.target.value)}
                    required
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter the name of the primary point of contact for your company.
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="submitterEmail">Email *</Label>
                  <Input
                    id="submitterEmail"
                    type="email"
                    placeholder="Enter your email address"
                    value={formData.submitterEmail}
                    onChange={(e) => handleInputChange('submitterEmail', e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="phoneNumber">Phone Number *</Label>
                  <Input
                    id="phoneNumber"
                    placeholder="Enter your phone number"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting Application...
                  </>
                ) : (
                  "Submit Application"
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
