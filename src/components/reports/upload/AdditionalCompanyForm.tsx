
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

// Registration types
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
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

interface AdditionalCompanyFormProps {
  companyRegistrationType: string;
  setCompanyRegistrationType: (value: string) => void;
  registrationNumber: string;
  setRegistrationNumber: (value: string) => void;
  dpiitNumber: string;
  setDpiitNumber: (value: string) => void;
  indianShareholding: string;
  setIndianShareholding: (value: string) => void;
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
  isDisabled: boolean;
}

export function AdditionalCompanyForm({
  companyRegistrationType,
  setCompanyRegistrationType,
  registrationNumber,
  setRegistrationNumber,
  dpiitNumber,
  setDpiitNumber,
  indianShareholding,
  setIndianShareholding,
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
  founderName,
  setFounderName,
  founderGender,
  setFounderGender,
  founderContact,
  setFounderContact,
  founderEmail,
  setFounderEmail,
  founderAddress,
  setFounderAddress,
  founderState,
  setFounderState,
  isDisabled
}: AdditionalCompanyFormProps) {
  const [summaryCharCount, setSummaryCharCount] = useState(executiveSummary ? executiveSummary.length : 0);
  
  const handleSummaryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setSummaryCharCount(text.length);
    
    if (text.length <= 200) {
      setExecutiveSummary(text);
    }
  };

  return (
    <>
      <div className="border-t pt-6 mt-6">
        <h3 className="text-lg font-semibold mb-4">Company Information</h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyRegistrationType">
              Company Registered as <span className="text-red-500">*</span>
            </Label>
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
            <Label htmlFor="dpiitNumber">DPIIT Recognition Number</Label>
            <Input
              id="dpiitNumber"
              value={dpiitNumber}
              onChange={(e) => setDpiitNumber(e.target.value)}
              placeholder="Enter DPIIT recognition number"
              disabled={isDisabled}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="indianShareholding">
              Total Shareholding of Indian Citizen(s) in the Startup <span className="text-red-500">*</span>
            </Label>
            <Input
              id="indianShareholding"
              value={indianShareholding}
              onChange={(e) => setIndianShareholding(e.target.value)}
              placeholder="Enter percentage or details"
              disabled={isDisabled}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="executiveSummary">
              Executive Summary <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="executiveSummary"
              value={executiveSummary}
              onChange={handleSummaryChange}
              placeholder="Provide a brief summary of your company (max 200 words)"
              disabled={isDisabled}
              className="resize-none min-h-[120px]"
              required
              maxLength={200}
            />
            <p className={`text-xs ${summaryCharCount > 200 ? 'text-red-500' : 'text-muted-foreground'}`}>
              {summaryCharCount}/200 characters
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="companyType">
              Company Type <span className="text-red-500">*</span>
            </Label>
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
            <Label htmlFor="productsServices">Name of Products/Services</Label>
            <Input
              id="productsServices"
              value={productsServices}
              onChange={(e) => setProductsServices(e.target.value)}
              placeholder="List your products or services"
              disabled={isDisabled}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employeeCount">No. of Employees (Full-time)</Label>
              <Input
                id="employeeCount"
                type="number"
                min="0"
                value={employeeCount}
                onChange={(e) => setEmployeeCount(e.target.value)}
                placeholder="Enter number"
                disabled={isDisabled}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fundsRaised">Fund Raised/Grants Received (if any)</Label>
              <Input
                id="fundsRaised"
                value={fundsRaised}
                onChange={(e) => setFundsRaised(e.target.value)}
                placeholder="Amount raised"
                disabled={isDisabled}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="valuation">Valuation on which last funds raised (if any) or current valuation</Label>
            <Input
              id="valuation"
              value={valuation}
              onChange={(e) => setValuation(e.target.value)}
              placeholder="Enter valuation amount"
              disabled={isDisabled}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lastFyRevenue">Revenue of last FY (₹ Lakh)</Label>
              <Input
                id="lastFyRevenue"
                value={lastFyRevenue}
                onChange={(e) => setLastFyRevenue(e.target.value)}
                placeholder="Enter amount"
                disabled={isDisabled}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastQuarterRevenue">Revenue of last Quarter (₹ Lakh)</Label>
              <Input
                id="lastQuarterRevenue"
                value={lastQuarterRevenue}
                onChange={(e) => setLastQuarterRevenue(e.target.value)}
                placeholder="Enter amount"
                disabled={isDisabled}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t pt-6 mt-6">
        <h3 className="text-lg font-semibold mb-4">Founder Information</h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="founderName">
              Name of Founder / Co-Founder (Dr/Mr/Ms) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="founderName"
              value={founderName}
              onChange={(e) => setFounderName(e.target.value)}
              placeholder="Enter founder name with prefix"
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
            <Label htmlFor="founderEmail">
              Email ID <span className="text-red-500">*</span>
            </Label>
            <Input
              id="founderEmail"
              type="email"
              value={founderEmail}
              onChange={(e) => setFounderEmail(e.target.value)}
              placeholder="Enter email address"
              disabled={isDisabled}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="founderContact">
              Contact No. <span className="text-red-500">*</span>
            </Label>
            <Input
              id="founderContact"
              value={founderContact}
              onChange={(e) => setFounderContact(e.target.value)}
              placeholder="Enter contact number"
              disabled={isDisabled}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="founderAddress">
              Address <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="founderAddress"
              value={founderAddress}
              onChange={(e) => setFounderAddress(e.target.value)}
              placeholder="Enter full address"
              disabled={isDisabled}
              className="resize-none min-h-[80px]"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="founderState">
              State <span className="text-red-500">*</span>
            </Label>
            <Select 
              value={founderState} 
              onValueChange={setFounderState}
              disabled={isDisabled}
            >
              <SelectTrigger id="founderState">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                {INDIAN_STATES.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </>
  );
}
