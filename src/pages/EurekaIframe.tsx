
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building, Plus, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { submitEurekaForm, type EurekaSubmissionData } from "@/lib/api/eureka";
import { useAuth } from "@/hooks/useAuth";

interface EurekaFormData {
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
  companyLinkedInUrl: string;
  companyRegistrationType: string;
}

const EurekaIframe = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [founderLinkedIns, setFounderLinkedIns] = useState<string[]>([""]);

  // Debug logging
  console.log('🎯 EurekaIframe component loaded successfully');
  console.log('📍 Current slug:', slug);
  console.log('🔍 Current authenticated user:', user);
  console.log('🔍 User ID that will be submitted:', user?.id);

  const form = useForm<EurekaFormData>({
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
      companyLinkedInUrl: "",
      companyRegistrationType: "",
    },
  });

  const addLinkedInProfile = () => {
    console.log('➕ Adding LinkedIn profile');
    setFounderLinkedIns(prev => [...prev, ""]);
  };

  const removeLinkedInProfile = (index: number) => {
    console.log('➖ Removing LinkedIn profile at index:', index);
    setFounderLinkedIns(prev => prev.filter((_, i) => i !== index));
  };

  const updateLinkedInProfile = (index: number, value: string) => {
    console.log('✏️ Updating LinkedIn profile at index:', index, 'with value:', value);
    setFounderLinkedIns(prev => 
      prev.map((profile, i) => i === index ? value : profile)
    );
  };

  const onSubmit = async (data: EurekaFormData) => {
    console.log('🚀 IFRAME FORM SUBMISSION STARTED');
    console.log('📝 Eureka iframe form submit triggered with data:', data);
    console.log('👤 Submitting with user:', user);
    console.log('👤 User ID that will be submitted:', user?.id);
    console.log('📍 Form slug:', slug);
    console.log('🔗 Founder LinkedIn URLs:', founderLinkedIns);
    
    // Basic validation with detailed logging
    console.log('🔍 Starting validation...');
    
    if (!data.companyName.trim()) {
      console.error('❌ Validation failed: Company name is missing');
      toast({
        title: "Error",
        description: "Company name is required",
        variant: "destructive",
      });
      return;
    }
    console.log('✅ Company name validation passed');
    
    if (!data.submitterEmail.trim()) {
      console.error('❌ Validation failed: Email is missing');
      toast({
        title: "Error", 
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }
    console.log('✅ Email validation passed');
    
    if (!data.pocName.trim()) {
      console.error('❌ Validation failed: POC name is missing');
      toast({
        title: "Error",
        description: "POC name is required", 
        variant: "destructive",
      });
      return;
    }
    console.log('✅ POC name validation passed');
    
    if (!data.phoneNumber.trim()) {
      console.error('❌ Validation failed: Phone number is missing');
      toast({
        title: "Error",
        description: "Phone number is required",
        variant: "destructive",
      });
      return;
    }
    console.log('✅ Phone number validation passed');

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.submitterEmail)) {
      console.error('❌ Validation failed: Invalid email format:', data.submitterEmail);
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    console.log('✅ Email format validation passed');

    // Validate LinkedIn URLs format
    const invalidLinkedInUrls = founderLinkedIns.filter(url => {
      if (!url.trim()) return false; // Empty URLs are allowed
      return !url.includes('linkedin.com/');
    });

    if (invalidLinkedInUrls.length > 0) {
      console.error('❌ Validation failed: Invalid LinkedIn URLs:', invalidLinkedInUrls);
      toast({
        title: "Error",
        description: "Please enter valid LinkedIn URLs (e.g., https://linkedin.com/in/username)",
        variant: "destructive",
      });
      return;
    }
    console.log('✅ LinkedIn URLs validation passed');

    console.log('🎉 All validation passed, proceeding with submission...');
    setIsSubmitting(true);

    try {
      // Create submission data - EXACTLY like the main form
      const submissionData: EurekaSubmissionData = {
        form_slug: slug || 'eureka-sample',
        company_name: data.companyName,
        company_registration_type: data.companyRegistrationType || "Not Specified",
        executive_summary: data.executiveSummary,
        company_type: data.companyType,
        question_1: data.question1,
        question_2: data.question2,
        question_3: data.question3,
        question_4: data.question4,
        question_5: data.question5,
        submitter_email: data.submitterEmail,
        founder_linkedin_urls: founderLinkedIns.filter(url => url.trim()),
        poc_name: data.pocName,
        phoneno: data.phoneNumber,
        company_linkedin_url: data.companyLinkedInUrl,
        user_id: user?.id || null // Ensure user_id is properly included
      };

      console.log('📋 FINAL SUBMISSION DATA STRUCTURE:');
      console.log('📋 Form slug:', submissionData.form_slug);
      console.log('📋 Company name:', submissionData.company_name);
      console.log('📋 Company registration type:', submissionData.company_registration_type);
      console.log('📋 Executive summary length:', submissionData.executive_summary?.length || 0);
      console.log('📋 Company type:', submissionData.company_type);
      console.log('📋 Submitter email:', submissionData.submitter_email);
      console.log('📋 POC name:', submissionData.poc_name);
      console.log('📋 Phone number:', submissionData.phoneno);
      console.log('📋 Company LinkedIn URL:', submissionData.company_linkedin_url);
      console.log('📋 User ID:', submissionData.user_id);
      console.log('📋 Founder LinkedIn URLs:', submissionData.founder_linkedin_urls);
      console.log('📋 Questions:', {
        q1: submissionData.question_1?.substring(0, 50) + '...',
        q2: submissionData.question_2?.substring(0, 50) + '...',
        q3: submissionData.question_3?.substring(0, 50) + '...',
        q4: submissionData.question_4?.substring(0, 50) + '...',
        q5: submissionData.question_5?.substring(0, 50) + '...'
      });

      console.log('🚀 Calling submitEurekaForm API...');
      console.log('🚀 About to submit to Supabase with data:', JSON.stringify(submissionData, null, 2));

      // Submit the form - the database trigger will automatically start analysis (LIKE BARC FORM)
      const submission = await submitEurekaForm(submissionData);
      console.log('🎉 IFRAME FORM SUBMITTED SUCCESSFULLY!');
      console.log('📋 Eureka iframe form submitted successfully:', submission);
      console.log('📋 Submission ID:', submission.id);
      console.log('📋 Submission created at:', submission.created_at);
      console.log('📋 Analysis status:', submission.analysis_status);

      // Show success message
      toast({
        title: "Success!",
        description: "🎉 Application submitted successfully! Analysis will start automatically.",
      });

      // Emit custom events to update realtime listeners
      console.log('📡 Emitting eurekaNewSubmission event...');
      window.dispatchEvent(new CustomEvent('eurekaNewSubmission', { 
        detail: { submissionId: submission.id, companyName: data.companyName } 
      }));
      
      console.log('🧹 Resetting form and LinkedIn profiles...');
      form.reset();
      setFounderLinkedIns([""]);
      
      // For iframe, show success message instead of navigating
      toast({
        title: "Application Submitted!",
        description: "Thank you for your submission. We'll be in touch soon.",
      });

      console.log('✅ IFRAME SUBMISSION PROCESS COMPLETED SUCCESSFULLY');
      
    } catch (error: any) {
      console.error('💥 SUBMISSION ERROR OCCURRED:');
      console.error('❌ Error submitting iframe form:', error);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Full error object:', JSON.stringify(error, null, 2));
      
      toast({
        title: "Submission Error",
        description: `There was an error submitting your application: ${error.message || 'Please try again.'}`,
        variant: "destructive",
      });
    } finally {
      console.log('🏁 Setting isSubmitting to false');
      setIsSubmitting(false);
    }
  };

  console.log('🎨 Rendering EurekaIframe component');

  return (
    <div className="min-h-screen bg-white py-4 px-4">
      <div className="container mx-auto max-w-2xl">
        <Card className="border-0 shadow-none">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center mb-2">
              <Building className="h-6 w-6 text-primary mr-2" />
              <CardTitle className="text-xl">Eureka Application Form</CardTitle>
            </div>
            <CardDescription className="text-sm">
              Submit your application - analysis will start automatically
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Company Information */}
                <div className="space-y-3">
                  <h3 className="text-base font-semibold">Company Information</h3>
                  
                  <FormField
                    control={form.control}
                    name="companyName"
                    rules={{ required: "Company name is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Company Name *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            id="companyName"
                            name="companyName"
                            placeholder="Enter your company name" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="companyLinkedInUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Company LinkedIn URL</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              id="companyLinkedInUrl"
                              name="companyLinkedInUrl"
                              type="url"
                              placeholder="https://linkedin.com/company/yourcompany"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companyRegistrationType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Registration Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger id="companyRegistrationType" name="companyRegistrationType">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="private_limited">Private Limited</SelectItem>
                              <SelectItem value="public_limited">Public Limited</SelectItem>
                              <SelectItem value="llp">LLP</SelectItem>
                              <SelectItem value="partnership">Partnership</SelectItem>
                              <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="executiveSummary"
                    rules={{ required: "Executive summary is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Executive Summary *</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            id="executiveSummary"
                            name="executiveSummary"
                            placeholder="Brief executive summary of your company"
                            className="min-h-[80px]"
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
                        <FormLabel className="text-sm">Industry *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger id="companyType" name="companyType">
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Artificial Intelligence & Machine Learning">AI & ML</SelectItem>
                            <SelectItem value="Software as a Service (SaaS)">SaaS</SelectItem>
                            <SelectItem value="Financial Technology (Fintech)">Fintech</SelectItem>
                            <SelectItem value="Healthcare & Medical Technology">Healthcare</SelectItem>
                            <SelectItem value="Education Technology (EdTech)">EdTech</SelectItem>
                            <SelectItem value="E-commerce & Retail">E-commerce</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Founder Information */}
                <div className="space-y-3">
                  <h3 className="text-base font-semibold">Founder Information</h3>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm">Founder LinkedIn Profiles</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addLinkedInProfile}
                        disabled={isSubmitting}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Add
                      </Button>
                    </div>
                    
                    {founderLinkedIns.map((url, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          id={`founderLinkedIn${index}`}
                          name={`founderLinkedIn${index}`}
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
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Application Questions */}
                <div className="space-y-3">
                  <h3 className="text-base font-semibold">Application Questions</h3>
                  
                  <FormField
                    control={form.control}
                    name="question1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">1. What problem is your venture solving?</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            id="question1"
                            name="question1"
                            placeholder="Describe the problem and current solutions"
                            className="min-h-[60px]"
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
                        <FormLabel className="text-sm">2. Who are your target customers?</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            id="question2"
                            name="question2"
                            placeholder="Describe your target market"
                            className="min-h-[60px]"
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
                        <FormLabel className="text-sm">3. Who are your competitors?</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            id="question3"
                            name="question3"
                            placeholder="List direct and indirect competitors"
                            className="min-h-[60px]"
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
                        <FormLabel className="text-sm">4. How will you generate revenue?</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            id="question4"
                            name="question4"
                            placeholder="Describe your revenue model"
                            className="min-h-[60px]"
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
                        <FormLabel className="text-sm">5. What's your competitive advantage?</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            id="question5"
                            name="question5"
                            placeholder="Describe your unique advantages"
                            className="min-h-[60px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Contact Information */}
                <div className="space-y-3">
                  <h3 className="text-base font-semibold">Contact Information</h3>
                  
                  <FormField
                    control={form.control}
                    name="pocName"
                    rules={{ required: "POC name is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Point of Contact Name *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            id="pocName"
                            name="pocName"
                            placeholder="Primary contact person" 
                          />
                        </FormControl>
                        <FormMessage />
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
                        <FormLabel className="text-sm">Email *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            id="submitterEmail"
                            name="submitterEmail"
                            type="email" 
                            placeholder="your@email.com" 
                          />
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
                        <FormLabel className="text-sm">Phone Number *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            id="phoneNumber"
                            name="phoneNumber"
                            placeholder="Your phone number" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting}
                  onClick={() => console.log('🖱️ Submit button clicked!')}
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
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EurekaIframe;
