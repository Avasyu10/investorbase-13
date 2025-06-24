
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
import { supabase } from "@/integrations/supabase/client";
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

  console.log('🎯 EurekaIframe component loaded');
  console.log('📍 Current slug:', slug);
  console.log('🔍 Current authenticated user:', user);

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
    console.log('🚀 EUREKA IFRAME FORM SUBMISSION STARTED');
    console.log('📝 Form data being submitted:', data);
    console.log('👤 User:', user);
    console.log('📍 Form slug:', slug);
    console.log('🔗 Founder LinkedIn URLs:', founderLinkedIns);
    
    setIsSubmitting(true);

    try {
      // Basic validation
      if (!data.companyName.trim()) {
        throw new Error('Company name is required');
      }
      
      if (!data.submitterEmail.trim()) {
        throw new Error('Email is required');
      }
      
      if (!data.pocName.trim()) {
        throw new Error('POC name is required');
      }
      
      if (!data.phoneNumber.trim()) {
        throw new Error('Phone number is required');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.submitterEmail)) {
        throw new Error('Please enter a valid email address');
      }

      // Step 1: Insert submission data FIRST
      const submissionData = {
        form_slug: slug || 'eureka-iframe',
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
        user_id: user?.id || null,
        analysis_status: 'pending'
      };

      console.log('📋 STEP 1: Inserting submission data:', submissionData);

      // Insert the submission record
      const { data: submission, error: insertError } = await supabase
        .from('eureka_form_submissions')
        .insert([submissionData])
        .select()
        .single();

      if (insertError) {
        console.error('💥 INSERT ERROR:', insertError);
        throw new Error(`Submission failed: ${insertError.message}`);
      }

      console.log('✅ STEP 1 COMPLETE: Submission inserted successfully:', submission);
      console.log('✅ Submission ID:', submission.id);

      // Step 2: Wait a moment to ensure transaction is committed
      console.log('⏳ STEP 2: Waiting for transaction commit...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 3: Trigger analysis by calling the edge function directly
      console.log('🚀 STEP 3: Starting analysis for submission:', submission.id);
      
      try {
        const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('analyze-eureka-form', {
          body: { submissionId: submission.id }
        });

        if (analysisError) {
          console.error('⚠️ Analysis trigger error:', analysisError);
          // Don't fail the submission, just log the error
          console.log('📝 Submission was successful, but analysis trigger failed. Analysis can be run manually.');
        } else {
          console.log('✅ Analysis triggered successfully:', analysisResult);
        }
      } catch (analysisError) {
        console.error('⚠️ Analysis trigger exception:', analysisError);
        // Don't fail the submission
      }

      // Step 4: Success response
      console.log('🎉 EUREKA SUBMISSION PROCESS COMPLETED SUCCESSFULLY');
      
      toast({
        title: "Success!",
        description: "🎉 Application submitted successfully! Analysis will start automatically.",
      });

      // Reset form
      form.reset();
      setFounderLinkedIns([""]);
      
    } catch (error: any) {
      console.error('💥 SUBMISSION ERROR:', error);
      
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
                              <SelectTrigger>
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
                            <SelectTrigger>
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
