
import { useState } from "react";
import { FileUploadZone } from "@/components/reports/upload/FileUploadZone";
import { ProgressIndicator } from "@/components/reports/upload/ProgressIndicator";
import { uploadReport } from "@/lib/supabase/analysis";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function VCAnalysisUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [briefIntroduction, setBriefIntroduction] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [founderLinkedIns, setFounderLinkedIns] = useState<string[]>([""]);
  const [companyStage, setCompanyStage] = useState("");
  const [industry, setIndustry] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  const addLinkedInProfile = () => {
    setFounderLinkedIns(prev => [...prev, ""]);
  };

  const updateLinkedInProfile = (index: number, value: string) => {
    setFounderLinkedIns(prev => 
      prev.map((profile, i) => i === index ? value : profile)
    );
  };

  const handleSubmit = async () => {
    if (!selectedFile || !title.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a file and enter a company name.",
        variant: "destructive"
      });
      return;
    }

    console.log('VCAnalysisUpload - Starting VC analysis process');
    
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const uploadInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      console.log('VCAnalysisUpload - Uploading report to storage');
      
      // Create description with additional info like regular upload
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
      
      // Upload the report first using the same method as regular upload
      const report = await uploadReport(selectedFile, title, description, companyWebsite);
      console.log('VCAnalysisUpload - Report uploaded successfully:', report.id);
      
      clearInterval(uploadInterval);
      setUploadProgress(100);
      setIsUploading(false);
      
      // Add a longer delay to ensure the database transaction is fully committed
      console.log('VCAnalysisUpload - Waiting for database commit');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Start analysis
      setIsAnalyzing(true);
      setAnalysisProgress(0);
      
      // Simulate analysis progress
      const analysisInterval = setInterval(() => {
        setAnalysisProgress(prev => Math.min(prev + 5, 90));
      }, 1000);

      console.log('VCAnalysisUpload - Starting VC analysis for report:', report.id);
      
      // Call the VC analysis function - use the same pattern as regular upload
      const { data, error } = await supabase.functions.invoke('analyze-pdf-vc', {
        body: { reportId: report.id }
      });
      
      if (error) {
        console.error('VCAnalysisUpload - Analysis function error:', error);
        throw new Error('Analysis failed: ' + error.message);
      }
      
      if (!data || data.error) {
        const errorMessage = data?.error || "Unknown error occurred during VC analysis";
        console.error('VCAnalysisUpload - Analysis returned error:', errorMessage);
        throw new Error(errorMessage);
      }
      
      clearInterval(analysisInterval);
      setAnalysisProgress(100);
      
      console.log('VCAnalysisUpload - VC analysis completed successfully');
      
      toast({
        title: "Analysis Complete",
        description: "Your pitch deck has been successfully analyzed with VC insights.",
      });
      
      // Navigate to the company details page
      if (data.companyId) {
        console.log('VCAnalysisUpload - Navigating to company:', data.companyId);
        navigate(`/company/${data.companyId}`);
      } else {
        console.log('VCAnalysisUpload - No company ID returned, navigating to dashboard');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('VCAnalysisUpload - Error in upload/analysis process:', error);
      setIsUploading(false);
      setIsAnalyzing(false);
      setUploadProgress(0);
      setAnalysisProgress(0);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const isProcessing = isUploading || isAnalyzing;

  return (
    <div className="max-w-3xl mx-auto bg-card rounded-lg border shadow-sm p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-1">Submit Your Pitch for VC Analysis</h2>
        <p className="text-sm text-muted-foreground">Upload your pitch here to be reviewed with comprehensive investment insights.</p>
      </div>
      
      <div className="space-y-5">
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
        
        <FileUploadZone
          id="vc-pitch-deck-upload"
          label="Pitch Deck"
          file={selectedFile}
          onFileChange={(e) => {
            const file = e.target.files?.[0] || null;
            setSelectedFile(file);
            console.log('VCAnalysisUpload - File selected:', file?.name);
          }}
          accept=".pdf"
          description="PDF files only, max 10MB"
          buttonText="Select PDF"
          disabled={isProcessing}
          required={true}
        />
        
        <div className="pt-2">
          <Button
            onClick={handleSubmit}
            disabled={!selectedFile || !title.trim() || isProcessing}
            className="w-full"
          >
            {isUploading ? "Uploading..." : isAnalyzing ? "Analyzing..." : "Upload & Analyze"}
          </Button>
        </div>
      </div>

      {(isUploading || isAnalyzing) && (
        <div className="mt-6">
          <ProgressIndicator
            progressStage={isUploading ? "Uploading..." : "Analyzing..."}
            progress={isUploading ? uploadProgress : analysisProgress}
            isScrapingWebsite={false}
            isAnalyzing={isAnalyzing}
          />
        </div>
      )}
    </div>
  );
}
