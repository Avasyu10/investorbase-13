
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Company stage options
const COMPANY_STAGES = [
  "Pre-seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C+",
  "Growth",
  "Pre-IPO",
  "Public",
  "Other"
];

// Industry options
const INDUSTRIES = [
  "SaaS",
  "FinTech",
  "HealthTech",
  "EdTech",
  "E-commerce",
  "AI/ML",
  "Blockchain",
  "CleanTech",
  "Consumer",
  "Enterprise",
  "Gaming",
  "Hardware",
  "Marketplace",
  "Media",
  "Mobile",
  "Real Estate",
  "Transportation",
  "Other"
];

// Company registration types
const REGISTRATION_TYPES = [
  "Unregistered",
  "Sole Proprietorship",
  "Limited Liability Partnership",
  "Private Limited Company",
  "Partnership"
];

// Company types
const COMPANY_TYPES = [
  "Product Based",
  "Service Based",
  "Product & Service Based"
];

// Indian states
const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry"
];

interface CompanyInfoFormProps {
  title: string;
  setTitle: (value: string) => void;
  briefIntroduction: string;
  setBriefIntroduction: (value: string) => void;
  companyWebsite: string;
  setCompanyWebsite: (value: string) => void;
  companyStage: string;
  setCompanyStage: (value: string) => void;
  industry: string;
  setIndustry: (value: string) => void;
  founderLinkedIns: string[];
  setFounderLinkedIns: (value: string[]) => void;
  updateLinkedInProfile?: (index: number, value: string) => void;
  addLinkedInProfile?: () => void;
  removeLinkedInProfile?: (index: number) => void;
  isDisabled: boolean;
  
  // New props for additional company fields
  companyRegistrationType: string;
  setCompanyRegistrationType: (value: string) => void;
  registrationNumber: string;
  setRegistrationNumber: (value: string) => void;
  dpiitRecognitionNumber: string;
  setDpiitRecognitionNumber: (value: string) => void;
  indianCitizenShareholding: string;
  setIndianCitizenShareholding: (value: string) => void;
  executiveSummary: string;
  setExecutiveSummary: (value: string) => void;
  companyType: string;
  setCompanyType: (value: string) => void;
  productsServices: string;
  setProductsServices: (value: string) => void;
  employeeCount: string;
  setEmployeeCount: (value: string) => void;
  fundsRaised: string;
  setFundsRaised: (value: string) => void;
  valuation: string;
  setValuation: (value: string) => void;
  lastFyRevenue: string;
  setLastFyRevenue: (value: string) => void;
  lastQuarterRevenue: string;
  setLastQuarterRevenue: (value: string) => void;
  
  // Founder information
  founderName: string;
  setFounderName: (value: string) => void;
  founderGender: string;
  setFounderGender: (value: string) => void;
  founderEmail: string;
  setFounderEmail: (value: string) => void;
  founderContact: string;
  setFounderContact: (value: string) => void;
  founderAddress: string;
  setFounderAddress: (value: string) => void;
  founderState: string;
  setFounderState: (value: string) => void;
}

