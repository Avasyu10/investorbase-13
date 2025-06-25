
import { useState, useEffect } from "react";
import { FileUploadZone } from "./upload/FileUploadZone";
import { CompanyInfoForm } from "./upload/CompanyInfoForm";
import { ProgressIndicator } from "./upload/ProgressIndicator";
import { VCReportUpload } from "./VCReportUpload";
import { uploadReport, analyzeReport } from "@/lib/supabase/analysis";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";

export function ReportUpload() {
  const { isVC, isLoading: profileLoading } = useProfile();
  const [isVCConfirmed, setIsVCConfirmed] = useState<boolean | null>(null);
  
  // Double-check VC status from database
  useEffect(() => {
    const checkVCStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userProfile } = await supabase
          .from('profiles')
          .select('is_vc')
          .eq('id', user.id)
          .single();
        
        const vcStatus = userProfile?.is_vc || false;
        setIsVCConfirmed(vcStatus);
        console.log('ReportUpload: Confirmed VC status from database:', vcStatus);
      } catch (error) {
        console.error('Error checking VC status:', error);
        setIsVCConfirmed(false);
      }
    };

    if (!profileLoading) {
      checkVCStatus();
    }
  }, [profileLoading]);

  // Show loading while we determine user type
  if (profileLoading || isVCConfirmed === null) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Render VC-specific upload for VC users
  if (isVCConfirmed) {
    console.log('ReportUpload: Rendering VC-specific upload component');
    return <VCReportUpload />;
  }

  // Regular upload component for non-VC users
  return <RegularReportUpload />;
}

// Regular upload component (existing functionality)
function RegularReportUpload() {
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

    console.log('RegularReportUpload: Starting regular upload and analysis');
    
    // Regular upload and analysis flow (existing code)
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

      console.log('RegularReportUpload: Starting regular analysis for report:', report.id);
      
      // Use regular analysis (not VC)
      const analysisResult = await analyzeReport(report.id, false);
      
      clearInterval(analysisInterval);
      setAnalysisProgress(100);
      
      // Navigate to the company details page
      if (analysisResult.companyId) {
        navigate(`/company/${analysisResult.companyId}`);
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error in regular upload/analysis process:', error);
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
