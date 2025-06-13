
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, TrendingUp, Briefcase, ExternalLink } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

type CompanyInfoProps = {
  website?: string;
  stage?: string;
  industry?: string;
  founderLinkedIns?: string[];
  introduction?: string;
  description?: string; // Added for backward compatibility
  pitchUrl?: string;    // Added for backward compatibility
  reportId?: string;    // Added for backward compatibility
  companyName?: string; // Added to display company name in description
  companyLinkedInUrl?: string; // Added for LinkedIn scraping
};

export function CompanyInfoCard({
  website = "https://example.com",
  stage = "Not specified",
  industry = "Not specified",
  founderLinkedIns = [],
  introduction = "No detailed information available for this company.",
  description, // For backward compatibility
  pitchUrl,    // For backward compatibility
  reportId,     // For backward compatibility
  companyName = "this company",
  companyLinkedInUrl
}: CompanyInfoProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // Use introduction or description (for backward compatibility)
  const displayIntroduction = introduction || description || "No detailed information available for this company.";

  // Format website URL for display and linking
  const displayWebsite = website && website !== "https://example.com" 
    ? website.replace(/^https?:\/\/(www\.)?/, '') 
    : "Not available";
  
  const websiteUrl = website && website !== "https://example.com" 
    ? (website.startsWith('http') ? website : `https://${website}`)
    : null;

  // Check if LinkedIn scraping already exists for this company
  const { data: existingScrape } = useQuery({
    queryKey: ['company-linkedin-scrape', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('company_scrapes')
        .select('*')
        .eq('company_id', id)
        .eq('status', 'completed')
        .maybeSingle();

      if (error) {
        console.error('Error checking existing scrape:', error);
        return null;
      }

      return data;
    },
    enabled: !!id,
  });

  const handleMoreInformation = async () => {
    if (!id) {
      navigate('/company-detail-page');
      return;
    }

    // If we have a company LinkedIn URL and no existing scrape, trigger scraping
    if (companyLinkedInUrl && !existingScrape) {
      console.log('Triggering LinkedIn scraping for company:', id);
      
      try {
        const { data, error } = await supabase.functions.invoke('scraped_company_details', {
          body: { 
            linkedInUrl: companyLinkedInUrl,
            companyId: id 
          }
        });

        if (error) {
          console.error('LinkedIn scraping error:', error);
          toast.error('Failed to fetch LinkedIn data, but you can still view company details');
        } else {
          console.log('LinkedIn scraping initiated successfully:', data);
          toast.success('LinkedIn data is being processed');
        }
      } catch (error) {
        console.error('LinkedIn scraping failed:', error);
        toast.error('Failed to fetch LinkedIn data, but you can still view company details');
      }
    }

    // Navigate to company overview page
    navigate(`/company/${id}/overview`);
  };

  return (
    <div className="mb-7">
      <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-primary" />
        Company Overview
      </h3>
      
      <Card className="border-0 shadow-card">
        <CardContent className="p-4 pt-5">
          {/* Company Description */}
          <div className="mb-6">
            <h4 className="font-medium mb-2">About {companyName}</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
              {displayIntroduction}
            </p>
          </div>
          
          {/* Company Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Website</p>
                {websiteUrl ? (
                  <a 
                    href={websiteUrl}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-primary hover:underline truncate block"
                  >
                    {displayWebsite}
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">Not available</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Stage</p>
                <p className="text-sm text-muted-foreground">{stage}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Industry</p>
                <p className="text-sm text-muted-foreground">{industry}</p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleMoreInformation}
            className="flex items-center gap-2 text-primary"
          >
            <ExternalLink className="h-4 w-4" />
            More Information
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
