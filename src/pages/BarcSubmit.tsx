import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FileUploadZone } from "@/components/reports/upload/FileUploadZone";
import { GraduationCap, Send, Loader2 } from "lucide-react";

const BarcSubmit = () => {
  const params = useParams();
  const formSlug = params.formSlug || params['*']; // Try both ways to capture the slug
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formExists, setFormExists] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    founderName: "",
    email: "",
    phone: "",
    website: "",
    description: "",
    stage: "",
    fundingAmount: "",
    sector: ""
  });
  const [pitchDeck, setPitchDeck] = useState<File | null>(null);

  // Verify form exists
  useEffect(() => {
    const verifyForm = async () => {
      console.log("URL params:", params);
      console.log("Form slug extracted:", formSlug);
      
      if (!formSlug) {
        console.log("No form slug found in URL");
        toast.error("No form identifier found in URL");
        setFormExists(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        console.log("Checking form with slug:", formSlug);
        
        // First try to find the specific form
        const { data, error } = await supabase
          .from('public_submission_forms')
          .select('id, form_name, is_active, form_type')
          .eq('form_slug', formSlug)
          .eq('form_type', 'barc')
          .maybeSingle();

        console.log("Form query result:", { data, error });

        if (error) {
          console.error("Error querying form:", error);
          toast.error("Error loading form");
          setFormExists(false);
        } else if (!data) {
          console.log("No form found with slug:", formSlug);
          // Let's also check what forms exist
          const { data: allForms } = await supabase
            .from('public_submission_forms')
            .select('form_slug, form_name, form_type, is_active');
          console.log("All available forms:", allForms);
          
          toast.error("Form not found");
          setFormExists(false);
        } else if (!data.is_active) {
          console.log("Form found but inactive:", data);
          toast.error("Form is not active");
          setFormExists(false);
        } else {
          console.log("Form found and active:", data);
          setFormExists(true);
        }
      } catch (error) {
        console.error("Error verifying form:", error);
        toast.error("Error loading form");
        setFormExists(false);
      } finally {
        setLoading(false);
      }
    };

    verifyForm();
  }, [formSlug, params]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPitchDeck(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pitchDeck) {
      toast.error("Please upload a pitch deck");
      return;
    }

    if (!formData.companyName || !formData.founderName || !formData.email) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      // Submit the form data
      const { error } = await supabase.functions.invoke('handle-public-upload', {
        body: {
          formSlug,
          formData,
          fileName: pitchDeck.name,
          fileType: pitchDeck.type,
          fileSize: pitchDeck.size,
          submissionType: 'barc'
        }
      });

      if (error) throw error;

      toast.success("Your BARC application has been submitted successfully!");
      
      // Reset form
      setFormData({
        companyName: "",
        founderName: "",
        email: "",
        phone: "",
        website: "",
        description: "",
        stage: "",
        fundingAmount: "",
        sector: ""
      });
      setPitchDeck(null);
      
    } catch (error: any) {
      console.error("Submission error:", error);
      toast.error("Failed to submit application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!formExists) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Form Not Found</CardTitle>
            <CardDescription>
              The BARC application form you're looking for doesn't exist or is no longer active.
              <br />
              <span className="text-xs text-muted-foreground mt-2 block">
                Form slug: {formSlug || 'No slug found'}
              </span>
              <span className="text-xs text-muted-foreground mt-1 block">
                URL params: {JSON.stringify(params)}
              </span>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <GraduationCap className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">
                IIT Bombay BARC Application
              </h1>
            </div>
            <p className="text-muted-foreground">
              Submit your startup application to the IIT Bombay Business Accelerator & Research Center
            </p>
          </div>

          {/* Form */}
          <Card className="bg-card border-border shadow-lg">
            <CardHeader className="border-b border-border/30">
              <CardTitle className="text-xl text-foreground/90">Application Details</CardTitle>
              <CardDescription className="text-muted-foreground">
                Please provide your startup information and upload your pitch deck
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Company Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground/80 flex items-center gap-2">
                    Company Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company-name" className="text-foreground/80">
                        Company Name *
                      </Label>
                      <Input
                        id="company-name"
                        value={formData.companyName}
                        onChange={(e) => handleInputChange("companyName", e.target.value)}
                        placeholder="Your Company Name"
                        required
                        className="bg-secondary/20 border-border/30 focus-visible:ring-primary"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="sector" className="text-foreground/80">
                        Sector
                      </Label>
                      <Input
                        id="sector"
                        value={formData.sector}
                        onChange={(e) => handleInputChange("sector", e.target.value)}
                        placeholder="e.g., FinTech, HealthTech, EdTech"
                        className="bg-secondary/20 border-border/30 focus-visible:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-foreground/80">
                      Company Description
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      placeholder="Brief description of your company and what you do"
                      rows={3}
                      className="bg-secondary/20 border-border/30 focus-visible:ring-primary"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stage" className="text-foreground/80">
                        Current Stage
                      </Label>
                      <Input
                        id="stage"
                        value={formData.stage}
                        onChange={(e) => handleInputChange("stage", e.target.value)}
                        placeholder="e.g., Idea, MVP, Early Revenue"
                        className="bg-secondary/20 border-border/30 focus-visible:ring-primary"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="funding" className="text-foreground/80">
                        Funding Amount Sought
                      </Label>
                      <Input
                        id="funding"
                        value={formData.fundingAmount}
                        onChange={(e) => handleInputChange("fundingAmount", e.target.value)}
                        placeholder="e.g., $100K - $500K"
                        className="bg-secondary/20 border-border/30 focus-visible:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website" className="text-foreground/80">
                      Website
                    </Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => handleInputChange("website", e.target.value)}
                      placeholder="https://yourcompany.com"
                      type="url"
                      className="bg-secondary/20 border-border/30 focus-visible:ring-primary"
                    />
                  </div>
                </div>

                {/* Founder Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground/80">
                    Founder Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="founder-name" className="text-foreground/80">
                        Founder Name *
                      </Label>
                      <Input
                        id="founder-name"
                        value={formData.founderName}
                        onChange={(e) => handleInputChange("founderName", e.target.value)}
                        placeholder="Your Full Name"
                        required
                        className="bg-secondary/20 border-border/30 focus-visible:ring-primary"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-foreground/80">
                        Email Address *
                      </Label>
                      <Input
                        id="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        placeholder="your.email@example.com"
                        type="email"
                        required
                        className="bg-secondary/20 border-border/30 focus-visible:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-foreground/80">
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="+91 XXXXX XXXXX"
                      type="tel"
                      className="bg-secondary/20 border-border/30 focus-visible:ring-primary"
                    />
                  </div>
                </div>

                {/* Pitch Deck Upload */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground/80">
                    Pitch Deck *
                  </h3>
                  
                  <FileUploadZone
                    id="pitch-deck"
                    label="Upload your pitch deck"
                    file={pitchDeck}
                    onFileChange={handleFileChange}
                    accept=".pdf,.ppt,.pptx"
                    description="PDF or PowerPoint files only, max 10MB"
                    buttonText="Choose pitch deck"
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-6 border-t border-border/30">
                  <Button 
                    type="submit" 
                    disabled={submitting}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting Application...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Submit BARC Application
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-8 text-sm text-muted-foreground">
            <p>
              By submitting this application, you agree to the IIT Bombay BARC terms and conditions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcSubmit;
