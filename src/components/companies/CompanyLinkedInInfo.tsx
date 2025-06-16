
import { CompanyLinkedInScraping } from './CompanyLinkedInScraping';

interface CompanyLinkedInInfoProps {
  companyId: string;
  companyName: string;
}

export const CompanyLinkedInInfo = ({ companyId, companyName }: CompanyLinkedInInfoProps) => {
  return (
    <div className="mb-8">
      <CompanyLinkedInScraping companyId={companyId} companyName={companyName} />
    </div>
  );
};
