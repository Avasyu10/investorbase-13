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
}

export function ReportUpload({ 
  onError, 
  onSuccess, 
  isPublic = false, 
  buttonText = "Upload & Analyze",
  skipAnalysis = false,
  formSlug = null,
  hideEmailField = false,
  disableScrapingFeatures = false
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
        
        // For public uploads, add LinkedIn profiles as JSON string - the backend handles scraping
        const filteredProfiles = founderLinkedIns.filter(profile => profile.trim());
        if (filteredProfiles.length > 0) {
          formData.append('linkedInProfiles', JSON.stringify(filteredProfiles));
          console.log("LinkedIn profiles will be scraped by backend automatically:", filteredProfiles);
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
        
        // Use the correct Supabase edge function URL
        const apiUrl = `https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/handle-public-upload`;
        console.log("Sending public upload request to:", apiUrl);
        
        setProgressStage("Uploading and processing LinkedIn profiles...");
        setProgress(50);
        
        try {
          console.log("Making request to edge function...");
          const response = await fetch(apiUrl, {
            method: 'POST',
            body: formData,
            // Don't set Content-Type header - let browser handle it for multipart/form-data
            // Don't set Authorization header for public endpoint
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
              const responseText = await response.text().catch(() => "Could not read response");
              console.error("Raw response:", responseText);
              errorDetails = `Status: ${response.status} - ${response.statusText}`;
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
      
      // Only perform client-side scraping for NON-PUBLIC uploads
      if (!isPublic) {
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
        
        // Enhanced LinkedIn profile scraping for NON-PUBLIC uploads only
        let linkedInContent = null;
        if (!disableScrapingFeatures) {
          const validLinkedInProfiles = founderLinkedIns.filter(url => {
            const trimmedUrl = url.trim();
            return trimmedUrl && (
              trimmedUrl.includes('linkedin.com/in/') || 
              trimmedUrl.includes('linkedin.com/pub/') ||
              trimmedUrl.includes('www.linkedin.com/in/') ||
              trimmedUrl.includes('www.linkedin.com/pub/')
            );
          });
          
          if (validLinkedInProfiles.length > 0) {
            setProgress(50);
            setProgressStage("Scraping founder LinkedIn profiles...");
            console.log("Starting LinkedIn profile scraping for:", validLinkedInProfiles);
            
            try {
              const linkedInResult = await scrapeLinkedInProfiles(validLinkedInProfiles, report.id);
              
              if (linkedInResult?.success) {
                linkedInContent = formatLinkedInContent(linkedInResult);
                const profileCount = linkedInResult.profiles?.length || 0;
                
                toast.success("LinkedIn profiles processed", {
                  description: `Successfully scraped ${profileCount} public LinkedIn profile(s) for team analysis`
                });
                
                console.log("LinkedIn scraping successful:", {
                  profileCount,
                  contentLength: linkedInContent?.length || 0
                });
              } else if (linkedInResult) {
                console.warn("LinkedIn scraping completed with issues:", linkedInResult.error);
                toast.warning("LinkedIn profile scraping", {
                  description: "Some LinkedIn profiles could not be accessed (likely private). Continuing with available data."
                });
              }
            } catch (linkedInError) {
              console.error("LinkedIn scraping error:", linkedInError);
              toast.warning("LinkedIn profile scraping", {
                description: "Could not access LinkedIn profiles. Continuing without LinkedIn data."
              });
            }
          }
        }
        
        if (scrapedContent) {
          description += `\n\nWebsite Content:\n${scrapedContent}\n`;
        }
        
        if (linkedInContent) {
          description += `\n\n${linkedInContent}\n`;
          description += `\nNOTE: This LinkedIn profile data should be specifically analyzed in the TEAM section to assess:\n`;
          description += `- Founder experience and background relevance\n`;
          description += `- Leadership capabilities and track record\n`;
          description += `- Industry expertise and domain knowledge\n`;
          description += `- Educational qualifications\n`;
          description += `- Previous startup or entrepreneurial experience\n`;
          description += `- Technical skills and competencies\n`;
          description += `- Network quality and professional connections\n\n`;
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
          description: "Your pitch deck has been submitted successfully! LinkedIn profiles have been processed automatically."
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
        <CardTitle>Submit Your Pitch</CardTitle>
        <CardDescription>
          Upload your pitch here to be reviewed by our Investments Team.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
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
            // New company fields
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
            // Founder information
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
          
          {isPublic && !hideEmailField && (
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium">
                Form Submitter's Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={emailForResults}
                onChange={(e) => setEmailForResults(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Form Submitter's Email"
                disabled={isProcessing}
                required={true}
              />
            </div>
          )}
          
          <FileUploadZone
            id="file"
            label="Pitch Deck"
            file={file}
            onFileChange={handleFileChange}
            accept=".pdf"
            description="PDF files only, max 10MB"
            buttonText="Select PDF"
            disabled={isProcessing}
            required={true}
          />
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-md font-medium">Supplementary Materials (Optional)</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const fileInput = document.getElementById('supplementFile');
                  if (fileInput) fileInput.click();
                }}
                disabled={isProcessing}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add File
              </Button>
            </div>
            
            <input
              id="supplementFile"
              type="file"
              accept=".pdf"
              onChange={handleSupplementFileChange}
              className="hidden"
              disabled={isProcessing}
            />
            
            {supplementFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No supplementary files added (PDF only, max 10MB)</p>
            ) : (
              <div className="space-y-2">
                {supplementFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-md">
                    <span className="text-sm truncate max-w-[80%]">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSupplementFile(index)}
                      disabled={isProcessing}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="space-y-2 pt-2 border-t">
            <h3 className="text-md font-medium">Have a Question? Let Us Know.</h3>
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Do you have any questions about our investment process or anything else? Feel free to ask."
              disabled={isProcessing}
            />
          </div>
          
          {isProcessing && (
            <ProgressIndicator
              progressStage={progressStage}
              progress={progress}
              isScrapingWebsite={isScrapingWebsite}
              isAnalyzing={isAnalyzing}
            />
          )}
        </CardContent>
        
        <CardFooter className="flex justify-end">
          <Button
            type="submit"
            disabled={isProcessing}
            className="w-full md:w-auto"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isScrapingWebsite ? "Scraping website..." : isAnalyzing ? "Analyzing..." : "Uploading..."}
              </>
            ) : (
              buttonText
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
