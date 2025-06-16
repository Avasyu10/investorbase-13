
import { CompanyLinkedInScraping } from './CompanyLinkedInScraping';

interface CompanyLinkedInInfoProps {
  companyId: string;
  companyName: string;
}

export const CompanyLinkedInInfo = ({ companyId, companyName }: CompanyLinkedInInfoProps) => {
  return (
    <CompanyLinkedInScraping 
      companyId={companyId} 
      companyName={companyName} 
    />
  );
};
