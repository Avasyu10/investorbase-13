import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { analyzeReport, analyzeReportDirect, uploadReport } from "@/lib/supabase/reports";
import { FileUploadZone } from "@/components/reports/upload/FileUploadZone";
import { ProgressIndicator } from "@/components/reports/upload/ProgressIndicator";
import { useAuth } from "@/hooks/useAuth";
import { uploadPublicReport } from "@/lib/supabase";

// Form validation schema
const formSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
  companyStage: z.string().optional(),
  industry: z.string().optional(),
  linkedInProfiles: z.array(z.string()).optional(),
  emailForResults: z.string().email("Invalid email address").optional(),
  companyWebsite: z.string().url("Invalid URL").optional(),
});

type ReportUploadFormValues = z.infer<typeof formSchema>;

interface ReportUploadProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  isPublic?: boolean;
  formSlug?: string;
  buttonText?: string;
  skipAnalysis?: boolean;
  hideEmailField?: boolean;
  disableScrapingFeatures?: boolean;
}

export function ReportUpload({
  onSuccess,
  onError,
  isPublic = false,
  formSlug = "",
  buttonText = "Upload & Analyze",
  skipAnalysis = false,
  hideEmailField = false,
  disableScrapingFeatures = false
}: ReportUploadProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [progressStage, setProgressStage] = useState(0);
  const [briefIntroduction, setBriefIntroduction] = useState("");
  const [founderLinkedIns, setFounderLinkedIns] = useState<string[]>([""]);
  
  // Initialize the form
  const form = useForm<ReportUploadFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      companyStage: "",
      industry: "",
      linkedInProfiles: [""],
      emailForResults: "",
      companyWebsite: "",
    },
  });

  const handleFileAccepted = (acceptedFile: File) => {
    setFile(acceptedFile);
  };
  
  const handleFileRejected = (errorMessage: string) => {
    toast.error("File upload failed", {
      description: errorMessage
    });
    
    if (onError) {
      onError(`File upload failed: ${errorMessage}`);
    }
  };
  
  const addLinkedInField = () => {
    setFounderLinkedIns([...founderLinkedIns, ""]);
  };
  
  const updateLinkedInField = (index: number, value: string) => {
    const newFields = [...founderLinkedIns];
    newFields[index] = value;
    setFounderLinkedIns(newFields);
  };
  
  const removeLinkedInField = (index: number) => {
    if (founderLinkedIns.length > 1) {
      const newFields = [...founderLinkedIns];
      newFields.splice(index, 1);
      setFounderLinkedIns(newFields);
    }
  };

  const onSubmit = async (values: ReportUploadFormValues) => {
    try {
      if (!file) {
        toast.error("Missing file", {
          description: "Please upload a PDF file"
        });
        return;
      }
      
      setIsProcessing(true);
      setProgressStage(1);
      setProcessingStatus("Uploading file...");
      
      // Extract form values
      const { 
        title, 
        description = "", 
        companyStage = "",
        industry = "",
        emailForResults = "",
        companyWebsite = ""
      } = values;
      
      // Process LinkedIn profiles (remove empty ones)
      const linkedInProfiles = founderLinkedIns.filter(url => url.trim() !== "");
      
      // Depending on the mode (public submission or authenticated user),
      // use the appropriate upload method
      if (isPublic) {
        // For public submissions
        try {
          // Create a FormData object for the file upload
          const formData = new FormData();
          formData.append('file', file);
          formData.append('title', title);
          
          // Email handling - use a default value when hideEmailField is true
          if (hideEmailField) {
            // Use a placeholder email when the field is hidden
            formData.append('email', 'no-email-required@pitchdeck.com');
            console.log("Using placeholder email since hideEmailField is true");
          } else {
            if (!emailForResults) {
              toast.error("Email required", {
                description: "Please provide your email to receive the analysis results"
              });
              setIsProcessing(false);
              return;
            }
            formData.append('email', emailForResults);
          }
          
          console.log("Adding form fields:", { 
            title,
            description,
            websiteUrl: companyWebsite,
            companyStage,
            industry,
            linkedInProfiles: founderLinkedIns.filter(ln => ln.trim()).length,
            hideEmailField,
            formSlug
          });
          
          if (briefIntroduction) {
            formData.append('description', briefIntroduction);
          } else if (description) {
            formData.append('description', description);
          }
          
          if (companyWebsite) {
            formData.append('websiteUrl', companyWebsite);
          }
          
          if (companyStage) {
            formData.append('companyStage', companyStage);
          }
          
          if (industry) {
            formData.append('industry', industry);
          }
          
          if (linkedInProfiles.length > 0) {
            // Convert array to JSON string for form data
            formData.append('linkedInProfiles', JSON.stringify(linkedInProfiles));
          }
          
          // Pass the form slug to identify which form this submission is from
          if (formSlug) {
            formData.append('formSlug', formSlug);
          }
          
          // Use direct fetch to edge function
          setProgressStage(2);
          setProcessingStatus("Processing submission...");
          
          const response = await fetch("https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/handle-public-upload", {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("Upload error response:", errorData);
            throw new Error(`Upload failed: ${errorData.error || `Status: ${response.status}`}${errorData.details ? ` - ${errorData.details}` : ''}`);
          }
          
          setProgressStage(3);
          setProcessingStatus("Completing...");
          
          const result = await response.json();
          
          if (!result.success) {
            throw new Error(result.error || 'Upload failed');
          }
          
          toast.success("Submission successful", {
            description: "Your pitch deck has been submitted successfully."
          });
          
          if (onSuccess) {
            onSuccess();
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error("Error during public submission:", message);
          
          if (onError) {
            onError(message);
          } else {
            toast.error("Submission failed", {
              description: message
            });
          }
        } finally {
          setIsProcessing(false);
        }
      } else {
        // For authenticated users
        if (!user) {
          toast.error("Authentication required", {
            description: "Please sign in to upload reports"
          });
          return;
        }
        
        try {
          setProgressStage(2);
          setProcessingStatus("Uploading file...");
          
          // Upload report using authenticated flow
          const report = await uploadReport(file, title, description, companyWebsite);
          
          setProgressStage(3);
          setProcessingStatus("Analyzing report...");
          
          if (skipAnalysis) {
            toast.success("Upload successful", {
              description: "Your pitch deck has been uploaded successfully."
            });
            
            if (onSuccess) {
              onSuccess();
            }
            
            navigate(`/report/${report.id}`);
          } else {
            // Analyze the report
            await analyzeReport(report.id);
            
            toast.success("Analysis complete", {
              description: "Your pitch deck has been successfully analyzed"
            });
            
            if (onSuccess) {
              onSuccess();
            }
            
            navigate(`/report/${report.id}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error("Error during authenticated upload:", message);
          
          if (onError) {
            onError(message);
          } else {
            toast.error("Upload failed", {
              description: message
            });
          }
        } finally {
          setIsProcessing(false);
        }
      }
    } catch (error) {
      console.error("Error in form submission:", error);
      const message = error instanceof Error ? error.message : String(error);
      
      toast.error("Upload failed", {
        description: message
      });
      
      if (onError) {
        onError(message);
      }
      
      setIsProcessing(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {isProcessing ? (
          <ProgressIndicator 
            stage={progressStage} 
            status={processingStatus} 
          />
        ) : (
          <>
            <FileUploadZone 
              onFileAccepted={handleFileAccepted} 
              onFileRejected={handleFileRejected}
              description="PDF files only, max 10MB"
              buttonText="Select PDF"
              disabled={isProcessing}
              required={true}
            />
            
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pitch Deck Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Company Name - Pitch Deck" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {!hideEmailField && (
                <FormField
                  control={form.control}
                  name="emailForResults"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email for Results</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="your@email.com" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        We'll send the analysis results to this email
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brief Introduction</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Write a brief introduction about your company"
                        className="resize-none"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setBriefIntroduction(e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      This will help our AI better understand your pitch deck.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {!disableScrapingFeatures && (
                <>
                  <FormField
                    control={form.control}
                    name="companyWebsite"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://www.company.com" {...field} />
                        </FormControl>
                        <FormDescription>
                          Adding your company website will enhance the analysis with additional context.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="companyStage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Stage</FormLabel>
                        <FormControl>
                          <Input placeholder="Seed, Series A, etc." {...field} />
                        </FormControl>
                        <FormDescription>
                          What stage is your company at?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. SaaS, Fintech, Healthcare" {...field} />
                        </FormControl>
                        <FormDescription>
                          What industry does your company operate in?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormLabel>Founder LinkedIn Profiles</FormLabel>
                  <FormDescription>
                    Add LinkedIn profiles of your founders to enhance the analysis.
                  </FormDescription>
                  {founderLinkedIns.map((field, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <FormField
                        control={form.control}
                        name={`linkedInProfiles.${index}`}
                        render={() => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input
                                type="url"
                                placeholder="https://www.linkedin.com/in/founder"
                                value={field}
                                onChange={(e) => updateLinkedInField(index, e.target.value)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full"
                        onClick={() => removeLinkedInField(index)}
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Remove LinkedIn profile</span>
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addLinkedInField}
                  >
                    Add LinkedIn Profile
                  </Button>
                </>
              )}
            </div>
          </>
        )}
        
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            {isProcessing ? "Processing..." : buttonText}
          </Button>
        </div>
      </form>
    </Form>
  );
}
