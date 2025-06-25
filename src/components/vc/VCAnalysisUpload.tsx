
import { useState } from "react";
import { FileUploadZone } from "@/components/reports/upload/FileUploadZone";
import { ProgressIndicator } from "@/components/reports/upload/ProgressIndicator";
import { uploadReport } from "@/lib/supabase/analysis";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export function VCAnalysisUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!selectedFile || !title.trim()) return;

    console.log('VCAnalysisUpload - Starting VC analysis process');
    
    // Always upload first, then analyze
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const uploadInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Upload the report
      const report = await uploadReport(selectedFile, title, description);
      
      clearInterval(uploadInterval);
      setUploadProgress(100);
      setIsUploading(false);
      
      // Start analysis
      setIsAnalyzing(true);
      setAnalysisProgress(0);
      
      // Simulate analysis progress
      const analysisInterval = setInterval(() => {
        setAnalysisProgress(prev => Math.min(prev + 5, 90));
      }, 1000);

      console.log('VCAnalysisUpload - GUARANTEED: Calling analyze-pdf-vc for report:', report.id);
      
      // DIRECT CALL to VC edge function - NO CONDITIONS, NO CHECKS
      const { data, error } = await supabase.functions.invoke('analyze-pdf-vc', {
        body: { reportId: report.id }
      });
      
      if (error) {
        console.error('Error calling analyze-pdf-vc:', error);
        throw error;
      }
      
      if (!data || data.error) {
        const errorMessage = data?.error || "Unknown error occurred during VC analysis";
        console.error('VC analysis returned error:', errorMessage);
        throw new Error(errorMessage);
      }
      
      clearInterval(analysisInterval);
      setAnalysisProgress(100);
      
      console.log('VCAnalysisUpload - VC analysis completed successfully');
      
      toast({
        id: "vc-analysis-success",
        title: "VC Analysis Complete",
        description: "Your pitch deck has been successfully analyzed with VC insights.",
      });
      
      // Navigate to the company details page
      if (data.companyId) {
        navigate(`/company/${data.companyId}`);
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error in VC upload/analysis process:', error);
      setIsUploading(false);
      setIsAnalyzing(false);
      setUploadProgress(0);
      setAnalysisProgress(0);
      
      toast({
        id: "vc-analysis-error",
        title: "VC Analysis Failed",
        description: "There was a problem analyzing the deck. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Analyze Pitch Deck
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Upload a pitch deck for comprehensive investment analysis with detailed metrics and insights.
        </p>
      </div>

      <FileUploadZone
        id="vc-pitch-deck-upload"
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
          <label htmlFor="vc-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Company Name <span className="text-red-500">*</span>
          </label>
          <input
            id="vc-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Enter company name"
            disabled={isUploading || isAnalyzing}
            required
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="vc-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Brief Description (Optional)
          </label>
          <textarea
            id="vc-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Brief description of the company"
            rows={3}
            disabled={isUploading || isAnalyzing}
          />
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleSubmit}
          disabled={!selectedFile || !title.trim() || isUploading || isAnalyzing}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isUploading ? "Uploading..." : isAnalyzing ? "Analyzing..." : "Analyze Deck"}
        </button>
      </div>

      {(isUploading || isAnalyzing) && (
        <ProgressIndicator
          progressStage={isUploading ? "Uploading..." : "Analyzing..."}
          progress={isUploading ? uploadProgress : analysisProgress}
          isScrapingWebsite={false}
          isAnalyzing={isAnalyzing}
        />
      )}
    </div>
  );
}
