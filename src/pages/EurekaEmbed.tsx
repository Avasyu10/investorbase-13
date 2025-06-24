
import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
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

const EurekaEmbed = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [founderLinkedIns, setFounderLinkedIns] = useState<string[]>([""]);
  const [success, setSuccess] = useState(false);

  // Get customization parameters from URL
  const title = searchParams.get('title') || 'Eureka Sample Application Form';
  const description = searchParams.get('description') || 'Submit your application - analysis will start automatically';
  const hideHeader = searchParams.get('hideHeader') === 'true';
  const customTheme = searchParams.get('theme') || 'default';

  console.log('🔍 Eureka Embed - Current authenticated user:', user);
  console.log('🔍 Eureka Embed - User ID that will be submitted:', user?.id);

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

  const onSubmit = async (data: EurekaFormData) => {
    console.log('📝 Eureka embed form submit triggered:', data);
    console.log('👤 Submitting with user ID:', user?.id);
    
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
      if (!url.trim()) return false;
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

      console.log('📋 Final submission data with user_id:', submissionData);

      // Submit the form - same backend functionality as regular form
      const submission = await submitEurekaForm(submissionData);
      console.log('📋 Eureka embed form submitted successfully:', submission);

      // Show success message
      toast({
        title: "Success!",
        description: "🎉 Application submitted successfully! Analysis will start automatically.",
      });

      setSuccess(true);
      
      // Emit custom events to update realtime listeners
      window.dispatchEvent(new CustomEvent('eurekaNewSubmission', { 
        detail: { submissionId: submission.id, companyName: data.companyName } 
      }));
      
      form.reset();
      setFounderLinkedIns([""]);
      
    } catch (error: any) {
      console.error('❌ Error submitting embedded form:', error);
      toast({
        title: "Submission Error",
        description: `There was an error submitting your application: ${error.message || 'Please try again.'}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white py-8 px-4">
        <div className="container mx-auto max-w-2xl text-center">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-8">
              <div className="text-green-600 text-4xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-green-800 mb-2">Success!</h2>
              <p className="text-green-700">
                Your application has been submitted successfully. Analysis will start automatically.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-4 px-4">
      <div className="container mx-auto max-w-3xl">
        <Card className="shadow-lg">
          {!hideHeader && (
            <CardHeader className="text-center border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-center mb-4">
                <Building className="h-8 w-8 text-primary mr-2" />
                <CardTitle className="text-2xl">{title}</CardTitle>
              </div>
              <CardDescription className="text-base">
                {description}
              </CardDescription>
            </CardHeader>
          )}
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="companyLinkedInUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company LinkedIn URL</FormLabel>
                          <FormControl>
                            <Input
                              type="url"
                              placeholder="https://linkedin.com/company/yourcompany"
                              {...field}
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
                          <FormLabel>Company Registration Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select registration type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="private_limited">Private Limited Company</SelectItem>
                              <SelectItem value="public_limited">Public Limited Company</SelectItem>
                              <SelectItem value="llp">Limited Liability Partnership (LLP)</SelectItem>
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
                      </FormItem>
                    )}
                  />
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
                  </div>
                </div>

                {/* Application Questions */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Application Questions</h3>
                  
                  <FormField
                    control={form.control}
                    name="question1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>1. What problem is your venture targeting to solve?</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the specific problem you are solving"
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
                        <FormLabel>2. What is your intended customer segment?</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your target customers"
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
                        <FormLabel>3. Who are your current competitors?</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your competitive advantage"
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
                        <FormLabel>4. How will your venture generate revenue?</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your revenue model"
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
                        <FormLabel>5. How does your idea differentiate from competitors?</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your differentiation strategy"
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
                    name="pocName"
                    rules={{ required: "POC name is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Point of Contact Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter the primary contact person's name" {...field} />
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
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" 
                  disabled={isSubmitting}
                  size="lg"
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
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EurekaEmbed;
