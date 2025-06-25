
import { useState } from "react";
import { FileUploadZone } from "./upload/FileUploadZone";
import { ProgressIndicator } from "./upload/ProgressIndicator";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function VCReportUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!selectedFile || !title.trim()) {
      toast.error("Please provide both a company name and pitch deck file");
      return;
    }

    console.log('VCReportUpload: Starting VC-specific upload and analysis');
    
    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Simulate upload progress
      const uploadInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 300);

      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('report_pdfs')
        .upload(filePath, selectedFile);

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        throw uploadError;
      }

      // Create report record
      const { data: report, error: insertError } = await supabase
        .from('reports')
        .insert([{
          title,
          description,
          pdf_url: fileName,
          user_id: user.id
        }])
        .select()
        .single();

      if (insertError) {
        console.error('Error creating report record:', insertError);
        throw insertError;
      }

      clearInterval(uploadInterval);
      setUploadProgress(100);
      setIsUploading(false);

      console.log('VCReportUpload: Upload complete, starting VC analysis for report:', report.id);

      // Start analysis with VC-specific function
      setIsAnalyzing(true);
      setAnalysisProgress(0);

      const analysisInterval = setInterval(() => {
        setAnalysisProgress(prev => Math.min(prev + 5, 90));
      }, 1000);

      // CRITICAL: Directly call the analyze-pdf-vc function
      console.log('VCReportUpload: Calling analyze-pdf-vc function directly');
      
      const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('analyze-pdf-vc', {
        body: { reportId: report.id }
      });

      clearInterval(analysisInterval);
      setAnalysisProgress(100);

      if (analysisError) {
        console.error('VC Analysis failed:', analysisError);
        throw analysisError;
      }

      if (!analysisResult || analysisResult.error) {
        const errorMessage = analysisResult?.error || "Analysis failed";
        console.error('VC Analysis returned error:', errorMessage);
        throw new Error(errorMessage);
      }

      console.log('VCReportUpload: VC Analysis completed successfully:', analysisResult);

      toast.success("VC Analysis complete", {
        description: "Your pitch deck has been analyzed with comprehensive VC insights"
      });

      // Navigate to company details
      if (analysisResult.companyId) {
        navigate(`/company/${analysisResult.companyId}`);
      } else {
        navigate('/dashboard');
      }

    } catch (error) {
      console.error('Error in VC upload/analysis process:', error);
      
      toast.error("VC Analysis failed", {
        description: error instanceof Error ? error.message : "Failed to analyze pitch deck"
      });
      
      setIsUploading(false);
      setIsAnalyzing(false);
      setUploadProgress(0);
      setAnalysisProgress(0);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          VC Investment Analysis
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Upload a pitch deck for comprehensive investment analysis with detailed metrics, market insights, and investment recommendations.
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
          className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
        >
          {isUploading ? "Uploading..." : isAnalyzing ? "Analyzing with VC Insights..." : "Analyze with VC Insights"}
        </button>
      </div>

      {(isUploading || isAnalyzing) && (
        <ProgressIndicator
          progressStage={isUploading ? "Uploading..." : "Analyzing with VC insights..."}
          progress={isUploading ? uploadProgress : analysisProgress}
          isScrapingWebsite={false}
          isAnalyzing={isAnalyzing}
        />
      )}
    </div>
  );
}
