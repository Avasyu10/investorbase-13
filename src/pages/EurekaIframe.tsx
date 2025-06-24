import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building, Plus, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/useAuth";
import { submitEurekaForm, type EurekaSubmissionData } from "@/lib/api/eureka";

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
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [founderLinkedIns, setFounderLinkedIns] = useState<string[]>([""]);

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

  const handleSharedSubmit = async (data: EurekaFormData) => {
    console.log('📝 Iframe form submit triggered:', data);
    
    // Basic validation
    if (!data.companyName.trim()) {
      toast({
        title: "Error",
        description: "Company name is required",
        variant: "destructive",
      });
      return;
    }
    if (!data.submitterEmail.trim()) {
      toast({
        title: "Error", 
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }
    if (!data.pocName.trim()) {
      toast({
        title: "Error",
        description: "POC name is required", 
        variant: "destructive",
      });
      return;
    }
    if (!data.phoneNumber.trim()) {
      toast({
        title: "Error",
        description: "Phone number is required",
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.submitterEmail)) {
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

    console.log('✅ Iframe validation passed, submitting...');
    setIsSubmitting(true);

    try {
      // Use the same submission logic as EurekaSample component
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
        user_id: user?.id || null
      };

      console.log('📋 Final iframe submission data:', submissionData);

      // Submit the form using the correct API function - the database trigger will automatically start analysis
      const submission = await submitEurekaForm(submissionData);
      console.log('📋 Iframe form submitted successfully:', submission);

      // Show success message
      toast({
        title: "Success!",
        description: "🎉 Application submitted successfully! Analysis will start automatically.",
      });

      // Emit custom events to update realtime listeners
      window.dispatchEvent(new CustomEvent('eurekaNewSubmission', { 
        detail: { submissionId: submission.id, companyName: data.companyName } 
      }));
      
      // Reset form
      form.reset();
      setFounderLinkedIns([""]);
    } catch (error: any) {
      console.error('❌ Error submitting iframe form:', error);
      toast({
        title: "Submission Error",
        description: `There was an error submitting your application: ${error.message || 'Please try again.'}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border min-h-screen">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center mb-4">
          <Building className="h-6 w-6 text-primary mr-2" />
          <h2 className="text-xl font-bold">Eureka Application Form</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Submit your application - analysis will start automatically
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSharedSubmit)} className="space-y-4">
          {/* Company Information - Compact */}
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
                    <Input placeholder="Enter your company name" {...field} className="text-sm" />
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
                        type="url"
                        placeholder="https://linkedin.com/company/yourcompany"
                        {...field}
                        className="text-sm"
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
                        <SelectTrigger className="text-sm">
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
                      placeholder="Brief executive summary"
                      className="min-h-[80px] text-sm"
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
                  <FormLabel className="text-sm">Industry *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Artificial Intelligence & Machine Learning">AI & ML</SelectItem>
                      <SelectItem value="Software as a Service (SaaS)">SaaS</SelectItem>
                      <SelectItem value="Financial Technology (Fintech)">Fintech</SelectItem>
                      <SelectItem value="Healthcare & Medical Technology">Healthcare & MedTech</SelectItem>
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

          {/* Founder Information - Compact */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold">Founder Information</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">Founder LinkedIn Profiles</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLinkedInProfile}
                  disabled={isSubmitting}
                  className="text-xs"
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
                    className="flex-1 text-sm"
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

          {/* Application Questions - Compact */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold">Application Questions</h3>
            
            <FormField
              control={form.control}
              name="question1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">1. What problem is your venture targeting to solve?</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the problem you are solving"
                      className="min-h-[60px] text-sm"
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
                  <FormLabel className="text-sm">2. What is your intended customer segment?</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your target customers"
                      className="min-h-[60px] text-sm"
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
                  <FormLabel className="text-sm">3. Who are your current competitors?</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your competitors"
                      className="min-h-[60px] text-sm"
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
                  <FormLabel className="text-sm">4. How will your venture generate revenue?</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your revenue model"
                      className="min-h-[60px] text-sm"
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
                  <FormLabel className="text-sm">5. How does your idea differentiate from competitors?</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your differentiation"
                      className="min-h-[60px] text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Contact Information - Compact */}
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
                    <Input placeholder="Enter contact person's name" {...field} className="text-sm" />
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
                    <Input type="email" placeholder="Enter email address" {...field} className="text-sm" />
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
                    <Input placeholder="Enter phone number" {...field} className="text-sm" />
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
    </div>
  );
};

export default EurekaIframe;
