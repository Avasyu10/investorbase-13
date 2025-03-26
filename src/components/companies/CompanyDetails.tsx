import React from 'react';
import { useParams } from 'react-router-dom';
import { CompanyDetails as CompanyDetailsComponent } from '@/components/companies/CompanyDetails';

interface CompanyDetailsProps {
  id: string | number; // Accept either string or number
}

export function CompanyDetails({ id }: CompanyDetailsProps) {
  // Convert id to string if it's a number
  const companyId = typeof id === 'number' ? id.toString() : id;
  
  // Now you can safely pass companyId as a string to your component
  return (
    <CompanyDetailsComponent id={companyId} />
  );
}
