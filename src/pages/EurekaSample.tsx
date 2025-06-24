import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building, Plus, X, Share, CheckCircle, AlertTriangle } from "lucide-react";
import { useForm } from "react-hook-form";
import { submitEurekaForm, type EurekaSubmissionData } from "@/lib/api/eureka";
import { useAuth } from "@/hooks/useAuth";
import { EurekaEmbedLink } from "@/components/forms/EurekaEmbedLink";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

const EurekaSample = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [founderLinkedIns, setFounderLinkedIns] = useState<string[]>([""]);
  const [showEmbedLink, setShowEmbedLink] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>({});

  // Check if we're in an iframe and gather debug info
  const isInIframe = window.self !== window.top;

  useEffect(() => {
    // Comprehensive iframe and CORS debugging
    const debugData = {
      isInIframe,
      currentDomain: window.location.origin,
      protocol: window.location.protocol,
      parentOrigin: isInIframe ? document.referrer : 'N/A',
      userAgent: navigator.userAgent,
      cookiesEnabled: navigator.cookieEnabled,
      localStorage: (() => {
        try {
          localStorage.setItem('test', 'test');
          localStorage.removeItem('test');
          return 'available';
        } catch (e) {
          return `blocked: ${e.message}`;
        }
      })(),
      sessionStorage: (() => {
        try {
          sessionStorage.setItem('test', 'test');
          sessionStorage.removeItem('test');
          return 'available';
        } catch (e) {
          return `blocked: ${e.message}`;
        }
      })(),
      thirdPartyCookies: (() => {
        try {
          document.cookie = "test=value; SameSite=None; Secure";
          return document.cookie.includes('test=value') ? 'allowed' : 'blocked';
        } catch (e) {
          return `error: ${e.message}`;
        }
      })(),
      headers: {
        xFrameOptions: 'unknown', // Will be checked via network
        csp: 'unknown'
      },
      supabaseConnection: 'testing...'
    };

    setDebugInfo(debugData);

    // Test Supabase connection
    import('@/integrations/supabase/client').then(({ supabase }) => {
      supabase.auth.getSession().then(({ data, error }) => {
        setDebugInfo(prev => ({
          ...prev,
          supabaseConnection: error ? `error: ${error.message}` : 'connected',
          authSession: data.session ? 'authenticated' : 'anonymous'
        }));
      }).catch(err => {
        setDebugInfo(prev => ({
          ...prev,
          supabaseConnection: `connection failed: ${err.message}`
        }));
      });
    });

    console.log('🔍 Iframe Debug Info:', debugData);
  }, [isInIframe]);

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
    console.log('📝 Starting form submission with debug info:', { data, debugInfo });
    
    // Enhanced validation for iframe context
    if (!data.companyName.trim() || !data.submitterEmail.trim() || !data.pocName.trim() || !data.phoneNumber.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Enhanced email validation
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
      // Pre-submission iframe checks
      if (isInIframe) {
        console.log('🖼️ Iframe submission attempt - checking environment...');
        
        // Check if we can access parent window (CORS check)
        try {
          if (window.parent !== window) {
            console.log('✅ Parent window accessible');
          }
        } catch (e) {
          console.warn('⚠️ Parent window access blocked:', e);
        }

        // Check for mixed content issues
        if (window.location.protocol === 'https:' && debugInfo.parentOrigin && debugInfo.parentOrigin.startsWith('http:')) {
          console.warn('⚠️ Mixed content detected: HTTPS iframe in HTTP parent');
        }
      }

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
      };

      console.log('📋 Final submission data:', submissionData);
      console.log('🌐 Network context:', {
        origin: window.location.origin,
        protocol: window.location.protocol,
        isSecure: window.location.protocol === 'https:',
        userAgent: navigator.userAgent.substring(0, 100) + '...'
      });

      const submission = await submitEurekaForm(submissionData);
      
      console.log('✅ Submission successful:', submission);

      // Show success message
      toast({
        title: "Success!",
        description: "🎉 Application submitted successfully!",
      });

      // Reset form
      form.reset();
      setFounderLinkedIns([""]);
      
      // Enhanced post-submission handling for iframe
      if (isInIframe) {
        console.log('🖼️ Iframe submission complete - notifying parent...');
        setIsSubmitted(true);
        
        // Multiple approaches to communicate with parent
        try {
          // Method 1: PostMessage with multiple target origins
          const parentOrigins = ['*', window.location.origin];
          if (debugInfo.parentOrigin && debugInfo.parentOrigin !== 'about:blank') {
            parentOrigins.push(debugInfo.parentOrigin);
          }
          
          parentOrigins.forEach(origin => {
            try {
              window.parent.postMessage({
                type: 'EUREKA_FORM_SUBMITTED',
                data: { 
                  submissionId: submission.id, 
                  companyName: data.companyName,
                  success: true,
                  timestamp: new Date().toISOString()
                }
              }, origin);
              console.log(`📤 PostMessage sent to origin: ${origin}`);
            } catch (e) {
              console.warn(`⚠️ PostMessage failed for origin ${origin}:`, e);
            }
          });
          
          // Method 2: Try to trigger a custom event on parent
          if (window.parent.document) {
            const event = new CustomEvent('eurekaFormSubmitted', {
              detail: { submissionId: submission.id, companyName: data.companyName }
            });
            window.parent.document.dispatchEvent(event);
            console.log('📤 Custom event dispatched');
          }
        } catch (error) {
          console.warn('⚠️ Parent communication failed:', error);
        }
      } else {
        navigate("/thank-you");
      }
      
    } catch (error: any) {
      console.error('❌ Submission failed with debug context:', {
        error: error.message,
        stack: error.stack,
        debugInfo,
        networkState: navigator.onLine ? 'online' : 'offline',
        timestamp: new Date().toISOString()
      });
      
      // Enhanced error reporting for iframe context
      let errorMessage = error.message || 'Failed to submit. Please try again.';
      
      if (isInIframe) {
        if (error.message?.includes('CORS')) {
          errorMessage = 'Cross-origin request blocked. Please contact support.';
        } else if (error.message?.includes('cookie')) {
          errorMessage = 'Third-party cookies blocked. Please enable cookies and try again.';
        } else if (error.message?.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        }
      }
      
      toast({
        title: "Submission Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show debug info in development or when there are issues
  const showDebugInfo = import.meta.env.DEV || isInIframe;

  // Show success state for iframe submissions
  if (isSubmitted && isInIframe) {
    return (
      <div className="min-h-screen bg-black py-8 px-4">
        <div className="container mx-auto max-w-3xl">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex flex-col items-center space-y-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
                <CardTitle className="text-2xl text-green-600">Application Submitted Successfully!</CardTitle>
                <CardDescription className="text-base">
                  Thank you for your submission. Your application is now being processed and analysis will start automatically.
                </CardDescription>
                <Button 
                  onClick={() => {
                    setIsSubmitted(false);
                    form.reset();
                    setFounderLinkedIns([""]);
                  }}
                  variant="outline"
                >
                  Submit Another Application
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-8 px-4">
      <div className="container mx-auto max-w-3xl">
        {/* Debug Information Panel */}
        {showDebugInfo && (
          <Card className="mb-6 border-yellow-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="h-5 w-5" />
                Debug Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Context:</strong>
                  <ul className="list-disc list-inside ml-2">
                    <li>In Iframe: {isInIframe ? 'Yes' : 'No'}</li>
                    <li>Protocol: {debugInfo.protocol}</li>
                    <li>Parent Origin: {debugInfo.parentOrigin}</li>
                    <li>Cookies: {debugInfo.cookiesEnabled ? 'Enabled' : 'Disabled'}</li>
                  </ul>
                </div>
                <div>
                  <strong>Storage & Scripts:</strong>
                  <ul className="list-disc list-inside ml-2">
                    <li>LocalStorage: {debugInfo.localStorage}</li>
                    <li>SessionStorage: {debugInfo.sessionStorage}</li>
                    <li>Third-party Cookies: {debugInfo.thirdPartyCookies}</li>
                    <li>Supabase: {debugInfo.supabaseConnection}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Only show embed link section when not in iframe */}
        {!isInIframe && (
          <div className="mb-6">
            <Collapsible open={showEmbedLink} onOpenChange={setShowEmbedLink}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <div className="flex items-center gap-2">
                    <Share className="h-4 w-4" />
                    Get Embed Code for This Form
                  </div>
                  <span className="text-xs">{showEmbedLink ? "Hide" : "Show"}</span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <EurekaEmbedLink />
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        <Card>
          <CardHeader className="text-center border-b">
            <div className="flex items-center justify-center mb-4">
              <Building className="h-8 w-8 text-primary mr-2" />
              <CardTitle className="text-2xl">Eureka Sample Application Form</CardTitle>
            </div>
            <CardDescription className="text-base">
              Submit your application - analysis will start automatically
              {isInIframe && (
                <div className="mt-2 text-xs text-blue-400">
                  Embedded form - submissions will be processed automatically
                </div>
              )}
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
                        <FormLabel>4. How will your venture generate revenue? What are the factors affecting your costs andrevenues? Also highlight any growth opportunities in future.</FormLabel>
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
                        <FormLabel>5. How does your idea and marketing strategy differentiate your startup from your competitors and help you create demand for your product/service? Mention your IP(Intellectual Property) advantage if any.</FormLabel>
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

export default EurekaSample;
