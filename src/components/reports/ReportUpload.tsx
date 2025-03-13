
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
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
import { FileUp, Loader2, Plus, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { analyzePdfDirect } from "@/lib/api/pdfAnalysisService";
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
  const [file, setFile] = useState<File | null>(null);
  const [supplementFile, setSupplementFile] = useState<File | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companyStage, setCompanyStage] = useState("");
  const [industry, setIndustry] = useState("");
  const [founderLinkedIns, setFounderLinkedIns] = useState<string[]>([""]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState("");
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      if (selectedFile.type !== 'application/pdf') {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file",
          variant: "destructive"
        });
        return;
      }
      
      if (selectedFile.size > 25 * 1024 * 1024) { // 25MB limit
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 25MB",
          variant: "destructive"
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
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 10MB",
          variant: "destructive"
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a PDF file to upload",
        variant: "destructive"
      });
      return;
    }
    
    if (!companyName.trim()) {
      toast({
        title: "Company name required",
        description: "Please provide a company name for the report",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      setProgressStage("Analyzing pitch deck...");
      setProgress(10);
      
      // Start with direct PDF analysis
      try {
        // Set progress to show we're analyzing with AI
        setProgress(30);
        setProgressStage("Analyzing with AI...");
        
        // Call the direct PDF analysis service
        const analysis = await analyzePdfDirect(file, companyName);
        
        // Analysis is done - set progress to 100%
        setProgress(100);
        
        // Save analysis to database
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .insert({
            name: companyName,
            total_score: Math.round(analysis.overallScore * 20) // Convert 0-5 scale to 0-100
          })
          .select()
          .single();
          
        if (companyError) {
          console.error("Error saving company:", companyError);
          throw companyError;
        }
        
        if (!company) {
          throw new Error("Failed to create company record");
        }
        
        console.log("Created company:", company);
        
        // Save sections
        for (const section of analysis.sections) {
          const { error: sectionError } = await supabase
            .from('sections')
            .insert({
              company_id: company.id,
              name: section.title,
              description: section.description,
              score: Math.round(section.score * 20) // Convert 0-5 scale to 0-100
            });
            
          if (sectionError) {
            console.error("Error saving section:", sectionError);
            // Continue with other sections even if one fails
          }
        }
        
        // Navigate to the company page
        navigate(`/company/${company.id}`);
      } catch (analysisError: any) {
        console.error("Error with direct analysis:", analysisError);
        
        // Analysis already shows toast errors in the service
        setProgress(0);
        
        // Still navigate to dashboard if analysis fails
        navigate('/dashboard');
        return;
      }
    } catch (error: any) {
      console.error("Error processing report:", error);
      
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to process pitch deck",
        variant: "destructive"
      });
      setProgress(0);
    } finally {
      setIsLoading(false);
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
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter your company name"
              disabled={isLoading}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="founderLinkedIns">Founder LinkedIn Profiles (Optional)</Label>
            {founderLinkedIns.map((linkedin, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  value={linkedin}
                  onChange={(e) => updateFounderLinkedIn(index, e.target.value)}
                  placeholder="LinkedIn profile URL (optional)"
                  disabled={isLoading}
                />
                {index > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeFounderLinkedIn(index)}
                    disabled={isLoading}
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
              disabled={isLoading}
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
              placeholder="https://example.com (optional)"
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stage">Stage of Company (Optional)</Label>
              <Select 
                value={companyStage} 
                onValueChange={setCompanyStage}
                disabled={isLoading}
              >
                <SelectTrigger id="stage">
                  <SelectValue placeholder="Select stage (optional)" />
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
              <Label htmlFor="industry">Industry (Optional)</Label>
              <Select 
                value={industry} 
                onValueChange={setIndustry}
                disabled={isLoading}
              >
                <SelectTrigger id="industry">
                  <SelectValue placeholder="Select industry (optional)" />
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
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("file")?.click()}
                  disabled={isLoading}
                >
                  Select PDF
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF files only, max 25MB
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="supplementFile">Supplemental Material (Optional)</Label>
            <div className="border-2 border-dashed rounded-md p-6 text-center hover:bg-muted/50 transition-colors">
              <div className="flex flex-col items-center space-y-2">
                <FileUp className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {supplementFile ? supplementFile.name : "Drag and drop or click to upload (optional)"}
                </p>
                <Input
                  id="supplementFile"
                  type="file"
                  className="hidden"
                  onChange={handleSupplementFileChange}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("supplementFile")?.click()}
                  disabled={isLoading}
                >
                  Select File
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Any file type, max 10MB (optional)
                </p>
              </div>
            </div>
          </div>
          
          {isLoading && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">{progressStage}</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground italic mt-1">
                AI analysis may take a few minutes. Please be patient...
              </p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-end">
          <Button
            type="submit"
            disabled={!file || isLoading}
            className="w-full md:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Analyze Pitch Deck"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
