
import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const SectionDetails = () => {
  const { companyId, sectionId } = useParams();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Section Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Viewing section {sectionId} for company {companyId}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SectionDetails;