export function CompanyInfoForm({
  title,
  setTitle,
  briefIntroduction,
  setBriefIntroduction,
  companyWebsite,
  setCompanyWebsite,
  companyStage,
  setCompanyStage,
  industry,
  setIndustry,
  founderLinkedIns,
  setFounderLinkedIns,
  updateLinkedInProfile,
  addLinkedInProfile,
  removeLinkedInProfile,
  isDisabled,
  
  // Additional company fields
  companyRegistrationType,
  setCompanyRegistrationType,
  registrationNumber,
  setRegistrationNumber,
  dpiitRecognitionNumber,
  setDpiitRecognitionNumber,
  indianCitizenShareholding,
  setIndianCitizenShareholding,
  executiveSummary,
  setExecutiveSummary,
  companyType,
  setCompanyType,
  productsServices,
  setProductsServices,
  employeeCount,
  setEmployeeCount,
  fundsRaised,
  setFundsRaised,
  valuation,
  setValuation,
  lastFyRevenue,
  setLastFyRevenue,
  lastQuarterRevenue,
  setLastQuarterRevenue,
  
  // Founder information
  founderName,
  setFounderName,
  founderGender,
  setFounderGender,
  founderEmail,
  setFounderEmail,
  founderContact,
  setFounderContact,
  founderAddress,
  setFounderAddress,
  founderState,
  setFounderState
}: CompanyInfoFormProps) {
  const [charCount, setCharCount] = useState(briefIntroduction ? briefIntroduction.length : 0);
  const [summaryCharCount, setSummaryCharCount] = useState(executiveSummary ? executiveSummary.length : 0);
  
  // Default handlers if props aren't provided
  const handleAddFounderLinkedIn = () => {
    if (addLinkedInProfile) {
      addLinkedInProfile();
    } else {
      setFounderLinkedIns([...founderLinkedIns, ""]);
    }
  };

  const handleRemoveFounderLinkedIn = (index: number) => {
    if (removeLinkedInProfile) {
      removeLinkedInProfile(index);
    } else if (founderLinkedIns.length > 1) {
      const updatedFounders = [...founderLinkedIns];
      updatedFounders.splice(index, 1);
      setFounderLinkedIns(updatedFounders);
    }
  };

  const handleUpdateFounderLinkedIn = (index: number, value: string) => {
    if (updateLinkedInProfile) {
      updateLinkedInProfile(index, value);
    } else {
      const updatedFounders = [...founderLinkedIns];
      updatedFounders[index] = value;
      setFounderLinkedIns(updatedFounders);
    }
  };

  const handleIntroductionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setCharCount(text.length);
    
    if (text.length <= 500) {
      setBriefIntroduction(text);
    }
  };

  const handleExecutiveSummaryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setSummaryCharCount(text.length);
    
    if (text.length <= 200) {
      setExecutiveSummary(text);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="title">Company Name <span className="text-red-500">*</span></Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter your company name"
          disabled={isDisabled}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="briefIntroduction">Brief Introduction (Optional)</Label>
        <Textarea
          id="briefIntroduction"
          value={briefIntroduction}
          onChange={handleIntroductionChange}
          placeholder="Briefly describe your company (max 500 characters)"
          disabled={isDisabled}
          className="resize-none"
          rows={4}
          maxLength={500}
        />
        <p className={`text-xs ${charCount > 500 ? 'text-red-500' : 'text-muted-foreground'}`}>
          {charCount}/500 characters
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="companyRegistrationType">Company Registered as <span className="text-red-500">*</span></Label>
        <Select 
          value={companyRegistrationType} 
          onValueChange={setCompanyRegistrationType}
          disabled={isDisabled}
        >
          <SelectTrigger id="companyRegistrationType">
            <SelectValue placeholder="Select registration type" />
          </SelectTrigger>
          <SelectContent>
            {REGISTRATION_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="registrationNumber">Registration number / CIN</Label>
          <Input
            id="registrationNumber"
            value={registrationNumber}
            onChange={(e) => setRegistrationNumber(e.target.value)}
            placeholder="Enter registration number"
            disabled={isDisabled}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="dpiitRecognitionNumber">DPIIT Recognition Number</Label>
          <Input
            id="dpiitRecognitionNumber"
            value={dpiitRecognitionNumber}
            onChange={(e) => setDpiitRecognitionNumber(e.target.value)}
            placeholder="Enter DPIIT number"
            disabled={isDisabled}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="indianCitizenShareholding">Total Shareholding of Indian Citizen(s) in the Startup <span className="text-red-500">*</span></Label>
        <Input
          id="indianCitizenShareholding"
          value={indianCitizenShareholding}
          onChange={(e) => setIndianCitizenShareholding(e.target.value)}
          placeholder="Enter percentage"
          disabled={isDisabled}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="executiveSummary">Executive Summary <span className="text-red-500">*</span></Label>
        <Textarea
          id="executiveSummary"
          value={executiveSummary}
          onChange={handleExecutiveSummaryChange}
          placeholder="Enter executive summary (maximum 200 words)"
          disabled={isDisabled}
          className="resize-none"
          rows={4}
          maxLength={200}
          required
        />
        <p className={`text-xs ${summaryCharCount > 200 ? 'text-red-500' : 'text-muted-foreground'}`}>
          {summaryCharCount}/200 characters
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="companyType">Company Type <span className="text-red-500">*</span></Label>
          <Select 
            value={companyType} 
            onValueChange={setCompanyType}
            disabled={isDisabled}
          >
            <SelectTrigger id="companyType">
              <SelectValue placeholder="Select company type" />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="employeeCount">No. of Employees (Full-time)</Label>
          <Input
            id="employeeCount"
            type="number"
            value={employeeCount}
            onChange={(e) => setEmployeeCount(e.target.value)}
            placeholder="Enter number of employees"
            disabled={isDisabled}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="productsServices">Name of Products/Services</Label>
        <Textarea
          id="productsServices"
          value={productsServices}
          onChange={(e) => setProductsServices(e.target.value)}
          placeholder="List your products or services"
          disabled={isDisabled}
          className="resize-none"
          rows={3}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fundsRaised">Fund Raised/Grants Received (if any)</Label>
          <Input
            id="fundsRaised"
            value={fundsRaised}
            onChange={(e) => setFundsRaised(e.target.value)}
            placeholder="Enter amount"
            disabled={isDisabled}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="valuation">Valuation</Label>
          <Input
            id="valuation"
            value={valuation}
            onChange={(e) => setValuation(e.target.value)}
            placeholder="Enter current or last valuation"
            disabled={isDisabled}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="lastFyRevenue">Revenue of last FY (₹ Lakh)</Label>
          <Input
            id="lastFyRevenue"
            value={lastFyRevenue}
            onChange={(e) => setLastFyRevenue(e.target.value)}
            placeholder="Enter revenue"
            disabled={isDisabled}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="lastQuarterRevenue">Revenue of last Quarter (₹ Lakh)</Label>
          <Input
            id="lastQuarterRevenue"
            value={lastQuarterRevenue}
            onChange={(e) => setLastQuarterRevenue(e.target.value)}
            placeholder="Enter quarterly revenue"
            disabled={isDisabled}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="founderLinkedIn">Founder LinkedIn Profiles (Optional)</Label>
        {founderLinkedIns.map((linkedin, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <Input
              id={index === 0 ? "founderLinkedIn" : `founderLinkedIn${index}`}
              value={linkedin}
              onChange={(e) => handleUpdateFounderLinkedIn(index, e.target.value)}
              placeholder="LinkedIn profile URL"
              disabled={isDisabled}
            />
            {index > 0 && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleRemoveFounderLinkedIn(index)}
                disabled={isDisabled}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddFounderLinkedIn}
          disabled={isDisabled}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Another Founder
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="website">Company Website (Optional)</Label>
        <Input
          id="website"
          value={companyWebsite}
          onChange={(e) => setCompanyWebsite(e.target.value)}
          placeholder="https://example.com"
          disabled={isDisabled}
        />
        <p className="text-xs text-muted-foreground">
          If provided, we'll scrape the website to enhance the analysis
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="stage">Stage of Company</Label>
          <Select 
            value={companyStage} 
            onValueChange={setCompanyStage}
            disabled={isDisabled}
          >
            <SelectTrigger id="stage">
              <SelectValue placeholder="Select stage" />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_STAGES.map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {stage}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <Select 
            value={industry} 
            onValueChange={setIndustry}
            disabled={isDisabled}
          >
            <SelectTrigger id="industry">
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((ind) => (
                <SelectItem key={ind} value={ind}>
                  {ind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="border-t pt-4 mt-6">
        <h3 className="text-lg font-medium mb-4">Founder Information</h3>
        
        <div className="space-y-2">
          <Label htmlFor="founderName">Name of Founder / Co-Founder <span className="text-red-500">*</span></Label>
          <Input
            id="founderName"
            value={founderName}
            onChange={(e) => setFounderName(e.target.value)}
            placeholder="Dr./Mr./Ms. Full Name"
            disabled={isDisabled}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="founderGender">Gender</Label>
          <Select 
            value={founderGender} 
            onValueChange={setFounderGender}
            disabled={isDisabled}
          >
            <SelectTrigger id="founderGender">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
              <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="founderEmail">Email ID <span className="text-red-500">*</span></Label>
          <Input
            id="founderEmail"
            type="email"
            value={founderEmail}
            onChange={(e) => setFounderEmail(e.target.value)}
            placeholder="founder@example.com"
            disabled={isDisabled}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="founderContact">Contact No. <span className="text-red-500">*</span></Label>
          <Input
            id="founderContact"
            value={founderContact}
            onChange={(e) => setFounderContact(e.target.value)}
            placeholder="Enter phone number"
            disabled={isDisabled}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="founderAddress">Address <span className="text-red-500">*</span></Label>
          <Textarea
            id="founderAddress"
            value={founderAddress}
            onChange={(e) => setFounderAddress(e.target.value)}
            placeholder="Enter full address"
            disabled={isDisabled}
            className="resize-none"
            rows={3}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="founderState">State <span className="text-red-500">*</span></Label>
          <Select 
            value={founderState} 
            onValueChange={setFounderState}
            disabled={isDisabled}
          >
            <SelectTrigger id="founderState">
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {INDIAN_STATES.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
}
