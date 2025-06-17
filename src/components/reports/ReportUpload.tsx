import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileUp, Upload, AlertCircle, Loader2, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CompanyInfoForm } from "./upload/CompanyInfoForm";

interface ReportUploadProps {
  onError?: (error: string) => void;
  onSuccess?: () => void;
  isPublic?: boolean;
  buttonText?: string;
  skipAnalysis?: boolean;
  formSlug?: string;
  hideEmailField?: boolean;
  disableScrapingFeatures?: boolean;
}

interface CompanyInfo {
  founderName: string;
  founderEmail: string;
  founderContact: string;
  companyName: string;
  companyType: string;
  companyStage: string;
  companyRegistrationType: string;
  registrationNumber: string;
  dpiitRecognitionNumber: string;
  indianCitizenShareholding: string;
  founderState: string;
  founderAddress: string;
  founderGender: string;
  executiveSummary: string;
  websiteUrl: string;
  productsServices: string;
  lastFyRevenue: string;
  lastQuarterRevenue: string;
  fundsRaised: string;
  valuation: string;
  employeeCount: number;
  question: string;
  industry: string;
  companyLinkedin: string;
  founderLinkedinProfiles: string[];
  supplementaryMaterialsUrls: string[];
}

export const ReportUpload = ({ 
  onError, 
  onSuccess, 
  isPublic = false, 
  buttonText = "Upload & Analyze",
  skipAnalysis = false,
  formSlug,
  hideEmailField = false,
  disableScrapingFeatures = false
}: ReportUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    founderName: "",
    founderEmail: "",
    founderContact: "",
    companyName: "",
    companyType: "",
    companyStage: "",
    companyRegistrationType: "",
    registrationNumber: "",
    dpiitRecognitionNumber: "",
    indianCitizenShareholding: "",
    founderState: "",
    founderAddress: "",
    founderGender: "",
    executiveSummary: "",
    websiteUrl: "",
    productsServices: "",
    lastFyRevenue: "",
    lastQuarterRevenue: "",
    fundsRaised: "",
    valuation: "",
    employeeCount: 0,
    question: "",
    industry: "",
    companyLinkedin: "",
    founderLinkedinProfiles: [""],
    supplementaryMaterialsUrls: [""]
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFile = acceptedFiles.find(file => file.type === 'application/pdf');
    if (pdfFile) {
      setFile(pdfFile);
    } else {
      toast.error("Please upload a PDF file");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast.error("Please select a PDF file to upload");
      return;
    }

    if (!companyInfo.companyName.trim()) {
      toast.error("Please enter a company name");
      return;
    }

    if (isPublic && !companyInfo.founderEmail.trim()) {
      toast.error("Please enter founder email");
      return;
    }

    // Validate LinkedIn URLs if provided
    if (companyInfo.companyLinkedin && !isValidLinkedInUrl(companyInfo.companyLinkedin)) {
      toast.error("Please enter a valid company LinkedIn URL");
      return;
    }

    const invalidFounderLinkedInUrls = companyInfo.founderLinkedinProfiles.filter(url => {
      if (!url.trim()) return false;
      return !isValidLinkedInUrl(url);
    });

    if (invalidFounderLinkedInUrls.length > 0) {
      toast.error("Please enter valid founder LinkedIn URLs");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Upload file logic
      const fileName = `${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('reports')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      setUploadProgress(50);

      const { data: { publicUrl } } = supabase.storage
        .from('reports')
        .getPublicUrl(fileName);

      // Create report entry
      const reportData = {
        title: companyInfo.companyName || file.name,
        description: companyInfo.executiveSummary || "Uploaded via form",
        pdf_url: publicUrl,
        analysis_status: skipAnalysis ? 'completed' : 'pending',
        is_public_submission: isPublic,
        submitter_email: isPublic ? companyInfo.founderEmail : null
      };

      const { data: report, error: reportError } = await supabase
        .from('reports')
        .insert(reportData)
        .select()
        .single();

      if (reportError) throw reportError;

      setUploadProgress(75);

      // Save to public_form_submissions if this is a public submission
      if (isPublic) {
        const submissionData = {
          report_id: report.id,
          form_slug: formSlug || 'default',
          title: companyInfo.companyName,
          description: companyInfo.executiveSummary,
          founder_name: companyInfo.founderName,
          founder_email: companyInfo.founderEmail,
          founder_contact: companyInfo.founderContact,
          founder_gender: companyInfo.founderGender,
          founder_state: companyInfo.founderState,
          founder_address: companyInfo.founderAddress,
          company_type: companyInfo.companyType,
          company_stage: companyInfo.companyStage,
          company_registration_type: companyInfo.companyRegistrationType,
          registration_number: companyInfo.registrationNumber,
          dpiit_recognition_number: companyInfo.dpiitRecognitionNumber,
          indian_citizen_shareholding: companyInfo.indianCitizenShareholding,
          website_url: companyInfo.websiteUrl,
          products_services: companyInfo.productsServices,
          last_fy_revenue: companyInfo.lastFyRevenue,
          last_quarter_revenue: companyInfo.lastQuarterRevenue,
          funds_raised: companyInfo.fundsRaised,
          valuation: companyInfo.valuation,
          employee_count: companyInfo.employeeCount,
          question: companyInfo.question,
          industry: companyInfo.industry,
          company_linkedin: companyInfo.companyLinkedin,
          founder_linkedin_profiles: companyInfo.founderLinkedinProfiles.filter(url => url.trim()),
          supplementary_materials_urls: companyInfo.supplementaryMaterialsUrls.filter(url => url.trim()),
          pdf_url: publicUrl,
          submitter_email: companyInfo.founderEmail
        };

        const { error: submissionError } = await supabase
          .from('public_form_submissions')
          .insert(submissionData);

        if (submissionError) {
          console.error("Error saving public submission:", submissionError);
        }
      }

      setUploadProgress(90);

      // Trigger analysis if not skipped
      if (!skipAnalysis) {
        const functionName = isPublic ? 'analyze-public-pdf' : 'analyze-pdf';
        const { error: analysisError } = await supabase.functions.invoke(functionName, {
          body: { reportId: report.id }
        });

        if (analysisError) {
          console.error("Analysis error:", analysisError);
          toast.error("Upload successful, but analysis failed to start");
        }
      }

      setUploadProgress(100);
      toast.success("Upload successful!");
      
      // Reset form
      setFile(null);
      setCompanyInfo({
        founderName: "",
        founderEmail: "",
        founderContact: "",
        companyName: "",
        companyType: "",
        companyStage: "",
        companyRegistrationType: "",
        registrationNumber: "",
        dpiitRecognitionNumber: "",
        indianCitizenShareholding: "",
        founderState: "",
        founderAddress: "",
        founderGender: "",
        executiveSummary: "",
        websiteUrl: "",
        productsServices: "",
        lastFyRevenue: "",
        lastQuarterRevenue: "",
        fundsRaised: "",
        valuation: "",
        employeeCount: 0,
        question: "",
        industry: "",
        companyLinkedin: "",
        founderLinkedinProfiles: [""],
        supplementaryMaterialsUrls: [""]
      });
      
      onSuccess?.();
    } catch (error: any) {
      console.error("Upload error:", error);
      const errorMessage = error.message || "An unexpected error occurred";
      toast.error(errorMessage);
      onError?.(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const addLinkedInProfile = () => {
    setCompanyInfo(prev => ({
      ...prev,
      founderLinkedinProfiles: [...prev.founderLinkedinProfiles, ""]
    }));
  };

  const removeLinkedInProfile = (index: number) => {
    setCompanyInfo(prev => ({
      ...prev,
      founderLinkedinProfiles: prev.founderLinkedinProfiles.filter((_, i) => i !== index)
    }));
  };

  const updateLinkedInProfile = (index: number, value: string) => {
    setCompanyInfo(prev => ({
      ...prev,
      founderLinkedinProfiles: prev.founderLinkedinProfiles.map((profile, i) => 
        i === index ? value : profile
      )
    }));
  };

  const addSupplementaryUrl = () => {
    setCompanyInfo(prev => ({
      ...prev,
      supplementaryMaterialsUrls: [...prev.supplementaryMaterialsUrls, ""]
    }));
  };

  const removeSupplementaryUrl = (index: number) => {
    setCompanyInfo(prev => ({
      ...prev,
      supplementaryMaterialsUrls: prev.supplementaryMaterialsUrls.filter((_, i) => i !== index)
    }));
  };

  const updateSupplementaryUrl = (index: number, value: string) => {
    setCompanyInfo(prev => ({
      ...prev,
      supplementaryMaterialsUrls: prev.supplementaryMaterialsUrls.map((url, i) => 
        i === index ? value : url
      )
    }));
  };

  const isValidLinkedInUrl = (url: string) => {
    return url.includes('linkedin.com/');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            Upload Pitch Deck
          </CardTitle>
          <CardDescription>
            Upload your pitch deck PDF and provide company information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload Section */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              {file ? (
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium">Drop your PDF here, or click to select</p>
                  <p className="text-sm text-gray-500">PDF files only, max 10MB</p>
                </div>
              )}
            </div>

            {uploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-center text-gray-600">
                  {uploadProgress < 50 ? 'Uploading file...' : 
                   uploadProgress < 75 ? 'Creating report...' : 
                   uploadProgress < 90 ? 'Processing...' : 'Finalizing...'}
                </p>
              </div>
            )}

            {/* Company Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Company Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={companyInfo.companyName}
                    onChange={(e) => setCompanyInfo(prev => ({ ...prev, companyName: e.target.value }))}
                    placeholder="Enter company name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="companyLinkedin">Company LinkedIn URL</Label>
                  <Input
                    id="companyLinkedin"
                    value={companyInfo.companyLinkedin}
                    onChange={(e) => setCompanyInfo(prev => ({ ...prev, companyLinkedin: e.target.value }))}
                    placeholder="https://linkedin.com/company/your-company"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Optional: Company LinkedIn profile for additional insights
                  </p>
                </div>

                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Select 
                    value={companyInfo.industry} 
                    onValueChange={(value) => setCompanyInfo(prev => ({ ...prev, industry: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="fintech">Fintech</SelectItem>
                      <SelectItem value="ecommerce">E-commerce</SelectItem>
                      <SelectItem value="saas">SaaS</SelectItem>
                      <SelectItem value="biotech">Biotech</SelectItem>
                      <SelectItem value="cleantech">Cleantech</SelectItem>
                      <SelectItem value="edtech">EdTech</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="companyStage">Company Stage</Label>
                  <Select 
                    value={companyInfo.companyStage} 
                    onValueChange={(value) => setCompanyInfo(prev => ({ ...prev, companyStage: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="idea">Idea</SelectItem>
                      <SelectItem value="prototype">Prototype</SelectItem>
                      <SelectItem value="mvp">MVP</SelectItem>
                      <SelectItem value="early-revenue">Early Revenue</SelectItem>
                      <SelectItem value="growth">Growth</SelectItem>
                      <SelectItem value="scale">Scale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="executiveSummary">Executive Summary</Label>
                <Textarea
                  id="executiveSummary"
                  value={companyInfo.executiveSummary}
                  onChange={(e) => setCompanyInfo(prev => ({ ...prev, executiveSummary: e.target.value }))}
                  placeholder="Brief description of your company and business model"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="websiteUrl">Website URL</Label>
                <Input
                  id="websiteUrl"
                  value={companyInfo.websiteUrl}
                  onChange={(e) => setCompanyInfo(prev => ({ ...prev, websiteUrl: e.target.value }))}
                  placeholder="https://www.yourcompany.com"
                />
              </div>
            </div>

            {/* Founder Information Section */}
            {isPublic && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Founder Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="founderName">Founder Name *</Label>
                    <Input
                      id="founderName"
                      value={companyInfo.founderName}
                      onChange={(e) => setCompanyInfo(prev => ({ ...prev, founderName: e.target.value }))}
                      placeholder="Enter founder name"
                      required={isPublic}
                    />
                  </div>

                  {!hideEmailField && (
                    <div>
                      <Label htmlFor="founderEmail">Founder Email *</Label>
                      <Input
                        id="founderEmail"
                        type="email"
                        value={companyInfo.founderEmail}
                        onChange={(e) => setCompanyInfo(prev => ({ ...prev, founderEmail: e.target.value }))}
                        placeholder="founder@company.com"
                        required={isPublic && !hideEmailField}
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="founderContact">Contact Number</Label>
                    <Input
                      id="founderContact"
                      value={companyInfo.founderContact}
                      onChange={(e) => setCompanyInfo(prev => ({ ...prev, founderContact: e.target.value }))}
                      placeholder="+91 9876543210"
                    />
                  </div>
                </div>

                {/* Founder LinkedIn Profiles */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Founder LinkedIn Profiles</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addLinkedInProfile}
                      disabled={uploading}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Profile
                    </Button>
                  </div>
                  
                  {companyInfo.founderLinkedinProfiles.map((url, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="https://linkedin.com/in/founder"
                        value={url}
                        onChange={(e) => updateLinkedInProfile(index, e.target.value)}
                        disabled={uploading}
                        className="flex-1"
                      />
                      {companyInfo.founderLinkedinProfiles.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeLinkedInProfile(index)}
                          disabled={uploading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button type="submit" disabled={uploading || !file} className="w-full">
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {skipAnalysis ? 'Uploading...' : 'Uploading & Analyzing...'}
                </>
              ) : (
                buttonText
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
