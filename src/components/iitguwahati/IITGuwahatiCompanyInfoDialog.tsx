import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Building, Loader2, Info, ExternalLink, Users, Calendar, MapPin, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface IITGuwahatiCompanyInfoDialogProps {
  companyName: string;
  submissionId: string;
}

export const IITGuwahatiCompanyInfoDialog = ({ companyName, submissionId }: IITGuwahatiCompanyInfoDialogProps) => {
  const [open, setOpen] = useState(false);
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [companyData, setCompanyData] = useState<any>(null);

  const handleGetCompanyInfo = async () => {
    if (!linkedInUrl.trim()) {
      toast.error('Please enter a LinkedIn company URL');
      return;
    }

    if (!linkedInUrl.includes('linkedin.com/company/')) {
      toast.error('Please enter a valid LinkedIn company URL');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('scraped_company_details', {
        body: { 
          linkedInUrl: linkedInUrl.trim(),
          companyId: submissionId
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success && data?.companyData) {
        setCompanyData(data.companyData);
        toast.success('Company information retrieved successfully');
      } else {
        toast.error(data?.error || 'Failed to retrieve company information');
      }
    } catch (error: any) {
      console.error('Error fetching company info:', error);
      toast.error(error.message || 'Failed to fetch company information');
    } finally {
      setIsLoading(false);
    }
  };

  const formatScrapedData = (data: any) => {
    if (!data) return null;

    return (
      <div className="space-y-4 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.name && (
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Name:</span>
              <span>{data.name}</span>
            </div>
          )}
          
          {data.industry && (
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Industry:</span>
              <span>{data.industry}</span>
            </div>
          )}
          
          {data.employees_count && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Employees:</span>
              <span>{data.employees_count}</span>
            </div>
          )}
          
          {data.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Location:</span>
              <span>{data.location}</span>
            </div>
          )}
          
          {data.founded_year && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Founded:</span>
              <span>{data.founded_year}</span>
            </div>
          )}
          
          {data.website && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Website:</span>
              <a 
                href={data.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
              >
                {data.website}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>
        
        {data.description && (
          <div className="mt-4">
            <span className="font-medium">Description:</span>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {data.description}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Info className="h-4 w-4" />
          More Information
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Company Information - {companyName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center py-6">
          <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
            <Building className="h-8 w-8 text-primary" />
          </div>
          
          <h3 className="text-lg font-semibold mb-2">Get Company Information</h3>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Enter the LinkedIn company URL to get detailed information about {companyName}.
          </p>
          
          <div className="w-full space-y-4">
            <div className="space-y-2">
              <Label htmlFor="linkedin-url">LinkedIn Company URL</Label>
              <Input
                id="linkedin-url"
                placeholder="https://www.linkedin.com/company/example-company/"
                value={linkedInUrl}
                onChange={(e) => setLinkedInUrl(e.target.value)}
                className="border-primary/50 focus:border-primary"
              />
            </div>
            
            <Button 
              onClick={handleGetCompanyInfo}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Getting Information...
                </>
              ) : (
                'Get Company Information'
              )}
            </Button>
          </div>
          
          {companyData && (
            <div className="w-full mt-6 p-4 bg-muted/50 rounded-lg">
              {formatScrapedData(companyData)}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
