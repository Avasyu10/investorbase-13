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
import { FileUp, Loader2, Plus, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/integrations/supabase/client";

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
  const [file, setFile] = useState<File | null>(null);
  const [supplementFile, setSupplementFile] = useState<File | null>(null);
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
  const supabase = createClient();

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
      
      setSupplementFile(selectedFile);
    }
  };

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
    if (!url || !url.trim()) {
      return null;
    }
    
    // Ensure URL is properly formatted
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }
    
    try {
      setIsScrapingWebsite(true);
      setProgressStage("Scraping company website...");
      
      console.log(`Scraping website: ${formattedUrl}`);
      
      const { data, error } = await supabase.functions.invoke('scrape-website', {
        body: { websiteUrl: formattedUrl }
      });
      
      if (error) {
        console.error("Error scraping website:", error);
        toast.error("Website scraping failed", {
          description: "Could not scrape the company website. Continuing without website data."
        });
        return null;
      }
      
      if (!data.success) {
        console.error("Website scraping failed:", data.error);
        toast.error("Website scraping failed", {
          description: "Could not scrape the company website. Continuing without website data."
        });
        return null;
      }
      
      console.log("Website scraped successfully, content length:", data.scrapedContent.length);
      toast.success("Website scraped successfully", {
        description: "Website content will be included in the analysis"
      });
      
      // Store the scraped content in the database for future reference
      const { error: storeError } = await supabase
        .from('website_scrapes')
        .insert({
          url: formattedUrl,
          content: data.scrapedContent,
          scraped_at: new Date().toISOString()
        });
      
      if (storeError) {
        console.error("Error storing scraped content:", storeError);
      }
      
      return data.scrapedContent;
    } catch (error) {
      console.error("Error scraping website:", error);
      toast.error("Website scraping failed", {
        description: "Could not scrape the company website. Continuing without website data."
      });
      return null;
    } finally {
      setIsScrapingWebsite(false);
    }
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
      
      // Attempt to scrape the website if URL is provided
      let scrapedContent = null;
      if (companyWebsite && companyWebsite.trim()) {
        setProgress(20);
        scrapedContent = await scrapeWebsite(companyWebsite);
      }
      
      // Prepare founder LinkedIn profiles for description
      const linkedInsText = founderLinkedIns
        .filter(url => url.trim())
        .map(url => `- ${url}`)
        .join('\n');
      
      // Create a description that includes metadata
      let description = '';
      
      if (companyStage) {
        description += `Company Stage: ${companyStage}\n`;
      }
      
      if (industry) {
        description += `Industry: ${industry}\n`;
      }
      
      if (linkedInsText) {
        description += `\nFounder LinkedIn Profiles:\n${linkedInsText}\n`;
      }
      
      // Add scraped website content to description if available
      if (scrapedContent) {
        description += `\n\nWebsite Content:\n${scrapedContent}\n`;
      }
      
      setProgressStage("Uploading pitch deck...");
      setProgress(30);
      
      // Upload the report
      console.log("Starting upload process");
      const report = await uploadReport(file, title, description, companyWebsite);
      setProgress(60);
      console.log("Upload complete, report:", report);
      
      toast.success("Upload complete", {
        description: "Your pitch deck has been uploaded successfully"
      });
      
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
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
      setIsScrapingWebsite(false);
    }
  };

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
          <div className="space-y-2">
            <Label htmlFor="title">Company Name</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter your company name"
              disabled={isUploading || isAnalyzing}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label>Founder LinkedIn Profiles (Optional)</Label>
            {founderLinkedIns.map((linkedin, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  value={linkedin}
                  onChange={(e) => updateFounderLinkedIn(index, e.target.value)}
                  placeholder="LinkedIn profile URL"
                  disabled={isUploading || isAnalyzing}
                />
                {index > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeFounderLinkedIn(index)}
                    disabled={isUploading || isAnalyzing}
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
              disabled={isUploading || isAnalyzing}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Founder
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Company Website (Optional)</Label>
            <Input
              id="website"
              value={companyWebsite}
              onChange={(e) => setCompanyWebsite(e.target.value)}
              placeholder="https://example.com"
              disabled={isUploading || isAnalyzing}
            />
            <p className="text-xs text-muted-foreground">
              If provided, we'll scrape the website to enhance the analysis
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stage">Stage of Company</Label>
              <Select 
                value={companyStage} 
                onValueChange={setCompanyStage}
                disabled={isUploading || isAnalyzing}
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
                disabled={isUploading || isAnalyzing}
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
          
          <div className="space-y-2">
            <Label htmlFor="file">Pitch Deck</Label>
            <div className="border-2 border-dashed rounded-md p-6 text-center hover:bg-muted/50 transition-colors">
              <div className="flex flex-col items-center space-y-2">
                <FileUp className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {file ? file.name : "Drag and drop or click to upload"}
                </p>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isUploading || isAnalyzing}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("file")?.click()}
                  disabled={isUploading || isAnalyzing}
                >
                  Select PDF
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF files only, max 10MB
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="supplementFile">Supplemental Material (if any)</Label>
            <div className="border-2 border-dashed rounded-md p-6 text-center hover:bg-muted/50 transition-colors">
              <div className="flex flex-col items-center space-y-2">
                <FileUp className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {supplementFile ? supplementFile.name : "Drag and drop or click to upload"}
                </p>
                <Input
                  id="supplementFile"
                  type="file"
                  className="hidden"
                  onChange={handleSupplementFileChange}
                  disabled={isUploading || isAnalyzing}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("supplementFile")?.click()}
                  disabled={isUploading || isAnalyzing}
                >
                  Select File
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Any file type, max 10MB
                </p>
              </div>
            </div>
          </div>
          
          {(isUploading || isAnalyzing) && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">{progressStage}</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground italic mt-1">
                {isScrapingWebsite && "Scraping website content..."}
                {isAnalyzing && "AI analysis may take a few minutes. Please be patient..."}
              </p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-end">
          <Button
            type="submit"
            disabled={!file || isUploading || isAnalyzing}
            className="w-full md:w-auto"
          >
            {isUploading || isAnalyzing ? (
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
