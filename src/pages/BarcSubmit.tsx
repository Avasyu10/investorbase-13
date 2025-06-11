
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
import { Loader2, Building } from "lucide-react";
import { submitBarcForm } from "@/lib/api/barc";

interface BarcFormData {
  companyName: string;
  companyRegistrationType: string;
  executiveSummary: string;
  companyType: string;
  question1: string;
  question2: string;
  question3: string;
  question4: string;
  question5: string;
  submitterEmail: string;
}

const BarcSubmit = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const form = useForm<BarcFormData>({
    defaultValues: {
      companyName: "",
      companyRegistrationType: "",
      executiveSummary: "",
      companyType: "",
      question1: "",
      question2: "",
      question3: "",
      question4: "",
      question5: "",
      submitterEmail: "",
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
        form_name: "IIT Bombay Application Form",
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

  // Submit form mutation using the API function
  const submitMutation = useMutation({
    mutationFn: async (formData: BarcFormData) => {
      if (!slug) throw new Error("Form slug is required");

      console.log('Starting BARC form submission:', { slug, formData });

      const submissionData = {
        form_slug: slug,
        company_name: formData.companyName,
        company_registration_type: formData.companyRegistrationType,
        executive_summary: formData.executiveSummary,
        company_type: formData.companyType,
        question_1: formData.question1,
        question_2: formData.question2,
        question_3: formData.question3,
        question_4: formData.question4,
        question_5: formData.question5,
        submitter_email: formData.submitterEmail
      };

      console.log('Calling submitBarcForm API:', submissionData);
      
      // Use the API function which handles both submission and analysis trigger
      return await submitBarcForm(submissionData);
    },
    onSuccess: (data) => {
      console.log('BARC form submitted successfully:', data);
      toast.success("Application submitted successfully! Your submission is now available for analysis.");
      
      form.reset();
      
      // Navigate to home instead of dashboard to avoid logout
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);
    },
    onError: (error: any) => {
      console.error('BARC form submission error:', error);
      
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
    console.log('BARC form submit triggered:', data);
    
    // Basic validation
    if (!data.companyName.trim()) {
      toast.error("Company name is required");
      return;
    }
    if (!data.submitterEmail.trim()) {
      toast.error("Email is required");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.submitterEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    console.log('Validation passed, submitting...');
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="container mx-auto max-w-3xl">
        <Card>
          <CardHeader className="text-center border-b">
            <div className="flex items-center justify-center mb-4">
              <Building className="h-8 w-8 text-primary mr-2" />
              <CardTitle className="text-2xl">IIT Bombay Application Form</CardTitle>
            </div>
            <CardDescription className="text-base">
              Submit your application for the incubation program
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
                    name="companyRegistrationType"
                    rules={{ required: "Registration type is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Registered as *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select registration type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="sole-proprietorship">Sole Proprietorship</SelectItem>
                            <SelectItem value="private-limited">Private Limited Company</SelectItem>
                            <SelectItem value="partnership">Partnership</SelectItem>
                          </SelectContent>
                        </Select>
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
                    rules={{ required: "Company type is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select company type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="product-based">Product Based</SelectItem>
                            <SelectItem value="service-based">Service Based</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Application Questions */}
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

                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Contact Information</h3>
                  
                  <FormField
                    control={form.control}
                    name="submitterEmail"
                    rules={{ 
                      required: "Email is required",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Invalid email address"
                      }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email *</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="Enter your email address" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end pt-6">
                  <Button 
                    type="submit" 
                    disabled={submitMutation.isPending}
                    size="lg"
                  >
                    {submitMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Submit Application
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BarcSubmit;
