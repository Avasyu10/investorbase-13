import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { FileUploadZone } from "./upload/FileUploadZone";
import { uploadReport, analyzeReport, uploadPublicReport, autoAnalyzePublicReport } from "@/lib/supabase/analysis";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";

interface ReportUploadProps {
  onSuccess?: (reportId?: string, isPublic?: boolean) => void;
  onError?: (message: string) => void;
  isPublic?: boolean;
  buttonText?: string;
  skipAnalysis?: boolean;
  companyId?: string;
  formSlug?: string | null;
  hideEmailField?: boolean;
  disableScrapingFeatures?: boolean;
  showNewFormFields?: boolean;
}

export function ReportUpload({ 
  onSuccess, 
  onError, 
  isPublic = false, 
  buttonText = "Upload",
  skipAnalysis = false,
  companyId,
  formSlug,
  hideEmailField = false,
  disableScrapingFeatures = false,
  showNewFormFields = false
}: ReportUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [email, setEmail] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // New form fields for the public upload form
  const [founderName, setFounderName] = useState("");
  const [founderEmail, setFounderEmail] = useState("");
  const [companyStage, setCompanyStage] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [totalShareholding, setTotalShareholding] = useState("");
  const [fundingStage, setFundingStage] = useState("");
  const [fundingRaised, setFundingRaised] = useState("");
  const [monthlyRevenue, setMonthlyRevenue] = useState("");
  const [teamSize, setTeamSize] = useState("");
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const validateForm = () => {
    if (!selectedFile) {
      toast({
        title: "Missing file",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return false;
    }

    if (!title.trim()) {
      toast({
        title: "Missing title",
        description: "Please enter a startup name",
        variant: "destructive",
      });
      return false;
    }

    if (!isPublic && !user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to upload a report",
        variant: "destructive",
      });
      return false;
    }

    if (isPublic && !email.trim() && !hideEmailField) {
      toast({
        title: "Missing email",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return false;
    }

    if (showNewFormFields) {
      if (!founderName.trim()) {
        toast({
          title: "Missing information",
          description: "Please enter the founder's name",
          variant: "destructive",
        });
        return false;
      }

      if (!founderEmail.trim()) {
        toast({
          title: "Missing information",
          description: "Please enter the founder's email",
          variant: "destructive",
        });
        return false;
      }

      if (!companyStage) {
        toast({
          title: "Missing information",
          description: "Please select the company stage",
          variant: "destructive",
        });
        return false;
      }

      if (!industry) {
        toast({
          title: "Missing information",
          description: "Please select the industry",
          variant: "destructive",
        });
        return false;
      }

      if (!location.trim()) {
        toast({
          title: "Missing information",
          description: "Please enter the company location",
          variant: "destructive",
        });
        return false;
      }

      if (!fundingStage) {
        toast({
          title: "Missing information",
          description: "Please select the funding stage",
          variant: "destructive",
        });
        return false;
      }

      if (!fundingRaised.trim()) {
        toast({
          title: "Missing information",
          description: "Please enter the amount of funding raised",
          variant: "destructive",
        });
        return false;
      }

      if (!monthlyRevenue.trim()) {
        toast({
          title: "Missing information",
          description: "Please enter the monthly revenue",
          variant: "destructive",
        });
        return false;
      }

      if (!teamSize) {
        toast({
          title: "Missing information",
          description: "Please enter the team size",
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setUploadProgress(10);
    
    try {
      if (isPublic) {
        let enhancedDescription = description;
        
        if (showNewFormFields) {
          enhancedDescription = `
            ${description}
            
            Founder: ${founderName}
            Founder Email: ${founderEmail}
            Company Stage: ${companyStage}
            Industry: ${industry}
            Location: ${location}
            Company Type: ${companyType || "Not specified"}
            Total Shareholding: ${totalShareholding || "Not specified"}
            Funding Stage: ${fundingStage}
            Funding Raised: ${fundingRaised}
            Monthly Revenue: ${monthlyRevenue}
            Team Size: ${teamSize}
          `;
        }
        
        console.log("Uploading public report...");
        const result = await uploadPublicReport(
          selectedFile,
          title,
          enhancedDescription,
          websiteUrl,
          email
        );
        
        setUploadProgress(80);
        console.log("Public report uploaded:", result);
        
        if (!skipAnalysis) {
          setIsAnalyzing(true);
          try {
            console.log("Analyzing public report...");
            await autoAnalyzePublicReport(result.id);
            console.log("Public report analysis triggered");
          } catch (analysisError) {
            console.error("Error analyzing public report:", analysisError);
            // Continue even if analysis fails
          } finally {
            setIsAnalyzing(false);
          }
        }
        
        setUploadProgress(100);
        
        toast({
          title: "Upload successful",
          description: "Your pitch deck has been submitted successfully",
        });
        
        if (onSuccess) {
          onSuccess(result.id, true);
        }
      } else {
        console.log("Uploading report...");
        const report = await uploadReport(selectedFile, title, description, websiteUrl);
        
        setUploadProgress(80);
        console.log("Report uploaded:", report);
        
        if (!skipAnalysis) {
          setIsAnalyzing(true);
          try {
            console.log("Analyzing report...");
            await analyzeReport(report.id);
            console.log("Report analyzed successfully");
            
            if (onSuccess) {
              onSuccess(report.id);
            } else {
              navigate(`/report/${report.id}`);
            }
            
          } catch (analysisError) {
            console.error("Error analyzing report:", analysisError);
            
            // Allow continuing even if analysis fails
            if (onSuccess) {
              onSuccess(report.id);
            } else {
              navigate(`/report/${report.id}`);
            }
          } finally {
            setIsAnalyzing(false);
          }
        } else {
          // Skip analysis, just return/navigate
          if (onSuccess) {
            onSuccess(report.id);
          } else {
            navigate(`/report/${report.id}`);
          }
        }
        
        setUploadProgress(100);
        
        toast({
          title: "Upload successful",
          description: "Your pitch deck has been uploaded successfully",
        });
      }
      
      // Reset form
      setSelectedFile(null);
      setTitle("");
      setDescription("");
      setWebsiteUrl("");
      setEmail("");
      setFounderName("");
      setFounderEmail("");
      setCompanyStage("");
      setIndustry("");
      setLocation("");
      setCompanyType("");
      setTotalShareholding("");
      setFundingStage("");
      setFundingRaised("");
      setMonthlyRevenue("");
      setTeamSize("");
      
    } catch (error: any) {
      console.error("Upload error:", error);
      
      const errorMessage = error?.message || "An unknown error occurred during upload";
      
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  
  return (
    <div className="space-y-6">
      <FileUploadZone 
        onFileSelected={handleFileSelected} 
        uploadProgress={uploadProgress}
        onRemoveFile={handleRemoveFile}
        isUploading={isSubmitting}
        selectedFile={selectedFile}
      />
      
      {selectedFile && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-base">Startup Name *</Label>
              <Input
                id="title"
                type="text"
                placeholder="Enter your startup name"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="description" className="text-base">Brief Description</Label>
              <Textarea
                id="description"
                placeholder="Briefly describe your startup"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="mt-1 min-h-24"
              />
            </div>
            
            {!hideEmailField && (
              <div>
                <Label htmlFor="email" className="text-base">Submitter Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
            )}
            
            {!disableScrapingFeatures && (
              <div>
                <Label htmlFor="website" className="text-base">Company Website</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://yourcompany.com"
                  value={websiteUrl}
                  onChange={e => setWebsiteUrl(e.target.value)}
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Adding your website helps us gather more information about your company
                </p>
              </div>
            )}

            {showNewFormFields && (
              <>
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h3 className="font-medium text-lg mb-4">Contact Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="founderName" className="text-base">Founder Name *</Label>
                      <Input
                        id="founderName"
                        type="text"
                        placeholder="Founder's full name"
                        value={founderName}
                        onChange={e => setFounderName(e.target.value)}
                        className="mt-1"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="founderEmail" className="text-base">Founder Email *</Label>
                      <Input
                        id="founderEmail"
                        type="email"
                        placeholder="founder@example.com"
                        value={founderEmail}
                        onChange={e => setFounderEmail(e.target.value)}
                        className="mt-1"
                        required
                      />
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h3 className="font-medium text-lg mb-4">Company Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="companyStage" className="text-base">Company Stage *</Label>
                      <Select
                        value={companyStage}
                        onValueChange={setCompanyStage}
                        required
                      >
                        <SelectTrigger id="companyStage" className="mt-1">
                          <SelectValue placeholder="Select stage" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="idea">Idea Stage</SelectItem>
                          <SelectItem value="mvp">MVP</SelectItem>
                          <SelectItem value="pre-seed">Pre-Seed</SelectItem>
                          <SelectItem value="seed">Seed</SelectItem>
                          <SelectItem value="series-a">Series A</SelectItem>
                          <SelectItem value="series-b">Series B+</SelectItem>
                          <SelectItem value="growth">Growth</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="industry" className="text-base">Industry *</Label>
                      <Select
                        value={industry}
                        onValueChange={setIndustry}
                        required
                      >
                        <SelectTrigger id="industry" className="mt-1">
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fintech">Fintech</SelectItem>
                          <SelectItem value="healthtech">Healthtech</SelectItem>
                          <SelectItem value="edtech">Edtech</SelectItem>
                          <SelectItem value="ecommerce">E-commerce</SelectItem>
                          <SelectItem value="saas">SaaS</SelectItem>
                          <SelectItem value="ai">AI/ML</SelectItem>
                          <SelectItem value="blockchain">Blockchain/Web3</SelectItem>
                          <SelectItem value="cleantech">Cleantech</SelectItem>
                          <SelectItem value="consumer">Consumer</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                          <SelectItem value="hardware">Hardware</SelectItem>
                          <SelectItem value="marketplace">Marketplace</SelectItem>
                          <SelectItem value="media">Media & Entertainment</SelectItem>
                          <SelectItem value="mobility">Mobility & Transportation</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="location" className="text-base">Location *</Label>
                      <Input
                        id="location"
                        type="text"
                        placeholder="City, Country"
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        className="mt-1"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="companyType" className="text-base">Company Type</Label>
                      <Select
                        value={companyType}
                        onValueChange={setCompanyType}
                      >
                        <SelectTrigger id="companyType" className="mt-1">
                          <SelectValue placeholder="Select company type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="private">Private Limited</SelectItem>
                          <SelectItem value="llc">LLC</SelectItem>
                          <SelectItem value="partnership">Partnership</SelectItem>
                          <SelectItem value="soleProprietorship">Sole Proprietorship</SelectItem>
                          <SelectItem value="notRegistered">Not Yet Registered</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Label htmlFor="totalShareholding" className="text-base">Total Shareholding of Indian Citizen(s) in the Startup</Label>
                    <Select
                      value={totalShareholding}
                      onValueChange={setTotalShareholding}
                    >
                      <SelectTrigger id="totalShareholding" className="mt-1">
                        <SelectValue placeholder="Select shareholding percentage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="100">100%</SelectItem>
                        <SelectItem value="75-99">75-99%</SelectItem>
                        <SelectItem value="50-74">50-74%</SelectItem>
                        <SelectItem value="25-49">25-49%</SelectItem>
                        <SelectItem value="0-24">0-24%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h3 className="font-medium text-lg mb-4">Investment & Traction</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fundingStage" className="text-base">Current Funding Stage *</Label>
                      <Select
                        value={fundingStage}
                        onValueChange={setFundingStage}
                        required
                      >
                        <SelectTrigger id="fundingStage" className="mt-1">
                          <SelectValue placeholder="Select funding stage" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bootstrapped">Bootstrapped</SelectItem>
                          <SelectItem value="friends-family">Friends & Family</SelectItem>
                          <SelectItem value="angel">Angel Investment</SelectItem>
                          <SelectItem value="pre-seed">Pre-Seed</SelectItem>
                          <SelectItem value="seed">Seed</SelectItem>
                          <SelectItem value="series-a">Series A</SelectItem>
                          <SelectItem value="series-b-plus">Series B+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="fundingRaised" className="text-base">Funding Raised So Far (USD) *</Label>
                      <Input
                        id="fundingRaised"
                        type="text"
                        placeholder="e.g., $100,000"
                        value={fundingRaised}
                        onChange={e => setFundingRaised(e.target.value)}
                        className="mt-1"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="monthlyRevenue" className="text-base">Monthly Revenue (USD) *</Label>
                      <Input
                        id="monthlyRevenue"
                        type="text"
                        placeholder="e.g., $10,000"
                        value={monthlyRevenue}
                        onChange={e => setMonthlyRevenue(e.target.value)}
                        className="mt-1"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="teamSize" className="text-base">Team Size *</Label>
                      <Input
                        id="teamSize"
                        type="number"
                        placeholder="Number of team members"
                        value={teamSize}
                        onChange={e => setTeamSize(e.target.value)}
                        className="mt-1"
                        required
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <Button 
            type="submit" 
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              buttonText
            )}
          </Button>
        </form>
      )}
      
      {isAnalyzing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <div className="flex flex-col items-center justify-center py-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Analyzing your pitch deck</h3>
              <p className="text-center text-muted-foreground">
                This may take a minute or two. Please don't close this window.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
