
import { useParams, useNavigate } from 'react-router-dom';
import { useCompanyDetails } from '@/hooks/companyHooks/useCompanyDetails';
import { CompanyHeader } from './CompanyHeader';
import { CompanyInfoCard } from './CompanyInfoCard';
import { CompanySectionsList } from './CompanySectionsList';
import { CompanyPerplexity } from './CompanyPerplexity';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function CompanyDetails() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { company, isLoading } = useCompanyDetails(companyId);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading company details...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            No company found with the ID: {companyId}. The company may have been deleted or you may not have permission to view it.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4">
      <CompanyHeader
        name={company.name}
        overallScore={company.overallScore}
        createdAt={company.createdAt}
      />
      
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-8">
          <CompanySectionsList 
            companyId={company.id.toString()} 
            sections={company.sections}
          />
        </div>
        
        <div className="space-y-6">
          <CompanyInfoCard 
            website={company.website}
            stage={company.stage || 'Not specified'}
            industry={company.industry || 'Not specified'}
            introduction={company.introduction || 'No detailed information available for this company.'}
          />
          
          {company.perplexityResponse && (
            <CompanyPerplexity
              perplexityResponse={company.perplexityResponse}
              perplexityRequestedAt={company.perplexityRequestedAt}
            />
          )}
        </div>
      </div>
    </div>
  );
}
