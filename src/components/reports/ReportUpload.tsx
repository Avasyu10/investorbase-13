
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
import { uploadReport, analyzeReportDirect } from "@/lib/supabase/reports"; // Import direct analyze method
import { analyzeReport } from "@/lib/supabase/analysis";
import { Loader2, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CompanyInfoForm } from "./upload/CompanyInfoForm";
import { FileUploadZone } from "./upload/FileUploadZone";
import { ProgressIndicator } from "./upload/ProgressIndicator";
import { scrapeWebsite } from "./upload/WebsiteService";
import { scrapeLinkedInProfiles, formatLinkedInContent } from "./upload/LinkedInService";

export function ReportUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [supplementFiles, setSupplementFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
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

    try {
      setIsUploading(true);
      setProgressStage("Processing your submission...");
      setProgress(10);
      
      // Try direct analysis method first if file is small enough (under 5MB)
      // This can help prevent Edge Function timeouts for larger files
      const useDirectMethod = file.size < 5 * 1024 * 1024;
      let result;

      if (useDirectMethod) {
        try {
          console.log("Using direct analysis method for smaller file");
          setProgressStage("Analyzing pitch deck directly...");
          setProgress(30);
          setIsAnalyzing(true);
          
          result = await analyzeReportDirect(file, title, "");
          
          if (result?.companyId) {
            toast.success("Analysis complete", {
              description: "Your pitch deck has been analyzed successfully!"
            });
            
            // Navigate to the company page
            navigate(`/company/${result.companyId}`);
            return;
          }
        } catch (directError) {
          console.error("Direct analysis failed, falling back to regular upload:", directError);
          // If direct method fails, we'll continue with the regular upload process
          setIsAnalyzing(false);
          setProgress(10);
        }
      }

      // Regular upload process
      console.log("Starting upload process");
      const report = await uploadReport(file, title, "", companyWebsite);
      setProgress(30);
      console.log("Upload complete, report:", report);
      
      toast.success("Upload complete", {
        description: "Your pitch deck has been uploaded successfully"
      });
      
      // Generate description with all metadata
      let description = '';
      
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
        
        const supplementUploadPromises = supplementFiles.map(async (supplementFile, i) => {
          try {
            const { error: uploadError } = await supabase.storage
              .from('supplementary-materials')
              .upload(`${report.id}/${supplementFile.name}`, supplementFile);
              
            if (uploadError) {
              console.error(`Error uploading supplementary file ${i+1}:`, uploadError);
              toast.error(`Error uploading supplementary file ${i+1}`, {
                description: uploadError.message
              });
              return null;
            } else {
              return `\n\nSupplementary Material ${i+1}: ${supplementFile.name}\n`;
            }
          } catch (err) {
            console.error(`Error processing supplementary file ${i+1}:`, err);
            return null;
          }
        });
        
        const supplementResults = await Promise.allSettled(supplementUploadPromises);
        const successfulUploads = supplementResults
          .filter(result => result.status === 'fulfilled' && result.value)
          .map(result => (result as PromiseFulfilledResult<string>).value);
        
        description += successfulUploads.join('');
        
        const uploadCount = successfulUploads.length;
        if (uploadCount > 0) {
          toast.success("Supplementary materials uploaded", {
            description: `${uploadCount} file(s) uploaded successfully`
          });
        }
      }
      
      // Try-catch blocks for each step to prevent full process failure
      
      // Website scraping
      let scrapedContent = null;
      if (companyWebsite && companyWebsite.trim()) {
        try {
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
        } catch (scrapeError) {
          console.error("Error during website scraping:", scrapeError);
          setIsScrapingWebsite(false);
          toast.error("Website scraping failed", {
            description: "Error scraping website. Continuing without website data."
          });
        }
      }
      
      // LinkedIn scraping
      let linkedInContent = null;
      const validLinkedInProfiles = founderLinkedIns.filter(url => url.trim());
      if (validLinkedInProfiles.length > 0) {
        try {
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
        } catch (linkedInError) {
          console.error("Error during LinkedIn scraping:", linkedInError);
          toast.error("LinkedIn profile scraping failed", {
            description: "Error scraping LinkedIn profiles. Continuing without LinkedIn data."
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
        try {
          const { error: updateError } = await supabase
            .from('reports')
            .update({ description })
            .eq('id', report.id);
            
          if (updateError) {
            console.error("Error updating report description:", updateError);
          }
        } catch (updateError) {
          console.error("Exception updating report description:", updateError);
        }
      }
      
      // Start analysis with improved error handling
      setIsAnalyzing(true);
      setProgressStage("Analyzing pitch deck with AI...");
      setProgress(70);
      
      toast.info("Analysis started", {
        description: "This may take a few minutes depending on the size of your deck"
      });
      
      try {
        console.log("Starting analysis with report ID:", report.id);
        
        // Set a timeout to navigate to dashboard if analysis takes too long
        const analysisTimeout = setTimeout(() => {
          if (isAnalyzing) {
            toast.info("Analysis is taking longer than expected", {
              description: "You can check the dashboard later for results"
            });
            navigate('/dashboard');
          }
        }, 120000); // 2 minutes timeout
        
        result = await analyzeReport(report.id);
        clearTimeout(analysisTimeout);
        
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
      setProgress(0);
      
      // Reset state to allow retry
      setIsUploading(false);
      setIsAnalyzing(false);
      setIsScrapingWebsite(false);
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
