
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

    console.log('ReportUpload handleSubmit - isVC:', isVC);
    
    if (isVC) {
      // For VC users, use direct analysis which will call analyze-pdf-vc
      setIsAnalyzing(true);
      setAnalysisProgress(0);
      
      try {
        // Simulate analysis progress
        const analysisInterval = setInterval(() => {
          setAnalysisProgress(prev => Math.min(prev + 5, 90));
        }, 1000);

        console.log('Starting VC direct analysis');
        
        const analysisResult = await analyzeReportDirect(selectedFile, title, description, true);
        
        clearInterval(analysisInterval);
        setAnalysisProgress(100);
        
        // Navigate to the company details page
        if (analysisResult.companyId) {
          navigate(`/company/${analysisResult.companyId}`);
        } else {
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error in VC direct analysis:', error);
        setIsAnalyzing(false);
        setAnalysisProgress(0);
      }
    } else {
      // For regular users, use the traditional upload then analyze flow
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

        console.log('Starting regular analysis for report:', report.id);
        
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
        console.error('Error in upload/analysis process:', error);
        setIsUploading(false);
        setIsAnalyzing(false);
        setUploadProgress(0);
        setAnalysisProgress(0);
      }
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

      console.log(`Starting direct ${isVC ? 'VC' : 'regular'} analysis`);
      
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

      {!isVC && (
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
      )}

      {isVC && (
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
      )}

      <div className="flex justify-center">
        <button
          onClick={handleSubmit}
          disabled={!selectedFile || !title.trim() || isUploading || isAnalyzing}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isUploading ? "Uploading..." : isAnalyzing ? "Analyzing..." : isVC ? "Analyze Deck" : "Upload & Analyze"}
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
