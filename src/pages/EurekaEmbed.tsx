
import { useState, useEffect } from "react";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [founderLinkedIns, setFounderLinkedIns] = useState<string[]>([""]);

  // Extract customization parameters
  const customTitle = searchParams.get('title');
  const customDescription = searchParams.get('description');
  const hideHeader = searchParams.get('hide_header') === 'true';
  const theme = searchParams.get('theme') || 'light';
  const primaryColor = searchParams.get('primary_color') || '#3b82f6';
  const parentOrigin = searchParams.get('origin');
  
  // Apply custom styling
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
    
    if (primaryColor && primaryColor !== '#3b82f6') {
      document.documentElement.style.setProperty('--primary', primaryColor);
    }
  }, [theme, primaryColor]);

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
    
    // Basic validation
    if (!data.companyName.trim() || !data.submitterEmail.trim() || !data.pocName.trim() || !data.phoneNumber.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
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

    setIsSubmitting(true);

    try {
      const submissionData: EurekaSubmissionData = {
        form_slug: slug || 'eureka-embed',
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
        user_id: null // Embedded forms don't have authenticated users
      };

      console.log('📋 Eureka embed submission data:', submissionData);

      const submission = await submitEurekaForm(submissionData);
      console.log('📋 Eureka embed form submitted successfully:', submission);

      // Show success message
      toast({
        title: "Success!",
        description: "🎉 Application submitted successfully! Analysis will start automatically.",
      });

      // Notify parent window if embedded
      if (parentOrigin && window.parent) {
        window.parent.postMessage({
          type: 'eureka_form_submitted',
          data: {
            submissionId: submission.id,
            companyName: data.companyName,
            status: 'success'
          }
        }, parentOrigin);
      }
      
      form.reset();
      setFounderLinkedIns([""]);
      
    } catch (error: any) {
      console.error('❌ Error submitting embed form:', error);
      
      const errorMessage = `There was an error submitting your application: ${error.message || 'Please try again.'}`;
      
      toast({
        title: "Submission Error",
        description: errorMessage,
        variant: "destructive",
      });

      // Notify parent window of error if embedded
      if (parentOrigin && window.parent) {
        window.parent.postMessage({
          type: 'eureka_form_error',
          data: {
            error: errorMessage,
            status: 'error'
          }
        }, parentOrigin);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto max-w-3xl">
        <Card>
          {!hideHeader && (
            <CardHeader className="text-center border-b">
              <div className="flex items-center justify-center mb-4">
                <Building className="h-8 w-8 text-primary mr-2" />
                <CardTitle className="text-2xl">
                  {customTitle || "Eureka Application Form"}
                </CardTitle>
              </div>
              <CardDescription className="text-base">
                {customDescription || "Submit your application - analysis will start automatically"}
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
                        <FormLabel>1. What problem is your venture targeting to solve? How are the affected people (customers/consumers) coping with the problem at present?</FormLabel>
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
                        <FormLabel>2. What is the intended customer segment or target customers of your venture?</FormLabel>
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
                        <FormLabel>3. Who are your current competitors? (Please mention both direct and indirect competitors if applicable)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your competitive advantage and positioning"
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
                        <FormLabel>4. How will your venture generate revenue? What are the factors affecting your costs and revenues? Also highlight any growth opportunities in future.</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your revenue model and growth strategy"
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
                        <FormLabel>5. How does your idea and marketing strategy differentiate your startup from your competitors and help you create demand for your product/service? Mention your IP (Intellectual Property) advantage if any.</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your differentiation and IP advantages"
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
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EurekaEmbed;
