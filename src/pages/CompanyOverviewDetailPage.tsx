
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Building2, Globe, Calendar, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyDetails } from "@/hooks/companyHooks/useCompanyDetails";

const CompanyOverviewDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { company, isLoading: companyLoading } = useCompanyDetails(id || "");

  // Fetch company LinkedIn scrape data
  const { data: scrapedData, isLoading: scrapeLoading } = useQuery({
    queryKey: ['company-scrape-details', id],
    queryFn: async () => {
      console.log('Fetching company scrape details for company ID:', id);
      
      // Try to find company LinkedIn scrape data
      const { data: scrapes, error } = await supabase
        .from('company_scrapes')
        .select('*')
        .eq('status', 'success')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching company scrapes:', error);
        return null;
      }

      // Find scrape that looks like a company URL (contains /company/)
      const companyScrape = scrapes?.find(scrape => 
        scrape.linkedin_url && scrape.linkedin_url.includes('/company/')
      );

      console.log('Found company scrape:', companyScrape);
      return companyScrape;
    },
    enabled: !!id,
  });

  const isLoading = companyLoading || scrapeLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            Company Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The company you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => navigate('/')}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  // Format scraped data for display
  const formatScrapedData = (data: any) => {
    if (!data) return "No additional information available.";
    
    if (typeof data === 'string') {
      return data;
    }
    
    // If it's structured data, format it nicely
    const formatted = [];
    
    if (data.name) formatted.push(`Company Name: ${data.name}`);
    if (data.description) formatted.push(`Description: ${data.description}`);
    if (data.industry) formatted.push(`Industry: ${data.industry}`);
    if (data.company_size) formatted.push(`Company Size: ${data.company_size}`);
    if (data.headquarters) formatted.push(`Headquarters: ${data.headquarters}`);
    if (data.founded) formatted.push(`Founded: ${data.founded}`);
    if (data.website) formatted.push(`Website: ${data.website}`);
    if (data.specialties) formatted.push(`Specialties: ${Array.isArray(data.specialties) ? data.specialties.join(', ') : data.specialties}`);
    
    return formatted.length > 0 ? formatted.join('\n\n') : JSON.stringify(data, null, 2);
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/company/${id}`)}
          className="mb-6 flex items-center"
        >
          <ChevronLeft className="mr-1" /> Back to Company Details
        </Button>

        {/* Company Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {company.name}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Detailed Company Information
          </p>
        </div>

        {/* Company Overview Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Basic Information</h4>
                <div className="space-y-2">
                  <p><span className="font-medium">Industry:</span> {company.industry || 'Not specified'}</p>
                  <p><span className="font-medium">Stage:</span> {company.stage || 'Not specified'}</p>
                  <p><span className="font-medium">Overall Score:</span> {company.overallScore}/5</p>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {company.introduction || 'No description available.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* LinkedIn Company Data */}
        {scrapedData && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                LinkedIn Company Profile Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Data from LinkedIn company profile</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(scrapedData.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="p-4 bg-secondary/30 rounded-lg">
                  <h4 className="font-semibold mb-3">Company Information:</h4>
                  <div className="max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                      {formatScrapedData(scrapedData.scraped_data)}
                    </pre>
                  </div>
                </div>

                {scrapedData.linkedin_url && (
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(scrapedData.linkedin_url, '_blank')}
                      className="flex items-center gap-2"
                    >
                      <Globe className="h-4 w-4" />
                      View Original LinkedIn Profile
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Data Message */}
        {!scrapedData && (
          <Card>
            <CardContent className="p-6 text-center">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Additional Data Available</h3>
              <p className="text-muted-foreground">
                No LinkedIn company profile data has been scraped for this company yet.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CompanyOverviewDetailPage;
