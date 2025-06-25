
import { useState } from "react";
import { FileUploadZone } from "./upload/FileUploadZone";
import { CompanyInfoForm } from "./upload/CompanyInfoForm";
import { ProgressIndicator } from "./upload/ProgressIndicator";
import { uploadReport, analyzeReport, analyzeReportDirect } from "@/lib/supabase/analysis";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";

export function ReportUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const navigate = useNavigate();
  const { isVC } = useProfile();

  const handleSubmit = async () => {
    if (!selectedFile || !title.trim()) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const uploadInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Upload the report
      const report = await uploadReport(selectedFile, title, description, websiteUrl);
      
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

      // Use VC analysis if user is a VC
      const analysisResult = await analyzeReport(report.id, isVC);
      
      clearInterval(analysisInterval);
      setAnalysisProgress(100);
      
      // Navigate to the company details page
      if (analysisResult.companyId) {
        navigate(`/company/${analysisResult.companyId}`);
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error in upload/analysis process:', error);
      setIsUploading(false);
      setIsAnalyzing(false);
      setUploadProgress(0);
      setAnalysisProgress(0);
    }
  };

  const handleDirectAnalysis = async () => {
    if (!selectedFile || !title.trim()) return;

    setIsAnalyzing(true);
    setAnalysisProgress(0);

    try {
      // Simulate analysis progress
      const analysisInterval = setInterval(() => {
        setAnalysisProgress(prev => Math.min(prev + 5, 90));
      }, 1000);

      // Use VC analysis if user is a VC
      const analysisResult = await analyzeReportDirect(selectedFile, title, description, isVC);
      
      clearInterval(analysisInterval);
      setAnalysisProgress(100);
      
      // Navigate to the company details page
      if (analysisResult.companyId) {
        navigate(`/company/${analysisResult.companyId}`);
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error in direct analysis:', error);
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {isVC ? "Analyze Pitch Deck" : "Upload Pitch Deck"}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {isVC 
            ? "Upload a pitch deck for comprehensive investment analysis with detailed metrics and insights."
            : "Upload your pitch deck for AI-powered analysis and insights."
          }
        </p>
      </div>

      <FileUploadZone
        selectedFile={selectedFile}
        onFileSelect={setSelectedFile}
        isUploading={isUploading}
        isAnalyzing={isAnalyzing}
      />

      <CompanyInfoForm
        title={title}
        description={description}
        websiteUrl={websiteUrl}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        onWebsiteUrlChange={setWebsiteUrl}
        onSubmit={handleSubmit}
        onDirectAnalysis={handleDirectAnalysis}
        selectedFile={selectedFile}
        isUploading={isUploading}
        isAnalyzing={isAnalyzing}
        isVC={isVC}
      />

      {(isUploading || isAnalyzing) && (
        <ProgressIndicator
          isUploading={isUploading}
          isAnalyzing={isAnalyzing}
          uploadProgress={uploadProgress}
          analysisProgress={analysisProgress}
          isVC={isVC}
        />
      )}
    </div>
  );
}
