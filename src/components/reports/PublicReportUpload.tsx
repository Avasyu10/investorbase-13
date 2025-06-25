
import { useState } from "react";
import { FileUploadZone } from "./upload/FileUploadZone";
import { ProgressIndicator } from "./upload/ProgressIndicator";
import { uploadPublicReport, autoAnalyzePublicReport } from "@/lib/supabase/analysis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface PublicReportUploadProps {
  onError: (errorMessage: string) => void;
  onSuccess: () => void;
  isPublic?: boolean;
  buttonText?: string;
  skipAnalysis?: boolean;
  formSlug?: string;
  hideEmailField?: boolean;
  disableScrapingFeatures?: boolean;
}

export function PublicReportUpload({
  onError,
  onSuccess,
  buttonText = "Submit",
  skipAnalysis = false,
  formSlug = "",
  hideEmailField = false,
  disableScrapingFeatures = true
}: PublicReportUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [email, setEmail] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile || !title.trim()) {
      onError("Please select a file and enter a title");
      return;
    }

    if (!hideEmailField && !email.trim()) {
      onError("Please enter your email address");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const uploadInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Upload the report
      const result = await uploadPublicReport(selectedFile, title, description, websiteUrl, email);
      
      clearInterval(uploadInterval);
      setUploadProgress(100);
      setIsUploading(false);
      
      if (!skipAnalysis) {
        // Start analysis
        setIsAnalyzing(true);
        setAnalysisProgress(0);
        
        // Simulate analysis progress
        const analysisInterval = setInterval(() => {
          setAnalysisProgress(prev => Math.min(prev + 5, 90));
        }, 1000);

        await autoAnalyzePublicReport(result.id);
        
        clearInterval(analysisInterval);
        setAnalysisProgress(100);
      }
      
      onSuccess();
    } catch (error) {
      console.error('Error in public upload process:', error);
      onError(error instanceof Error ? error.message : 'An error occurred during upload');
      setIsUploading(false);
      setIsAnalyzing(false);
      setUploadProgress(0);
      setAnalysisProgress(0);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FileUploadZone
        id="public-pitch-deck-upload"
        label="Pitch Deck"
        file={selectedFile}
        onFileChange={(e) => {
          const file = e.target.files?.[0] || null;
          setSelectedFile(file);
        }}
        accept=".pdf"
        description="PDF files only, max 10MB"
        buttonText="Select PDF"
        disabled={isUploading || isAnalyzing}
        required={true}
      />

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">
            Company Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter your company name"
            disabled={isUploading || isAnalyzing}
            required
          />
        </div>

        {!hideEmailField && (
          <div className="space-y-2">
            <Label htmlFor="email">
              Email Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@company.com"
              disabled={isUploading || isAnalyzing}
              required
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="description">Brief Company Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[100px] resize-y"
            placeholder="Tell us about your company, what problem you're solving, and your target market..."
            disabled={isUploading || isAnalyzing}
          />
        </div>

        {!disableScrapingFeatures && (
          <div className="space-y-2">
            <Label htmlFor="websiteUrl">Company Website (Optional)</Label>
            <Input
              id="websiteUrl"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://yourcompany.com"
              disabled={isUploading || isAnalyzing}
            />
          </div>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isUploading || isAnalyzing || !selectedFile || !title.trim() || (!hideEmailField && !email.trim())}
      >
        {isUploading ? "Uploading..." : isAnalyzing ? "Analyzing..." : buttonText}
      </Button>

      {(isUploading || isAnalyzing) && (
        <ProgressIndicator
          progressStage={isUploading ? "Uploading..." : "Analyzing..."}
          progress={isUploading ? uploadProgress : analysisProgress}
          isScrapingWebsite={false}
          isAnalyzing={isAnalyzing}
        />
      )}
    </form>
  );
}
