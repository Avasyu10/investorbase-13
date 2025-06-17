import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  updateLinkedInProfile: (index: number, value: string) => void;
  addLinkedInProfile: () => void;
  removeLinkedInProfile: (index: number) => void;
  isDisabled: boolean;
  // New company fields
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
  // Company LinkedIn URL
  companyLinkedInUrl?: string;
  setCompanyLinkedInUrl?: (value: string) => void;
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
  updateLinkedInProfile,
  addLinkedInProfile,
  removeLinkedInProfile,
  isDisabled,
  // New company fields
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
  setFounderState,
  // Company LinkedIn URL
  companyLinkedInUrl = "",
  setCompanyLinkedInUrl = () => {},
}: CompanyInfoFormProps) {
  const indianStates = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
    "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu"
  ];

  return (
    <div className="space-y-6">
      {/* Company Name */}
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
          disabled={isDisabled}
          required
        />
      </div>

      {/* Company Registration Type */}
      <div className="space-y-2">
        <Label htmlFor="companyRegistrationType">
          How is your company registered? <span className="text-red-500">*</span>
        </Label>
        <Select 
          value={companyRegistrationType} 
          onValueChange={setCompanyRegistrationType}
          disabled={isDisabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select registration type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="private_limited">Private Limited Company</SelectItem>
            <SelectItem value="public_limited">Public Limited Company</SelectItem>
            <SelectItem value="llp">Limited Liability Partnership (LLP)</SelectItem>
            <SelectItem value="partnership">Partnership Firm</SelectItem>
            <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
            <SelectItem value="one_person_company">One Person Company (OPC)</SelectItem>
            <SelectItem value="section_8">Section 8 Company (Non-Profit)</SelectItem>
            <SelectItem value="not_registered">Not Registered</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Registration Number */}
      <div className="space-y-2">
        <Label htmlFor="registrationNumber">Registration Number (if applicable)</Label>
        <Input
          id="registrationNumber"
          type="text"
          value={registrationNumber}
          onChange={(e) => setRegistrationNumber(e.target.value)}
          placeholder="Enter your company registration number"
          disabled={isDisabled}
        />
      </div>

      {/* DPIIT Recognition Number */}
      <div className="space-y-2">
        <Label htmlFor="dpiitRecognitionNumber">DPIIT Recognition Number (if applicable)</Label>
        <Input
          id="dpiitRecognitionNumber"
          type="text"
          value={dpiitRecognitionNumber}
          onChange={(e) => setDpiitRecognitionNumber(e.target.value)}
          placeholder="Enter your DPIIT recognition number"
          disabled={isDisabled}
        />
      </div>

      {/* Indian Citizen Shareholding */}
      <div className="space-y-2">
        <Label htmlFor="indianCitizenShareholding">
          Total shareholding of Indian citizens in your company <span className="text-red-500">*</span>
        </Label>
        <Select 
          value={indianCitizenShareholding} 
          onValueChange={setIndianCitizenShareholding}
          disabled={isDisabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select shareholding percentage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="100%">100%</SelectItem>
            <SelectItem value="75-99%">75-99%</SelectItem>
            <SelectItem value="51-74%">51-74%</SelectItem>
            <SelectItem value="26-50%">26-50%</SelectItem>
            <SelectItem value="1-25%">1-25%</SelectItem>
            <SelectItem value="0%">0%</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Executive Summary */}
      <div className="space-y-2">
        <Label htmlFor="executiveSummary">
          Executive Summary <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="executiveSummary"
          value={executiveSummary}
          onChange={(e) => setExecutiveSummary(e.target.value)}
          className="min-h-[120px] resize-y"
          placeholder="Provide a brief executive summary of your company, including your mission, key products/services, target market, and unique value proposition."
          disabled={isDisabled}
          required
        />
      </div>

      {/* Company LinkedIn URL - positioned right after Executive Summary */}
      <div className="space-y-2">
        <Label htmlFor="companyLinkedInUrl">Company LinkedIn URL</Label>
        <Input
          id="companyLinkedInUrl"
          type="url"
          value={companyLinkedInUrl}
          onChange={(e) => setCompanyLinkedInUrl(e.target.value)}
          placeholder="https://www.linkedin.com/company/your-company"
          disabled={isDisabled}
        />
      </div>

      {/* Company Type */}
      <div className="space-y-2">
        <Label htmlFor="companyType">
          Company Type <span className="text-red-500">*</span>
        </Label>
        <Select 
          value={companyType} 
          onValueChange={setCompanyType}
          disabled={isDisabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select company type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="b2b">B2B (Business to Business)</SelectItem>
            <SelectItem value="b2c">B2C (Business to Consumer)</SelectItem>
            <SelectItem value="b2b2c">B2B2C (Business to Business to Consumer)</SelectItem>
            <SelectItem value="marketplace">Marketplace</SelectItem>
            <SelectItem value="saas">SaaS (Software as a Service)</SelectItem>
            <SelectItem value="hardware">Hardware</SelectItem>
            <SelectItem value="fintech">FinTech</SelectItem>
            <SelectItem value="healthtech">HealthTech</SelectItem>
            <SelectItem value="edtech">EdTech</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Brief Introduction */}
      <div className="space-y-2">
        <Label htmlFor="briefIntroduction">Brief Company Description</Label>
        <Textarea
          id="briefIntroduction"
          value={briefIntroduction}
          onChange={(e) => setBriefIntroduction(e.target.value)}
          className="min-h-[100px] resize-y"
          placeholder="Tell us about your company, what problem you're solving, and your target market..."
          disabled={isDisabled}
        />
      </div>

      {/* Products/Services */}
      <div className="space-y-2">
        <Label htmlFor="productsServices">Products/Services Offered</Label>
        <Textarea
          id="productsServices"
          value={productsServices}
          onChange={(e) => setProductsServices(e.target.value)}
          className="min-h-[80px] resize-y"
          placeholder="Describe your main products or services"
          disabled={isDisabled}
        />
      </div>

      {/* Company Website */}
      <div className="space-y-2">
        <Label htmlFor="companyWebsite">Company Website</Label>
        <Input
          id="companyWebsite"
          type="url"
          value={companyWebsite}
          onChange={(e) => setCompanyWebsite(e.target.value)}
          placeholder="https://yourcompany.com"
          disabled={isDisabled}
        />
      </div>

      {/* Company Stage */}
      <div className="space-y-2">
        <Label htmlFor="companyStage">Company Stage</Label>
        <Select value={companyStage} onValueChange={setCompanyStage} disabled={isDisabled}>
          <SelectTrigger>
            <SelectValue placeholder="Select company stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="idea">Idea Stage</SelectItem>
            <SelectItem value="prototype">Prototype</SelectItem>
            <SelectItem value="mvp">MVP</SelectItem>
            <SelectItem value="early-revenue">Early Revenue</SelectItem>
            <SelectItem value="growth">Growth Stage</SelectItem>
            <SelectItem value="scaling">Scaling</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Industry */}
      <div className="space-y-2">
        <Label htmlFor="industry">Industry</Label>
        <Input
          id="industry"
          type="text"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          placeholder="e.g., FinTech, HealthTech, EdTech"
          disabled={isDisabled}
        />
      </div>

      {/* Employee Count */}
      <div className="space-y-2">
        <Label htmlFor="employeeCount">Number of Employees</Label>
        <Select value={employeeCount} onValueChange={setEmployeeCount} disabled={isDisabled}>
          <SelectTrigger>
            <SelectValue placeholder="Select employee count" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 (Solo founder)</SelectItem>
            <SelectItem value="2-5">2-5</SelectItem>
            <SelectItem value="6-10">6-10</SelectItem>
            <SelectItem value="11-20">11-20</SelectItem>
            <SelectItem value="21-50">21-50</SelectItem>
            <SelectItem value="51-100">51-100</SelectItem>
            <SelectItem value="101-500">101-500</SelectItem>
            <SelectItem value="500+">500+</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Funds Raised */}
      <div className="space-y-2">
        <Label htmlFor="fundsRaised">Total Funds Raised (if any)</Label>
        <Input
          id="fundsRaised"
          type="text"
          value={fundsRaised}
          onChange={(e) => setFundsRaised(e.target.value)}
          placeholder="e.g., ₹50 lakhs, $100K, or 'Bootstrapped'"
          disabled={isDisabled}
        />
      </div>

      {/* Valuation */}
      <div className="space-y-2">
        <Label htmlFor="valuation">Current Valuation (if applicable)</Label>
        <Input
          id="valuation"
          type="text"
          value={valuation}
          onChange={(e) => setValuation(e.target.value)}
          placeholder="e.g., ₹5 crores, $1M"
          disabled={isDisabled}
        />
      </div>

      {/* Last FY Revenue */}
      <div className="space-y-2">
        <Label htmlFor="lastFyRevenue">Last Financial Year Revenue</Label>
        <Input
          id="lastFyRevenue"
          type="text"
          value={lastFyRevenue}
          onChange={(e) => setLastFyRevenue(e.target.value)}
          placeholder="e.g., ₹10 lakhs, $50K, or 'Pre-revenue'"
          disabled={isDisabled}
        />
      </div>

      {/* Last Quarter Revenue */}
      <div className="space-y-2">
        <Label htmlFor="lastQuarterRevenue">Last Quarter Revenue</Label>
        <Input
          id="lastQuarterRevenue"
          type="text"
          value={lastQuarterRevenue}
          onChange={(e) => setLastQuarterRevenue(e.target.value)}
          placeholder="e.g., ₹3 lakhs, $15K, or 'Pre-revenue'"
          disabled={isDisabled}
        />
      </div>

      {/* Founder Information Section */}
      <div className="pt-6 border-t">
        <h3 className="text-lg font-semibold mb-4">Founder Information</h3>
        
        {/* Founder Name */}
        <div className="space-y-2 mb-4">
          <Label htmlFor="founderName">
            Name of Founder/Co-founder <span className="text-red-500">*</span>
          </Label>
          <Input
            id="founderName"
            type="text"
            value={founderName}
            onChange={(e) => setFounderName(e.target.value)}
            placeholder="Enter founder's full name"
            disabled={isDisabled}
            required
          />
        </div>

        {/* Founder Gender */}
        <div className="space-y-2 mb-4">
          <Label htmlFor="founderGender">Gender</Label>
          <Select value={founderGender} onValueChange={setFounderGender} disabled={isDisabled}>
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="non-binary">Non-binary</SelectItem>
              <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Founder Email */}
        <div className="space-y-2 mb-4">
          <Label htmlFor="founderEmail">
            Email Address <span className="text-red-500">*</span>
          </Label>
          <Input
            id="founderEmail"
            type="email"
            value={founderEmail}
            onChange={(e) => setFounderEmail(e.target.value)}
            placeholder="founder@company.com"
            disabled={isDisabled}
            required
          />
        </div>

        {/* Founder Contact */}
        <div className="space-y-2 mb-4">
          <Label htmlFor="founderContact">
            Contact Number <span className="text-red-500">*</span>
          </Label>
          <Input
            id="founderContact"
            type="tel"
            value={founderContact}
            onChange={(e) => setFounderContact(e.target.value)}
            placeholder="+91 9876543210"
            disabled={isDisabled}
            required
          />
        </div>

        {/* Founder Address */}
        <div className="space-y-2 mb-4">
          <Label htmlFor="founderAddress">
            Address <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="founderAddress"
            value={founderAddress}
            onChange={(e) => setFounderAddress(e.target.value)}
            className="min-h-[80px] resize-y"
            placeholder="Enter complete address"
            disabled={isDisabled}
            required
          />
        </div>

        {/* Founder State */}
        <div className="space-y-2 mb-4">
          <Label htmlFor="founderState">
            State <span className="text-red-500">*</span>
          </Label>
          <Select value={founderState} onValueChange={setFounderState} disabled={isDisabled}>
            <SelectTrigger>
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {indianStates.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Founder LinkedIn Profiles */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label>Founder LinkedIn Profile(s)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLinkedInProfile}
            disabled={isDisabled}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Profile
          </Button>
        </div>
        
        {founderLinkedIns.map((profile, index) => (
          <div key={index} className="flex gap-2">
            <Input
              type="url"
              value={profile}
              onChange={(e) => updateLinkedInProfile(index, e.target.value)}
              placeholder="https://linkedin.com/in/founder-name"
              disabled={isDisabled}
              className="flex-1"
            />
            {founderLinkedIns.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => removeLinkedInProfile(index)}
                disabled={isDisabled}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
