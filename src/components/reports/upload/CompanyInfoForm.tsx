
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
  isDisabled: boolean;
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
  isDisabled
}: CompanyInfoFormProps) {
  const [charCount, setCharCount] = useState(0);
  
  const addFounderLinkedIn = () => {
    setFounderLinkedIns([...founderLinkedIns, ""]);
  };

  const removeFounderLinkedIn = (index: number) => {
    if (founderLinkedIns.length > 1) {
      const updatedFounders = [...founderLinkedIns];
      updatedFounders.splice(index, 1);
      setFounderLinkedIns(updatedFounders);
    }
  };

  const updateFounderLinkedIn = (index: number, value: string) => {
    const updatedFounders = [...founderLinkedIns];
    updatedFounders[index] = value;
    setFounderLinkedIns(updatedFounders);
  };

  const handleIntroductionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setCharCount(text.length);
    
    if (text.length <= 50) {
      setBriefIntroduction(text);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="title">Company Name</Label>
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
        <Label htmlFor="briefIntroduction">Brief Introduction</Label>
        <Textarea
          id="briefIntroduction"
          value={briefIntroduction}
          onChange={handleIntroductionChange}
          placeholder="Briefly describe your company (max 50 characters)"
          disabled={isDisabled}
          required
          className="resize-none"
          rows={2}
          maxLength={50}
        />
        <p className={`text-xs ${charCount > 50 ? 'text-red-500' : 'text-muted-foreground'}`}>
          {charCount}/50 characters
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="founderLinkedIn">Founder LinkedIn Profiles (Optional)</Label>
        {founderLinkedIns.map((linkedin, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <Input
              id={index === 0 ? "founderLinkedIn" : `founderLinkedIn${index}`}
              value={linkedin}
              onChange={(e) => updateFounderLinkedIn(index, e.target.value)}
              placeholder="LinkedIn profile URL"
              disabled={isDisabled}
            />
            {index > 0 && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => removeFounderLinkedIn(index)}
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
          onClick={addFounderLinkedIn}
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
    </>
  );
}
