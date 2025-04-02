
import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CompanyDetailPage = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="outline"
        size="sm"
        onClick={handleBack}
        className="mb-6 flex items-center"
      >
        <ChevronLeft className="mr-1" /> Back
      </Button>
      
      <h1 className="text-3xl font-bold mb-6">Company Details</h1>
      
      <div className="bg-card rounded-lg shadow p-6">
        <p className="text-muted-foreground">
          Detailed company information will be displayed here.
        </p>
      </div>
    </div>
  );
};

export default CompanyDetailPage;
