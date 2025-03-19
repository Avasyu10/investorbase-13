
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const ReportDetails = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Button 
        variant="ghost" 
        className="mb-6" 
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      
      <h1 className="text-3xl font-bold mb-6">Report Details</h1>
      
      <div className="bg-card p-6 rounded-lg border">
        <p className="text-lg">Report ID: {reportId}</p>
        <p className="text-muted-foreground mt-2">
          Report details would be displayed here.
        </p>
      </div>
    </div>
  );
};

export default ReportDetails;
