
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileUp } from 'lucide-react';

export const Reports = () => {
  const navigate = useNavigate();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Reports</h1>
        <Button onClick={() => navigate('/upload')}>
          <FileUp className="mr-2 h-4 w-4" />
          Upload New Report
        </Button>
      </div>
      
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">
          No reports found. Upload a new pitch deck to get started.
        </p>
      </div>
    </div>
  );
};

export default Reports;
