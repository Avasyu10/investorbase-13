
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadReport, analyzeReport } from "@/lib/supabase";
import { Globe, Loader2, Plus, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

// Company stage options
const COMPANY_STAGES = [
  "Pre-seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C+",
  "Growth",
  "Pre-IPO",
  "Public",
  "Other"
];

// Industry options
const INDUSTRIES = [
  "SaaS",
  "FinTech",
  "HealthTech",
  "EdTech",
  "E-commerce",
  "AI/ML",
  "Blockchain",
  "CleanTech",
  "Consumer",
  "Enterprise",
  "Gaming",
  "Hardware",
  "Marketplace",
  "Media",
  "Mobile",
  "Real Estate",
  "Transportation",
  "Other"
];

export function ReportUpload() {
  const [title, setTitle] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [companyStage, setCompanyStage] = useState("");
  const [industry, setIndustry] = useState("");
  const [founderLinkedIns, setFounderLinkedIns] = useState<string[]>([""]);
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState("");
  const navigate = useNavigate();

  const addFounderLinkedIn = () => {
    setFounderLinkedIns([...founderLinkedIns, ""]);
  };

  const removeFounderLinkedIn = (index: number) => {
    if (founderLinkedIns.length > 1) {
      const updatedFounders = [...founderLinkedIns];
      updatedFounders.splice(index, 1);
      setFounderLinkedIns(updatedFounders);
    }
  };

  const updateFounderLinkedIn = (index: number, value: string) => {
    const updatedFounders = [...founderLinkedIns];
    updatedFounders[index] = value;
    setFounderLinkedIns(updatedFounders);
  };

  const scrapeWebsite = async (url: string) => {
    if (!url.trim()) {
      toast.error("Please enter a valid URL");
      return null;
    }

    // Make sure URL has protocol
    let formattedUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      formattedUrl = 'https://' + url;
    }

    setIsScraping(true);
    setProgressStage("Scraping website content...");
    setProgress(10);

    try {
      // Call the edge function to scrape the website
      const { data, error } = await supabase.functions.invoke('scrape-website', {
        body: { url: formattedUrl }
      });

      if (error) {
        console.error("Error scraping website:", error);
        toast.error("Failed to scrape website", {
          description: "Could not retrieve content from the provided URL"
        });
        setIsScraping(false);
        return null;
      }

      if (!data || !data.content) {
        toast.error("Invalid response from scraping service", {
          description: "No content was retrieved from the website"
        });
        setIsScraping(false);
        return null;
      }

      setProgress(30);
      toast.success("Website scraped successfully");
      return { content: data.content, url: formattedUrl };
    } catch (error) {
      console.error("Exception scraping website:", error);
      toast.error("Failed to scrape website", {
        description: error instanceof Error ? error.message : "An unexpected error occurred"
      });
      setIsScraping(false);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!websiteUrl.trim()) {
      toast.error("No website URL provided", {
        description: "Please enter a website URL to analyze"
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
      
      // Step 1: Scrape the website
      setProgressStage("Scraping website content...");
      setProgress(10);
      
      const scrapedData = await scrapeWebsite(websiteUrl);
      
      if (!scrapedData) {
        setIsUploading(false);
        return;
      }

      // Step 2: Create a PDF from the scraped content
      const blob = new Blob([`Company Website: ${scrapedData.url}\n\n${scrapedData.content}`], { type: 'application/pdf' });
      const webContentFile = new File([blob], `${title.replace(/\s+/g, '_')}_website_content.pdf`, { type: 'application/pdf' });
      
      setProgressStage("Uploading scraped content...");
      setProgress(40);
      
      // Step 3: Upload the file with the scraped content
      const report = await uploadReport(webContentFile, title, "");
      
      if (!report) {
        toast.error("Failed to create report", {
          description: "Could not upload the scraped content"
        });
        setIsUploading(false);
        return;
      }
      
      // Step 4: Store the scraped content in the database
      try {
        const { error: scrapeStorageError } = await supabase.from('website_scrapes').insert({
          report_id: report.id,
          url: scrapedData.url,
          content: scrapedData.content
        });
        
        if (scrapeStorageError) {
          console.error("Error storing scraped content:", scrapeStorageError);
          // Non-blocking - continue with analysis
        }
      } catch (storageError) {
        console.error("Exception storing scraped content:", storageError);
        // Non-blocking - continue with analysis
      }
      
      toast.success("Website content processed", {
        description: "Website content has been successfully processed"
      });
      
      // Step 5: Start analysis
      setIsAnalyzing(true);
      setProgressStage("Analyzing content with AI...");
      setProgress(50);
      
      toast.info("Analysis started", {
        description: "This may take a few minutes"
      });
      
      try {
        console.log("Starting analysis with report ID:", report.id);
        const result = await analyzeReport(report.id);
        setProgress(100);
        console.log("Analysis complete, result:", result);
        
        toast.success("Analysis complete", {
          description: "Your website has been analyzed successfully!"
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
        
        // Error already handled by the analyzeReport function
        setProgress(0);
        
        // Still navigate to dashboard if analysis fails
        navigate('/dashboard');
        return;
      }
    } catch (error: any) {
      console.error("Error processing report:", error);
      
      toast.error("Analysis failed", {
        description: error instanceof Error ? error.message : "Failed to process website content"
      });
      setProgress(0);
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
      setIsScraping(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Analyze Company Website</CardTitle>
        <CardDescription>
          Enter a company website URL for analysis. Our AI will evaluate the content and provide feedback.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Company Name</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter your company name"
              disabled={isUploading || isAnalyzing || isScraping}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="websiteUrl">Company Website URL</Label>
            <div className="flex gap-2">
              <div className="relative flex-grow">
                <Globe className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                <Input
                  id="websiteUrl"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="pl-10"
                  disabled={isUploading || isAnalyzing || isScraping}
                  required
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the company's website URL for AI to analyze the content
            </p>
          </div>

          <div className="space-y-2">
            <Label>Founder LinkedIn Profiles (Optional)</Label>
            {founderLinkedIns.map((linkedin, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  value={linkedin}
                  onChange={(e) => updateFounderLinkedIn(index, e.target.value)}
                  placeholder="LinkedIn profile URL"
                  disabled={isUploading || isAnalyzing || isScraping}
                />
                {index > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeFounderLinkedIn(index)}
                    disabled={isUploading || isAnalyzing || isScraping}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addFounderLinkedIn}
              disabled={isUploading || isAnalyzing || isScraping}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Founder
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Company Website (Optional secondary URL)</Label>
            <Input
              id="website"
              value={companyWebsite}
              onChange={(e) => setCompanyWebsite(e.target.value)}
              placeholder="https://example.com"
              disabled={isUploading || isAnalyzing || isScraping}
            />
            <p className="text-xs text-muted-foreground">
              Additional website URL if the company has multiple sites
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stage">Stage of Company</Label>
              <Select 
                value={companyStage} 
                onValueChange={setCompanyStage}
                disabled={isUploading || isAnalyzing || isScraping}
              >
                <SelectTrigger id="stage">
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Select 
                value={industry} 
                onValueChange={setIndustry}
                disabled={isUploading || isAnalyzing || isScraping}
              >
                <SelectTrigger id="industry">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind}>
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {(isUploading || isAnalyzing || isScraping) && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">{progressStage}</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground italic mt-1">
                {isAnalyzing ? "AI analysis may take a few minutes. Please be patient..." : ""}
                {isScraping ? "Website scraping in progress. This may take a moment..." : ""}
              </p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-end">
          <Button
            type="submit"
            disabled={!websiteUrl || isUploading || isAnalyzing || isScraping}
            className="w-full md:w-auto"
          >
            {isUploading || isAnalyzing || isScraping ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isAnalyzing ? "Analyzing..." : isScraping ? "Scraping..." : "Processing..."}
              </>
            ) : (
              "Analyze Website"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
