import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { uploadReport, analyzeReport } from "@/lib/supabase";
import { Loader2, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CompanyInfoForm } from "./upload/CompanyInfoForm";
import { FileUploadZone } from "./upload/FileUploadZone";
import { ProgressIndicator } from "./upload/ProgressIndicator";
import { scrapeWebsite } from "./upload/WebsiteService";
import { scrapeLinkedInProfiles, formatLinkedInContent } from "./upload/LinkedInService";

interface ReportUploadProps {
  onError?: (errorMessage: string) => void;
  onSuccess?: () => void;
  isPublic?: boolean;
  buttonText?: string;
  skipAnalysis?: boolean;
  formSlug?: string | null;
  hideEmailField?: boolean;
  disableScrapingFeatures?: boolean;
  simplifiedForm?: boolean;
}

export function ReportUpload({ 
  onError, 
  onSuccess, 
  isPublic = false, 
  buttonText = "Upload & Analyze",
  skipAnalysis = false,
  formSlug = null,
  hideEmailField = false,
  disableScrapingFeatures = false,
  simplifiedForm = false
}: ReportUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [supplementFiles, setSupplementFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [briefIntroduction, setBriefIntroduction] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companyStage, setCompanyStage] = useState("");
  const [industry, setIndustry] = useState("");
  const [founderLinkedIns, setFounderLinkedIns] = useState<string[]>([""]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState("");
  const [isScrapingWebsite, setIsScrapingWebsite] = useState(false);
  const [emailForResults, setEmailForResults] = useState("");
  const [question, setQuestion] = useState("");
  
  // New state for additional company fields
  const [companyRegistrationType, setCompanyRegistrationType] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [dpiitRecognitionNumber, setDpiitRecognitionNumber] = useState("");
  const [indianCitizenShareholding, setIndianCitizenShareholding] = useState("");
  const [executiveSummary, setExecutiveSummary] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [productsServices, setProductsServices] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const [fundsRaised, setFundsRaised] = useState("");
  const [valuation, setValuation] = useState("");
  const [lastFyRevenue, setLastFyRevenue] = useState("");
  const [lastQuarterRevenue, setLastQuarterRevenue] = useState("");
  
  // Founder information
  const [founderName, setFounderName] = useState("");
  const [founderGender, setFounderGender] = useState("");
  const [founderEmail, setFounderEmail] = useState("");
  const [founderContact, setFounderContact] = useState("");
  const [founderAddress, setFounderAddress] = useState("");
  const [founderState, setFounderState] = useState("");
  
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      if (selectedFile.type !== 'application/pdf') {
        toast.error("Invalid file type", {
          description: "Please upload a PDF file"
        });
        return;
      }
      
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error("File too large", {
          description: "Please upload a file smaller than 10MB"
        });
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const handleSupplementFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      if (selectedFile.type !== 'application/pdf') {
        toast.error("Invalid file type", {
          description: "Please upload a PDF file"
        });
        return;
      }
      
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error("File too large", {
          description: "Please upload a file smaller than 10MB"
        });
        return;
      }
      
      setSupplementFiles(prev => [...prev, selectedFile]);
    }
  };

  const removeSupplementFile = (index: number) => {
    setSupplementFiles(prev => prev.filter((_, i) => i !== index));
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error("Company name required", {
        description: "Please provide a company name for the report"
      });
      return;
    }

    if (isPublic && !hideEmailField && !emailForResults.trim()) {
      toast.error("Email required", {
        description: "Please provide your email to receive the analysis results"
      });
      return;
    }

    if (isPublic && !file) {
      toast.error("Pitch deck required", {
        description: "Please upload a PDF pitch deck"
      });
      return;
    }
      
    if (isPublic) {
      // Validate required fields for public submission
      if (!companyRegistrationType) {
        toast.error("Company registration type required", {
          description: "Please select how your company is registered"
        });
        return;
      }
      
      if (!indianCitizenShareholding) {
        toast.error("Indian citizen shareholding required", {
          description: "Please specify the total shareholding of Indian citizens"
        });
        return;
      }
      
      if (!executiveSummary) {
        toast.error("Executive summary required", {
          description: "Please provide an executive summary of your company"
        });
        return;
      }
      
      if (!companyType) {
        toast.error("Company type required", {
          description: "Please select your company type"
        });
        return;
      }
      
      // Validate founder information
      if (!founderName) {
        toast.error("Founder name required", {
          description: "Please provide the name of the founder/co-founder"
        });
        return;
      }
      
      if (!founderEmail) {
        toast.error("Founder email required", {
          description: "Please provide the founder's email address"
        });
        return;
      }
      
      if (!founderContact) {
        toast.error("Founder contact required", {
          description: "Please provide the founder's contact number"
        });
        return;
      }
      
      if (!founderAddress) {
        toast.error("Founder address required", {
          description: "Please provide the founder's address"
        });
        return;
      }
      
      if (!founderState) {
        toast.error("Founder state required", {
          description: "Please select the founder's state"
        });
        return;
      }
    }

    try {
      setIsUploading(true);
      setProgressStage("Processing your submission...");
      setProgress(10);
      
      let report;
      if (isPublic) {
        console.log("Starting public submission process...");
        const formData = new FormData();
        
        if (file) {
          console.log("Adding file to form data:", file.name, file.type, file.size);
          formData.append('file', file);
        } else {
          console.error("No file selected for upload - cannot continue with public submission");
          toast.error("Missing pitch deck", {
            description: "Please select a PDF file to upload"
          });
          setIsUploading(false);
          return;
        }
        
        // Ensure all required fields are included
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
            setIsUploading(false);
            return;
          }
          formData.append('email', emailForResults);
        }
        
        console.log("Adding form fields:", { 
          title, 
          descriptionLength: briefIntroduction?.length || 0,
          websiteUrl: companyWebsite,
          companyStage,
          industry,
          linkedInProfiles: founderLinkedIns.filter(ln => ln.trim()).length,
          hideEmailField,
          formSlug,
          question,
          // New fields
          companyRegistrationType,
          registrationNumber,
          dpiitRecognitionNumber,
          indianCitizenShareholding,
          executiveSummary,
          companyType,
          productsServices,
          employeeCount,
          fundsRaised,
          valuation,
          lastFyRevenue,
          lastQuarterRevenue,
          // Founder information
          founderName,
          founderGender,
          founderEmail,
          founderContact,
          founderAddress,
          founderState
        });
        
        if (briefIntroduction) {
          formData.append('description', briefIntroduction);
        }
        
        if (companyWebsite && companyWebsite.trim()) {
          formData.append('websiteUrl', companyWebsite);
        }
        
        if (formSlug) {
          console.log("Adding form slug to submission:", formSlug);
          formData.append('formSlug', formSlug);
        } else {
          console.log("No form slug provided for this submission");
        }
        
        if (companyStage) {
          formData.append('companyStage', companyStage);
        }
        
        if (industry) {
          formData.append('industry', industry);
        }
        
        // Add LinkedIn profiles as JSON string
        const filteredProfiles = founderLinkedIns.filter(profile => profile.trim());
        if (filteredProfiles.length > 0) {
          formData.append('linkedInProfiles', JSON.stringify(filteredProfiles));
        }
        
        // Add question field to form data
        if (question) {
          formData.append('question', question);
          console.log("Adding question to submission:", question);
        }
        
        // Add new company fields
        if (companyRegistrationType) {
          formData.append('company_registration_type', companyRegistrationType);
        }
        
        if (registrationNumber) {
          formData.append('registration_number', registrationNumber);
        }
        
        if (dpiitRecognitionNumber) {
          formData.append('dpiit_recognition_number', dpiitRecognitionNumber);
        }
        
        if (indianCitizenShareholding) {
          formData.append('indian_citizen_shareholding', indianCitizenShareholding);
        }
        
        if (executiveSummary) {
          formData.append('executive_summary', executiveSummary);
        }
        
        if (companyType) {
          formData.append('company_type', companyType);
        }
        
        if (productsServices) {
          formData.append('products_services', productsServices);
        }
        
        if (employeeCount) {
          formData.append('employee_count', employeeCount);
        }
        
        if (fundsRaised) {
          formData.append('funds_raised', fundsRaised);
        }
        
        if (valuation) {
          formData.append('valuation', valuation);
        }
        
        if (lastFyRevenue) {
          formData.append('last_fy_revenue', lastFyRevenue);
        }
        
        if (lastQuarterRevenue) {
          formData.append('last_quarter_revenue', lastQuarterRevenue);
        }
        
        // Add founder information
        if (founderName) {
          formData.append('founder_name', founderName);
        }
        
        if (founderGender) {
          formData.append('founder_gender', founderGender);
        }
        
        if (founderEmail) {
          formData.append('founder_email', founderEmail);
        }
        
        if (founderContact) {
          formData.append('founder_contact', founderContact);
        }
        
        if (founderAddress) {
          formData.append('founder_address', founderAddress);
        }
        
        if (founderState) {
          formData.append('founder_state', founderState);
        }
        
        // Log form data entries for debugging
        console.log("FormData entries:");
        for (const [key, value] of formData.entries()) {
          if (value instanceof File) {
            console.log(`${key}: File: ${value.name} (${value.type}, ${value.size} bytes)`);
          } else {
            console.log(`${key}: ${value}`);
          }
        }
        
        const apiUrl = "https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/handle-public-upload";
        console.log("Sending public upload request to:", apiUrl);
        
        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            body: formData,
            // Don't set any headers - let the browser handle it
          });
          
          console.log("Response received:", {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries([...response.headers.entries()]),
          });
          
          if (!response.ok) {
            let errorDetails = "Unknown error";
            try {
              const errorData = await response.json();
              console.error("Response error data:", errorData);
              errorDetails = errorData.details || errorData.message || errorData.error || `Status: ${response.status}`;
            } catch (parseError) {
              console.error("Failed to parse error response:", parseError);
              errorDetails = `Status: ${response.status} (could not parse response)`;
            }
            
            throw new Error(`Upload failed: ${errorDetails}`);
          }
          
          const result = await response.json();
          console.log("Public upload success response:", result);
          
          if (!result.success) {
            throw new Error(result.error || 'Upload failed');
          }
          
          report = { id: result.reportId };
          console.log("Public upload complete, report ID:", report.id);
        } catch (fetchError) {
          console.error("Fetch error details:", fetchError);
          throw fetchError;
        }
      } else {
        // Non-public upload flow
        if (!file) {
          toast.error("Missing pitch deck", {
            description: "Please select a PDF file to upload"
          });
          setIsUploading(false);
          return;
        }
        report = await uploadReport(file, title, briefIntroduction, companyWebsite);
      }
      
      setProgress(30);
      console.log("Upload complete, report:", report);
      
      toast.success("Upload complete", {
        description: isPublic 
          ? "Your pitch deck has been submitted successfully" 
          : "Your pitch deck has been uploaded successfully"
      });
      
      let description = briefIntroduction ? briefIntroduction + '\n\n' : '';
      
      if (companyStage) {
        description += `Company Stage: ${companyStage}\n`;
      }
      
      if (industry) {
        description += `Industry: ${industry}\n`;
      }
      
      if (emailForResults) {
        description += `Contact Email: ${emailForResults}\n`;
      }
      
      if (supplementFiles.length > 0) {
        setProgress(35);
        setProgressStage("Uploading supplementary materials...");
        for (let i = 0; i < supplementFiles.length; i++) {
          const supplementFile = supplementFiles[i];
          try {
            const { error: uploadError } = await supabase.storage
              .from('supplementary-materials')
              .upload(`${report.id}/${supplementFile.name}`, supplementFile);
              
            if (uploadError) {
              console.error(`Error uploading supplementary file ${i+1}:`, uploadError);
              toast.error(`Error uploading supplementary file ${i+1}`, {
                description: uploadError.message
              });
            } else {
              description += `\n\nSupplementary Material ${i+1}: ${supplementFile.name}\n`;
            }
          } catch (err) {
            console.error(`Error processing supplementary file ${i+1}:`, err);
          }
        }
        
        toast.success("Supplementary materials uploaded", {
          description: `${supplementFiles.length} file(s) uploaded successfully`
        });
      }
      
      // Only scrape website content if scraping features are enabled
      let scrapedContent = null;
      if (!disableScrapingFeatures && companyWebsite && companyWebsite.trim()) {
        setProgress(40);
        setIsScrapingWebsite(true);
        const websiteResult = await scrapeWebsite(companyWebsite);
        setIsScrapingWebsite(false);
        if (websiteResult?.success) {
          scrapedContent = websiteResult.scrapedContent;
          toast.success("Website scraped successfully", {
            description: "Website content will be included in the analysis"
          });
        } else if (websiteResult) {
          toast.error("Website scraping failed", {
            description: "Could not scrape the company website. Continuing without website data."
          });
        }
      }
      
      // Only scrape LinkedIn profiles if scraping features are enabled
      let linkedInContent = null;
      if (!disableScrapingFeatures) {
        const validLinkedInProfiles = founderLinkedIns.filter(url => url.trim());
        if (validLinkedInProfiles.length > 0) {
          setProgress(50);
          setProgressStage("Scraping LinkedIn profiles...");
          const linkedInResult = await scrapeLinkedInProfiles(validLinkedInProfiles, report.id);
          if (linkedInResult?.success) {
            linkedInContent = formatLinkedInContent(linkedInResult);
            toast.success("LinkedIn profiles scraped successfully", {
              description: "LinkedIn profile data will be included in the analysis"
            });
          } else if (linkedInResult) {
            toast.error("LinkedIn profile scraping failed", {
              description: "Could not scrape the LinkedIn profiles. Continuing without LinkedIn data."
            });
          }
        }
      }
      
      if (scrapedContent) {
        description += `\n\nWebsite Content:\n${scrapedContent}\n`;
      }
      
      if (linkedInContent) {
        description += `\n\nFounder LinkedIn Profiles:\n${linkedInContent}\n`;
      }
      
      if (description && !isPublic) {
        const { error: updateError } = await supabase
          .from('reports')
          .update({ description })
          .eq('id', report.id);
          
        if (updateError) {
          console.error("Error updating report description:", updateError);
        }
      }
      
      if (!isPublic && !skipAnalysis) {
        setIsAnalyzing(true);
        setProgressStage("Analyzing pitch deck with AI...");
        setProgress(70);
        
        toast.info("Analysis started", {
          description: "This may take a few minutes depending on the size of your deck"
        });
        
        try {
          console.log("Starting analysis with report ID:", report.id);
          const result = await analyzeReport(report.id);
          setProgress(100);
          console.log("Analysis complete, result:", result);
          
          toast.success("Analysis complete", {
            description: "Your pitch deck has been analyzed successfully!"
          });
          
          if (result && result.companyId) {
            navigate(`/company/${result.companyId}`);
          } else {
            console.error("No company ID returned from analysis");
            navigate('/dashboard');
          }
        } catch (analysisError: any) {
          console.error("Error analyzing report:", analysisError);
          
          toast.error("Analysis failed", {
            description: analysisError instanceof Error ? analysisError.message : "Failed to analyze pitch deck"
          });
          
          if (onError) {
            onError(analysisError instanceof Error ? analysisError.message : "Failed to analyze pitch deck");
          }
          
          setProgress(0);
          
          navigate('/dashboard');
          return;
        }
      } else if (isPublic) {
        setProgress(100);
        toast.success("Submission received", {
          description: "Your pitch deck has been submitted successfully!"
        });
        
        // Reset form fields
        setFile(null);
        setSupplementFiles([]);
        setTitle("");
        setBriefIntroduction("");
        setCompanyWebsite("");
        setCompanyStage("");
        setIndustry("");
        setFounderLinkedIns([""]);
        setEmailForResults("");
        setCompanyRegistrationType("");
        setRegistrationNumber("");
        setDpiitRecognitionNumber("");
        setIndianCitizenShareholding("");
        setExecutiveSummary("");
        setCompanyType("");
        setProductsServices("");
        setEmployeeCount("");
        setFundsRaised("");
        setValuation("");
        setLastFyRevenue("");
        setLastQuarterRevenue("");
        setFounderName("");
        setFounderGender("");
        setFounderEmail("");
        setFounderContact("");
        setFounderAddress("");
        setFounderState("");
        
        if (onSuccess) {
          onSuccess();
        }
      }
      
      setProgress(0);
    } catch (error: any) {
      console.error("Error processing report:", error);
      console.error("Full error object:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause,
      });
      
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : "Failed to process pitch deck"
      });
      
      if (onError) {
        onError(error instanceof Error ? error.message : "Failed to process pitch deck");
      }
      
      setProgress(0);
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
      setIsScrapingWebsite(false);
    }
  };

  const isProcessing = isUploading || isAnalyzing;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isPublic ? "Submit Your Pitch" : "Upload New Pitch Deck"}</CardTitle>
        <CardDescription>
          {isPublic 
            ? "Upload your pitch here to be reviewed by our Investments Team." 
            : "Upload a PDF pitch deck to get an AI-powered analysis of its strengths and weaknesses."}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {isPublic ? (
            <CompanyInfoForm
              title={title}
              setTitle={setTitle}
              briefIntroduction={briefIntroduction}
              setBriefIntroduction={setBriefIntroduction}
              companyWebsite={companyWebsite}
              setCompanyWebsite={setCompanyWebsite}
              companyStage={companyStage}
              setCompanyStage={setCompanyStage}
              industry={industry}
              setIndustry={setIndustry}
              founderLinkedIns={founderLinkedIns}
              setFounderLinkedIns={setFounderLinkedIns}
              updateLinkedInProfile={updateLinkedInProfile}
              addLinkedInProfile={addLinkedInProfile}
              removeLinkedInProfile={removeLinkedInProfile}
              isDisabled={isProcessing}
              companyRegistrationType={companyRegistrationType}
              setCompanyRegistrationType={setCompanyRegistrationType}
              registrationNumber={registrationNumber}
              setRegistrationNumber={setRegistrationNumber}
              dpiitRecognitionNumber={dpiitRecognitionNumber}
              setDpiitRecognitionNumber={setDpiitRecognitionNumber}
              indianCitizenShareholding={indianCitizenShareholding}
              setIndianCitizenShareholding={setIndianCitizenShareholding}
              executiveSummary={executiveSummary}
              setExecutiveSummary={setExecutiveSummary}
              companyType={companyType}
              setCompanyType={setCompanyType}
              productsServices={productsServices}
              setProductsServices={setProductsServices}
              employeeCount={employeeCount}
              setEmployeeCount={setEmployeeCount}
              fundsRaised={fundsRaised}
              setFundsRaised={setFundsRaised}
              valuation={valuation}
              setValuation={setValuation}
              lastFyRevenue={lastFyRevenue}
              setLastFyRevenue={setLastFyRevenue}
              lastQuarterRevenue={lastQuarterRevenue}
              setLastQuarterRevenue={setLastQuarterRevenue}
              founderName={founderName}
              setFounderName={setFounderName}
              founderGender={founderGender}
              setFounderGender={setFounderGender}
              founderEmail={founderEmail}
              setFounderEmail={setFounderEmail}
              founderContact={founderContact}
              setFounderContact={setFounderContact}
              founderAddress={founderAddress}
              setFounderAddress={setFounderAddress}
              founderState={founderState}
              setFounderState={setFounderState}
            />
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="title" className="block text-sm font-medium">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Enter your company name"
                  disabled={isProcessing}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="briefIntroduction" className="block text-sm font-medium">
                  Brief Introduction (Optional)
                </label>
                <textarea
                  id="briefIntroduction"
                  value={briefIntroduction}
                  onChange={(e) => setBriefIntroduction(e.target.value)}
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Briefly describe your company (max 500 characters)"
                  disabled={isProcessing}
                  maxLength={500}
                />
                <div className="text-xs text-muted-foreground text-right">
                  {briefIntroduction.length}/500 characters
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="founderLinkedIn" className="block text-sm font-medium">
                  Founder LinkedIn Profiles (Optional)
                </label>
                {founderLinkedIns.map((linkedIn, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      type="url"
                      value={linkedIn}
                      onChange={(e) => updateLinkedInProfile(index, e.target.value)}
                      className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="LinkedIn profile URL"
                      disabled={isProcessing}
                    />
                    {index > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLinkedInProfile(index)}
                        disabled={isProcessing}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLinkedInProfile}
                  disabled={isProcessing}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Founder
                </Button>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="companyWebsite" className="block text-sm font-medium">
                  Company Website (Optional)
                </label>
                <input
                  id="companyWebsite"
                  type="url"
                  value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="https://example.com"
                  disabled={isProcessing}
                />
                {companyWebsite && (
                  <p className="text-xs text-muted-foreground mt-1">
                    If provided, we'll scrape the website to enhance the analysis
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="companyStage" className="block text-sm font-medium">
                    Stage of Company
                  </label>
                  <select
                    id="companyStage"
                    value={companyStage}
                    onChange={(e) => setCompanyStage(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isProcessing}
                  >
                    <option value="">Select stage</option>
                    <option value="Idea">Idea</option>
                    <option value="Pre-seed">Pre-seed</option>
                    <option value="Seed">Seed</option>
                    <option value="Series A">Series A</option>
                    <option value="Series B">Series B</option>
                    <option value="Series C+">Series C+</option>
                    <option value="Profitable">Profitable</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="industry" className="block text-sm font-medium">
                    Industry
                  </label>
                  <select
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isProcessing}
                  >
                    <option value="">Select industry</option>
                    <option value="SaaS">SaaS</option>
                    <option value="Fintech">Fintech</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="E-commerce">E-commerce</option>
                    <option value="Marketplace">Marketplace</option>
                    <option value="Consumer">Consumer</option>
                    <option value="Enterprise">Enterprise</option>
                    <option value="Deep Tech">Deep Tech</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          
          {isPublic && !hideEmailField && (
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium">
                Form Submitter's Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
