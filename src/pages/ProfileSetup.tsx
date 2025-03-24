import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage 
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelect } from "@/components/ui/multi-select";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckIcon, Loader2, UploadCloud } from "lucide-react";
import { AreaOfInterestOptions } from "@/lib/constants";
import { InvestorPitchEmail } from "@/components/profile/InvestorPitchEmail";

interface ProfileFormValues {
  fundName: string;
  fundSize: string;
  areasOfInterest: string[];
  investmentStage: string[];
  companiesInvested: string[];
  fundThesis: File | null;
}

const ProfileSetup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingThesis, setUploadingThesis] = useState(false);
  const [thesisFile, setThesisFile] = useState<File | null>(null);
  
  const form = useForm<ProfileFormValues>({
    defaultValues: {
      fundName: "",
      fundSize: "",
      areasOfInterest: [],
      investmentStage: [],
      companiesInvested: [],
      fundThesis: null
    }
  });

  const handleThesisUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThesisFile(file);
    }
  };

  const onSubmit = async (values: ProfileFormValues) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      let fundThesisUrl = "";
      
      if (thesisFile) {
        setUploadingThesis(true);
        
        // Create a structured file path with user ID
        const fileExt = thesisFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        
        console.log('Attempting to upload thesis to path:', filePath);
        
        try {
          const { error: uploadError } = await supabase.storage
            .from('vc-documents')
            .upload(filePath, thesisFile, {
              cacheControl: '3600',
              upsert: true
            });
            
          if (uploadError) {
            console.error('Error with structured path upload:', uploadError);
            throw uploadError;
          }
          
          fundThesisUrl = filePath;
          console.log('File uploaded successfully to:', filePath);
        } catch (uploadErr) {
          console.error('Upload failed with structured path, trying simple filename:', uploadErr);
          
          // Fallback to simple filename
          const simpleFilePath = fileName;
          
          const { error: fallbackError } = await supabase.storage
            .from('vc-documents')
            .upload(simpleFilePath, thesisFile, {
              cacheControl: '3600',
              upsert: true
            });
            
          if (fallbackError) {
            console.error('Error with simple path upload:', fallbackError);
            throw fallbackError;
          }
          
          fundThesisUrl = simpleFilePath;
          console.log('File uploaded successfully with simple path:', simpleFilePath);
        }
        
        setUploadingThesis(false);
      }
      
      console.log('Creating profile with thesis URL:', fundThesisUrl);
      
      const { error } = await supabase
        .from('vc_profiles')
        .insert({
          id: user.id,
          fund_name: values.fundName,
          fund_size: values.fundSize,
          areas_of_interest: values.areasOfInterest,
          investment_stage: values.investmentStage,
          companies_invested: values.companiesInvested,
          fund_thesis_url: fundThesisUrl
        });
        
      if (error) throw error;
      
      toast({
        title: "Profile created",
        description: "Your VC profile has been set up successfully",
      });
      
      navigate('/dashboard');
      
    } catch (error: any) {
      console.error('Profile creation error:', error);
      toast({
        title: "Error creating profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const addCompany = () => {
    const companies = form.getValues().companiesInvested || [];
    form.setValue('companiesInvested', [...companies, ""]);
  };

  const removeCompany = (index: number) => {
    const companies = form.getValues().companiesInvested || [];
    companies.splice(index, 1);
    form.setValue('companiesInvested', [...companies]);
  };

  const investmentStageOptions = [
    { label: "Pre-seed", value: "pre-seed" },
    { label: "Seed", value: "seed" },
    { label: "Series A", value: "series-a" },
    { label: "Series B", value: "series-b" },
    { label: "Series C", value: "series-c" },
    { label: "Series D+", value: "series-d-plus" },
    { label: "Growth", value: "growth" },
    { label: "Late Stage", value: "late-stage" }
  ];

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8">
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="text-2xl">Profile Setup</CardTitle>
          <CardDescription>
            Complete your profile to enhance your investment experience
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="fundName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fund Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your fund name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fundSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fund Size</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. $50M" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="areasOfInterest"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Areas of Interest</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={AreaOfInterestOptions}
                        placeholder="Select areas..."
                        selected={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      Select the industries you're interested in
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="investmentStage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Investment Stages</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={investmentStageOptions}
                        placeholder="Select stages..."
                        selected={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Companies Invested</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addCompany}
                  >
                    Add Company
                  </Button>
                </div>
                
                {form.watch('companiesInvested').map((company, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="Company name"
                      value={company}
                      onChange={(e) => {
                        const newCompanies = [...form.getValues().companiesInvested];
                        newCompanies[index] = e.target.value;
                        form.setValue('companiesInvested', newCompanies);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeCompany(index)}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="thesis">Fund Thesis PDF</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    id="thesis"
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleThesisUpload}
                  />
                  <label
                    htmlFor="thesis"
                    className="cursor-pointer flex flex-col items-center justify-center"
                  >
                    {thesisFile ? (
                      <>
                        <CheckIcon className="h-8 w-8 text-green-500 mb-2" />
                        <p className="text-sm font-medium">{thesisFile.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Click to change file
                        </p>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Click to upload your fund thesis</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PDF file up to 10MB
                        </p>
                      </>
                    )}
                  </label>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="publicSubmissionUrl" className="flex items-center">
                  <span>Public Submission URL</span>
                  <span className="ml-2 text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded">Available after signup</span>
                </Label>
                <Input 
                  id="publicSubmissionUrl" 
                  type="text" 
                  placeholder="Your custom submission URL" 
                  disabled
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  After signup, you can create a public link for founders to submit their pitch decks directly to your dashboard. 
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="investorPitchEmail" className="flex items-center">
                  <span>InvestorBase Pitch Email</span>
                  <span className="ml-2 text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded">Available after signup</span>
                </Label>
                <InvestorPitchEmail isSetupPage={true} />
                <p className="text-xs text-muted-foreground mt-1">
                  After signup, you can request a personalized email for founders to send their pitch decks directly to you. 
                </p>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col sm:flex-row gap-4 sm:justify-between">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate('/dashboard')}
              >
                Skip for now
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || uploadingThesis}
              >
                {(isLoading || uploadingThesis) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploadingThesis ? "Uploading..." : "Saving..."}
                  </>
                ) : (
                  "Complete Profile"
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default ProfileSetup;
