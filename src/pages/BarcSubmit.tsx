import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Loader2, Building, Plus, X } from "lucide-react";
import { submitBarcForm, analyzeBarcSubmission } from "@/lib/api/barc";

interface BarcFormData {
  companyName: string;
  executiveSummary: string;
  companyType: string;
  question1: string;
  question2: string;
  question3: string;
  question4: string;
  question5: string;
  phoneNumber: string;
  submitterEmail: string;
  founderLinkedInUrls: string[];
  pocName: string;
}

const BarcSubmit = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [founderLinkedIns, setFounderLinkedIns] = useState<string[]>([""]);

  const form = useForm<BarcFormData>({
    defaultValues: {
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
      founderLinkedInUrls: [""],
      pocName: "",
    },
  });

  // For BARC forms, we don't need to validate against database forms
  // Just ensure the slug exists and create a virtual form structure
  const { data: formData, isLoading: isLoadingForm } = useQuery({
    queryKey: ['barc-form', slug],
    queryFn: async () => {
      if (!slug) throw new Error("Form slug is required");
      
      // Return a virtual form for BARC submissions
      return {
        id: `barc-${slug}`,
        form_name: "Eureka Application Form",
        form_slug: slug,
        form_type: 'barc',
        is_active: true,
        user_id: slug,
        auto_analyze: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    },
    enabled: !!slug,
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

  // Submit form mutation - immediate analysis trigger
  const submitMutation = useMutation({
    mutationFn: async (formData: BarcFormData) => {
      if (!slug) throw new Error("Form slug is required");

      console.log('🚀 Starting BARC form submission and analysis:', { slug, formData });

      const submissionData = {
        form_slug: slug,
        company_name: formData.companyName,
        company_registration_type: "Not Specified",
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
        phoneno: formData.phoneNumber
      };

      console.log('📋 Submitting BARC form data:', submissionData);
      
      // Step 1: Submit the form
      const submission = await submitBarcForm(submissionData);
      console.log('✅ Form submitted successfully:', submission);

      // Step 2: Immediately trigger analysis
      console.log('🔬 Starting immediate analysis for submission:', submission.id);
      
      // Trigger analysis without waiting for it to complete
      analyzeBarcSubmission(submission.id).catch(error => {
        console.error('❌ Analysis failed:', error);
        // Don't throw here as we still want to redirect user
      });

      return submission;
    },
    onSuccess: (data) => {
      console.log('✅ BARC form submitted successfully - redirecting:', data);
      toast.success("🎉 Application submitted successfully! Analysis is starting automatically.");
      
      form.reset();
      setFounderLinkedIns([""]);
      
      // Navigate to thank you page immediately
      navigate('/thank-you', { replace: true });
    },
    onError: (error: any) => {
      console.error('❌ BARC form submission error:', error);
      
      // Provide more helpful error messages
      let errorMessage = 'Unknown error occurred';
      if (error.message) {
        if (error.message.includes('violates row-level security')) {
          errorMessage = 'Permission denied. Please contact support if this issue persists.';
        } else if (error.message.includes('duplicate key')) {
          errorMessage = 'This submission already exists.';
        } else if (error.message.includes('violates check constraint')) {
          errorMessage = 'Invalid data provided. Please check your form fields.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(`Failed to submit application: ${errorMessage}`);
    }
  });

  const onSubmit = (data: BarcFormData) => {
    console.log('📝 BARC form submit triggered:', data);
    
    // Basic validation
    if (!data.companyName.trim()) {
      toast.error("Company name is required");
      return;
    }
    if (!data.submitterEmail.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!data.pocName.trim()) {
      toast.error("POC name is required");
      return;
    }
    if (!data.phoneNumber.trim()) {
      toast.error("Phone number is required");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.submitterEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Validate LinkedIn URLs format (only founder LinkedIn URLs now)
    const invalidLinkedInUrls = founderLinkedIns.filter(url => {
      if (!url.trim()) return false; // Empty URLs are allowed
      return !url.includes('linkedin.com/');
    });

    if (invalidLinkedInUrls.length > 0) {
      toast.error("Please enter valid LinkedIn URLs (e.g., https://linkedin.com/in/username)");
      return;
    }

    console.log('✅ Validation passed, submitting...');
    submitMutation.mutate(data);
  };

  if (isLoadingForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading application form...</p>
        </div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Form Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The requested application form could not be found.
            </p>
            <Button onClick={() => navigate('/')}>
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-8 px-4">
      <div className="container mx-auto max-w-3xl">
        <Card>
          <CardHeader className="text-center border-b">
            <div className="flex items-center justify-center mb-4">
              <Building className="h-8 w-8 text-primary mr-2" />
              <CardTitle className="text-2xl">Eureka Application Form</CardTitle>
            </div>
            <CardDescription className="text-base">
              Submit your application - analysis will start automatically and you'll be redirected to confirmation
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Company Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Company Information</h3>
                  
                  <FormField
                    control={form.control}
                    name="companyName"
                    rules={{ required: "Company name is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your company name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="executiveSummary"
                    rules={{ required: "Executive summary is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Executive Summary *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Provide a brief executive summary of your company and business model"
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="companyType"
                    rules={{ required: "Industry is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your industry" />
                            </SelectTrigger>
                          </FormControl>
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
                        <FormMessage />
                        <p className="text-sm text-muted-foreground">
                          Please select the industry that best describes your company's primary focus
                        </p>
                      </FormItem>
                    )}
                  />
                </div>

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
                        disabled={submitMutation.isPending}
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
                          disabled={submitMutation.isPending}
                          className="flex-1"
                        />
                        {founderLinkedIns.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeLinkedInProfile(index)}
                            disabled={submitMutation.isPending}
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

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Application Questions</h3>
                  
                  <FormField
                    control={form.control}
                    name="question1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>1. What specific problem are you solving, and why is now the right time to solve it?</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the specific problem you are solving and the timing"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="question2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>2. Who are your first 10 customers or users, and how did you find or plan to find them?</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your target customers and customer acquisition strategy"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="question3"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>3. What is your unfair advantage or moat that will help you win over time?</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your competitive advantage and moat"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="question4"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>4. How does your team's background uniquely equip you to solve this problem?</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your team's background and expertise"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="question5"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>5. What milestones do you aim to achieve during the incubation period, and what support do you need from us to get there?</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your milestones and support needs"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Contact Information</h3>
                  
                  <FormField
                    control={form.control}
                    name="pocName"
                    rules={{ required: "POC name is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Point of Contact Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter the primary contact person's name" {...field} />
                        </FormControl>
                        <FormMessage />
                        <p className="text-sm text-muted-foreground">
                          Enter the name of the primary point of contact for your company.
                        </p>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="submitterEmail"
                    rules={{ 
                      required: "Email is required",
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "Please enter a valid email address"
                      }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter your email address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    rules={{ required: "Phone number is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting Application...
                    </>
                  ) : (
                    "Submit Application"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BarcSubmit;
