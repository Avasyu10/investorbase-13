import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2, Plus, FileUp } from "lucide-react";
import { Toaster } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { uploadReport, analyzeReport } from "@/lib/supabase";
import { FileUploadZone } from "@/components/reports/upload/FileUploadZone";
import { supabase } from '@/integrations/supabase/client';
import { AnalysisLimitModal } from "@/components/reports/AnalysisLimitModal";

const UploadReport = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  
  const [title, setTitle] = useState("");
  const [briefIntroduction, setBriefIntroduction] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [founderLinkedIns, setFounderLinkedIns] = useState<string[]>([""]);
  const [companyStage, setCompanyStage] = useState("");
  const [industry, setIndustry] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [supplementFiles, setSupplementFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [isCheckingLimits, setIsCheckingLimits] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login', { state: { from: '/upload' } });
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    return () => {
      setError(null);
    };
  }, []);

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setTimeout(() => setError(null), 10000);
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      if (selectedFile.type !== 'application/pdf') {
        toast.error("Invalid file type", {
          description: "Please upload a PDF file"
        });
        return;
      }
      
      if (selectedFile.size > 10 * 1024 * 1024) {
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
      
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("File too large", {
          description: "Please upload a file smaller than 10MB"
        });
        return;
      }
      
      setSupplementFiles(prev => [...prev, selectedFile]);
    }
  };

  const addLinkedInProfile = () => {
    setFounderLinkedIns(prev => [...prev, ""]);
  };

  const updateLinkedInProfile = (index: number, value: string) => {
    setFounderLinkedIns(prev => 
      prev.map((profile, i) => i === index ? value : profile)
    );
  };

  const checkAnalysisLimits = async () => {
    if (!user) return false;
    
    try {
      setIsCheckingLimits(true);
      const { data, error } = await supabase
        .from('analysis_limits')
        .select('analysis_count, max_analysis_allowed')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error("Error checking analysis limits:", error);
        toast.error("Could not check analysis limits", {
          description: "Please try again later"
        });
        return false;
      }
      
      if (!data) {
        console.error("No analysis limits found for user");
        return false;
      }
      
      console.log("Analysis limits:", data);
      
      if (data.analysis_count >= data.max_analysis_allowed) {
        setIsLimitModalOpen(true);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error("Error in checkAnalysisLimits:", err);
      return false;
    } finally {
      setIsCheckingLimits(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error("Company name required", {
        description: "Please provide a company name for the report"
      });
      return;
    }

    if (!file) {
      toast.error("Pitch deck required", {
        description: "Please upload a PDF pitch deck"
      });
      return;
    }

    const canProceed = await checkAnalysisLimits();
    if (!canProceed) {
      return;
    }

    try {
      setIsUploading(true);
      
      let description = briefIntroduction || '';
      
      if (companyStage) {
        description += `\n\nCompany Stage: ${companyStage}`;
      }
      
      if (industry) {
        description += `\n\nIndustry: ${industry}`;
      }
      
      const validLinkedInProfiles = founderLinkedIns.filter(url => url.trim());
      if (validLinkedInProfiles.length > 0) {
        description += `\n\nFounder LinkedIn Profiles:\n${validLinkedInProfiles.join('\n')}`;
      }
      
      const report = await uploadReport(file, title, description, companyWebsite);
      
      console.log("Upload complete, report:", report);
      
      toast.success("Upload complete", {
        description: "Your pitch deck has been uploaded successfully"
      });
      
      if (supplementFiles.length > 0) {
        for (const supplementFile of supplementFiles) {
          try {
            const { error: uploadError } = await supabase.storage
              .from('report-pdfs')
              .upload(`${user.id}/supplementary/${report.id}/${supplementFile.name}`, supplementFile);
              
            if (uploadError) {
              console.error("Error uploading supplementary file:", uploadError);
              toast.error("Error uploading supplementary file", {
                description: uploadError.message
              });
            }
          } catch (err) {
            console.error("Error processing supplementary file:", err);
          }
        }
        
        toast.success("Supplementary materials uploaded", {
          description: `${supplementFiles.length} file(s) uploaded successfully`
        });
      }
      
      setIsAnalyzing(true);
      
      toast.info("Analysis started", {
        description: "This may take a few minutes depending on the size of your deck"
      });
      
      try {
        console.log("Starting analysis with report ID:", report.id);
        const result = await analyzeReport(report.id);
        console.log("Analysis complete, result:", result);
        
        // Show success message and redirect to dashboard
        toast.success("Analysis Complete!", {
          description: "Your pitch deck has been analyzed successfully. You can view the results in your dashboard."
        });
        
        navigate('/dashboard');
      } catch (analysisError: any) {
        console.error("Error analyzing report:", analysisError);
        
        if (analysisError.message?.includes("Analysis limit reached")) {
          setIsLimitModalOpen(true);
        } else {
          toast.error("Analysis failed", {
            description: analysisError instanceof Error ? analysisError.message : "Failed to analyze pitch deck"
          });
        }
        
        if (handleError) {
          handleError(analysisError instanceof Error ? analysisError.message : "Failed to analyze pitch deck");
        }
        
        navigate('/dashboard');
        return;
      }
    } catch (error: any) {
      console.error("Error processing report:", error);
      
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : "Failed to process pitch deck"
      });
      
      if (handleError) {
        handleError(error instanceof Error ? error.message : "Failed to process pitch deck");
      }
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isProcessing = isUploading || isAnalyzing || isCheckingLimits;

  return (
    <div className="animate-fade-in">
      <Toaster position="top-center" />
      <div className="container mx-auto px-4 py-6">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBackClick}
          className="mb-6"
        >
          <ChevronLeft className="mr-1" /> Back
        </Button>
        
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight mb-2">Upload New Pitch Deck</h1>
          <p className="text-muted-foreground">
            Upload a PDF pitch deck to get an AI-powered analysis of its strengths and weaknesses.
            Adding your company website will enhance the analysis with additional context.
          </p>
        </div>
        
        <div className="max-w-3xl mx-auto bg-card rounded-lg border shadow-sm p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-1">Submit Your Pitch</h2>
            <p className="text-sm text-muted-foreground">Upload your pitch here to be reviewed by our Investments Team.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="company-name" className="flex items-center">
                Company Name <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input 
                id="company-name" 
                placeholder="Enter your company name" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isProcessing}
                required
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="introduction">Brief Introduction (Optional)</Label>
              <Textarea 
                id="introduction" 
                placeholder="Briefly describe your company (max 500 characters)"
                value={briefIntroduction}
                onChange={(e) => setBriefIntroduction(e.target.value)}
                maxLength={500}
                disabled={isProcessing}
                className="mt-1 min-h-[100px]"
              />
              <div className="text-xs text-muted-foreground mt-1">
                {briefIntroduction.length}/500 characters
              </div>
            </div>
            
            <div>
              <Label>Founder LinkedIn Profiles (Optional)</Label>
              {founderLinkedIns.map((profile, index) => (
                <Input
                  key={index}
                  placeholder="LinkedIn profile URL"
                  value={profile}
                  onChange={(e) => updateLinkedInProfile(index, e.target.value)}
                  disabled={isProcessing}
                  className="mt-1 mb-2"
                />
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLinkedInProfile}
                disabled={isProcessing}
                className="mt-1"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Another Founder
              </Button>
            </div>
            
            <div>
              <Label htmlFor="website">Company Website (Optional)</Label>
              <Input 
                id="website" 
                placeholder="https://example.com" 
                value={companyWebsite}
                onChange={(e) => setCompanyWebsite(e.target.value)}
                disabled={isProcessing}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                If provided, we'll scrape the website to enhance the analysis
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company-stage">Stage of Company</Label>
                <select
                  id="company-stage"
                  value={companyStage}
                  onChange={(e) => setCompanyStage(e.target.value)}
                  disabled={isProcessing}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                >
                  <option value="">Select stage</option>
                  <option value="Pre-seed">Pre-seed</option>
                  <option value="Seed">Seed</option>
                  <option value="Series A">Series A</option>
                  <option value="Series B">Series B</option>
                  <option value="Series C+">Series C+</option>
                  <option value="Growth">Growth</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="industry">Industry</Label>
                <select
                  id="industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  disabled={isProcessing}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                >
                  <option value="">Select industry</option>
                  <option value="SaaS">SaaS</option>
                  <option value="Fintech">Fintech</option>
                  <option value="Healthtech">Healthtech</option>
                  <option value="E-commerce">E-commerce</option>
                  <option value="Edtech">Edtech</option>
                  <option value="AI/ML">AI/ML</option>
                  <option value="Blockchain">Blockchain</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            
            <div>
              <div className="flex items-center">
                <Label htmlFor="pitch-deck">Pitch Deck</Label>
                <span className="text-red-500 ml-1">*</span>
              </div>
              
              <div className="mt-1 border-2 border-dashed rounded-md p-6 text-center hover:bg-muted/50 transition-colors">
                <div className="flex flex-col items-center">
                  <FileUp className={`h-10 w-10 ${!file ? 'text-red-400' : 'text-muted-foreground'}`} />
                  
                  <p className={`mt-2 ${!file ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                    {file ? file.name : "File Required - Click to Upload"}
                  </p>
                  
                  <Button
                    type="button"
                    variant={!file ? "destructive" : "secondary"}
                    onClick={() => document.getElementById('pitch-deck')?.click()}
                    disabled={isProcessing}
                    className="mt-2"
                  >
                    Select PDF
                  </Button>
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    PDF files only, max 10MB
                  </p>
                  
                  {!file && (
                    <p className="text-xs text-red-500 mt-1">This field is required</p>
                  )}
                  
                  <input
                    id="pitch-deck"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isProcessing}
                    required
                  />
                </div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center">
                <Label>Supplementary Materials</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('supplement-file')?.click()}
                  disabled={isProcessing}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add File
                </Button>
                
                <input
                  id="supplement-file"
                  type="file"
                  accept=".pdf"
                  onChange={handleSupplementFileChange}
                  className="hidden"
                  disabled={isProcessing}
                />
              </div>
              
              <div className="mt-2">
                {supplementFiles.length > 0 ? (
                  <ul className="space-y-2">
                    {supplementFiles.map((file, index) => (
                      <li key={index} className="text-sm">
                        {file.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No supplementary files added (PDF only, max 10MB)</p>
                )}
              </div>
            </div>
            
            <div className="pt-2">
              <Button
                type="submit"
                className="w-full"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isUploading ? "Analyzing.." : "Analyzing..."}
                  </>
                ) : (
                  "Upload & Analyze"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
      
      <AnalysisLimitModal 
        isOpen={isLimitModalOpen}
        onClose={() => setIsLimitModalOpen(false)}
      />
    </div>
  );
};

export default UploadReport;
