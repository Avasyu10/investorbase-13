
import { useState } from "react";
import { FileUploadZone } from "./upload/FileUploadZone";
import { CompanyInfoForm } from "./upload/CompanyInfoForm";
import { ProgressIndicator } from "./upload/ProgressIndicator";
import { uploadReport } from "@/lib/supabase/analysis";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

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

  // Company form states
  const [companyStage, setCompanyStage] = useState("");
  const [industry, setIndustry] = useState("");
  const [founderLinkedIns, setFounderLinkedIns] = useState<string[]>([""]);
  const [companyRegistrationType, setCompanyRegistrationType] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [dpiitRecognitionNumber, setDpiitRecognitionNumber] = useState("");
  const [indianCitizenShareholding, setIndianCitizenShareholding] = useState("");
  const [executiveSummary, setExecutiveSummary] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [productsServices, setProductsServices] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const [fundsRaised, setFundsRaised] = useState("");
  const [valuation, setValuation] = useState("");
  const [lastFyRevenue, setLastFyRevenue] = useState("");
  const [lastQuarterRevenue, setLastQuarterRevenue] = useState("");
  const [founderName, setFounderName] = useState("");
  const [founderGender, setFounderGender] = useState("");
  const [founderEmail, setFounderEmail] = useState("");
  const [founderContact, setFounderContact] = useState("");
  const [founderAddress, setFounderAddress] = useState("");
  const [founderState, setFounderState] = useState("");
  const [companyLinkedInUrl, setCompanyLinkedInUrl] = useState("");

  const updateLinkedInProfile = (index: number, value: string) => {
    const updated = [...founderLinkedIns];
    updated[index] = value;
    setFounderLinkedIns(updated);
  };

  const addLinkedInProfile = () => {
    setFounderLinkedIns([...founderLinkedIns, ""]);
  };

  const removeLinkedInProfile = (index: number) => {
    setFounderLinkedIns(founderLinkedIns.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedFile || !title.trim()) return;

    console.log('ReportUpload - Starting regular analysis process');
    
    // Always upload first, then analyze
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

      console.log('ReportUpload - GUARANTEED: Calling analyze-pdf for regular user, report:', report.id);
      
      // DIRECT CALL to regular edge function - NO CONDITIONS
      const { data, error } = await supabase.functions.invoke('analyze-pdf', {
        body: { reportId: report.id }
      });
      
      if (error) {
        console.error('Error calling analyze-pdf:', error);
        throw error;
      }
      
      if (!data || data.error) {
        const errorMessage = data?.error || "Unknown error occurred during analysis";
        console.error('Regular analysis returned error:', errorMessage);
        throw new Error(errorMessage);
      }
      
      clearInterval(analysisInterval);
      setAnalysisProgress(100);
      
      console.log('ReportUpload - Regular analysis completed successfully');
      
      // Show success message and redirect to dashboard
      toast.success("Analysis Complete!", {
        description: "Your pitch deck has been analyzed successfully. You can view the results in your dashboard.",
      });
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Error in upload/analysis process:', error);
      setIsUploading(false);
      setIsAnalyzing(false);
      setUploadProgress(0);
      setAnalysisProgress(0);
      
      toast.error("Analysis Failed", {
        description: error instanceof Error ? error.message : "An error occurred during analysis",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Upload Pitch Deck
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Upload your pitch deck for AI-powered analysis and insights.
        </p>
      </div>

      <FileUploadZone
        id="pitch-deck-upload"
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

      <CompanyInfoForm
        title={title}
        setTitle={setTitle}
        briefIntroduction={description}
        setBriefIntroduction={setDescription}
        companyWebsite={websiteUrl}
        setCompanyWebsite={setWebsiteUrl}
        companyStage={companyStage}
        setCompanyStage={setCompanyStage}
        industry={industry}
        setIndustry={setIndustry}
        founderLinkedIns={founderLinkedIns}
        setFounderLinkedIns={setFounderLinkedIns}
        updateLinkedInProfile={updateLinkedInProfile}
        addLinkedInProfile={addLinkedInProfile}
        removeLinkedInProfile={removeLinkedInProfile}
        isDisabled={isUploading || isAnalyzing}
        companyRegistrationType={companyRegistrationType}
        setCompanyRegistrationType={setCompanyRegistrationType}
        registrationNumber={registrationNumber}
        setRegistrationNumber={setRegistrationNumber}
        dpiitRecognitionNumber={dpiitRecognitionNumber}
        setDpiitRecognitionNumber={setDpiitRecognitionNumber}
        indianCitizenShareholding={indianCitizenShareholding}
        setIndianCitizenShareholding={setIndianCitizenShareholding}
        executiveSummary={executiveSummary}
        setExecutiveSummary={setExecutiveSummary}
        companyType={companyType}
        setCompanyType={setCompanyType}
        productsServices={productsServices}
        setProductsServices={setProductsServices}
        employeeCount={employeeCount}
        setEmployeeCount={setEmployeeCount}
        fundsRaised={fundsRaised}
        setFundsRaised={setFundsRaised}
        valuation={valuation}
        setValuation={setValuation}
        lastFyRevenue={lastFyRevenue}
        setLastFyRevenue={setLastFyRevenue}
        lastQuarterRevenue={lastQuarterRevenue}
        setLastQuarterRevenue={setLastQuarterRevenue}
        founderName={founderName}
        setFounderName={setFounderName}
        founderGender={founderGender}
        setFounderGender={setFounderGender}
        founderEmail={founderEmail}
        setFounderEmail={setFounderEmail}
        founderContact={founderContact}
        setFounderContact={setFounderContact}
        founderAddress={founderAddress}
        setFounderAddress={setFounderAddress}
        founderState={founderState}
        setFounderState={setFounderState}
        companyLinkedInUrl={companyLinkedInUrl}
        setCompanyLinkedInUrl={setCompanyLinkedInUrl}
      />

      <div className="flex justify-center">
        <button
          onClick={handleSubmit}
          disabled={!selectedFile || !title.trim() || isUploading || isAnalyzing}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isUploading ? "Uploading..." : isAnalyzing ? "Analyzing..." : "Upload & Analyze"}
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
