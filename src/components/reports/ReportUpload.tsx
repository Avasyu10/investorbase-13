
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
}

export function ReportUpload({ onError }: ReportUploadProps) {
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
    
    // Check authentication first
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Authentication required", {
        description: "Please sign in to upload reports"
      });
      navigate('/login');
      return;
    }
    
    if (!file) {
      toast.error("No file selected", {
        description: "Please select a PDF file to upload"
      });
      return;
    }
    
    if (!title.trim()) {
      toast.error("Company name required", {
        description: "Please provide a company name for the report"
      });
      return;
    }

    if (!briefIntroduction.trim()) {
      toast.error("Brief introduction required", {
        description: "Please provide a brief introduction for your company"
      });
      return;
    }

    try {
      setIsUploading(true);
      setProgressStage("Processing your submission...");
      setProgress(10);
      
      // Upload the report
      console.log("Starting upload process");
      const report = await uploadReport(file, title, briefIntroduction, companyWebsite);
      setProgress(30);
      console.log("Upload complete, report:", report);
      
      toast.success("Upload complete", {
        description: "Your pitch deck has been uploaded successfully"
      });
      
      // Generate description with all metadata
      let description = briefIntroduction + '\n\n';
      
      if (companyStage) {
        description += `Company Stage: ${companyStage}\n`;
      }
      
      if (industry) {
        description += `Industry: ${industry}\n`;
      }
      
      // Upload supplementary files if any
      if (supplementFiles.length > 0) {
        setProgress(35);
        setProgressStage("Uploading supplementary materials...");
        for (let i = 0; i < supplementFiles.length; i++) {
          const supplementFile = supplementFiles[i];
          try {
            const filePath = `${report.id}/${supplementFile.name}`;
            
            const { error: uploadError } = await supabase.storage
              .from('supplementary-materials')
              .upload(filePath, supplementFile);
              
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
      
      // Attempt to scrape the website if URL is provided
      let scrapedContent = null;
      if (companyWebsite && companyWebsite.trim()) {
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
      
      // Scrape LinkedIn profiles if provided
      let linkedInContent = null;
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
      
      // Add scraped website content to description if available
      if (scrapedContent) {
        description += `\n\nWebsite Content:\n${scrapedContent}\n`;
      }
      
      // Add scraped LinkedIn content to description if available
      if (linkedInContent) {
        description += `\n\nFounder LinkedIn Profiles:\n${linkedInContent}\n`;
      }
      
      // Update the report with the complete description
      if (description) {
        const { error: updateError } = await supabase
          .from('reports')
          .update({ description })
          .eq('id', report.id);
          
        if (updateError) {
          console.error("Error updating report description:", updateError);
        }
      }
      
      // Start analysis
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
        
        // Navigate to the company page
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
        
        // Call the onError prop if provided
        if (onError) {
          onError(analysisError instanceof Error ? analysisError.message : "Failed to analyze pitch deck");
        }
        
        setProgress(0);
        
        // Still navigate to dashboard if analysis fails
        navigate('/dashboard');
        return;
      }
    } catch (error: any) {
      console.error("Error processing report:", error);
      
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : "Failed to process pitch deck"
      });
      
      // Call the onError prop if provided
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
        <CardTitle>Upload Pitch Deck</CardTitle>
        <CardDescription>
          Upload a PDF pitch deck for analysis. Our AI will evaluate the pitch deck and provide feedback.
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
            isDisabled={isProcessing}
          />
          
          <FileUploadZone
            id="file"
            label="Pitch Deck"
            file={file}
            onFileChange={handleFileChange}
            accept=".pdf"
            description="PDF files only, max 10MB"
            buttonText="Select PDF"
            disabled={isProcessing}
          />
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-md font-medium">Supplementary Materials</h3>
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
              onChange={handleSupplementFileChange}
              className="hidden"
              disabled={isProcessing}
            />
            
            {supplementFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No supplementary files added</p>
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
            disabled={!file || isProcessing}
            className="w-full md:w-auto"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isScrapingWebsite ? "Scraping website..." : isAnalyzing ? "Analyzing..." : "Uploading..."}
              </>
            ) : (
              "Upload & Analyze"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
