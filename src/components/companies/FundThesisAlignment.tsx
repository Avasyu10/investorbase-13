
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, ExternalLink } from "lucide-react";
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface FundThesisAlignmentProps {
  companyId: string;
  companyName: string;
}

export function FundThesisAlignment({ companyId, companyName }: FundThesisAlignmentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [assessmentPoints, setAssessmentPoints] = useState<string[]>([
    "The global remote patient monitoring market is projected to reach $175.2 billion by 2030, growing at a CAGR of 17.1%, presenting a significant opportunity for PulseGuard.",
    "PulseGuard's 30% reduction in hospital readmissions from pilot programs is a strong proof point, but more data is needed to validate the results.",
    "The company's business model is based on subscription-based revenue, data analytics services, and value-added partnerships, providing multiple revenue streams.",
    "The team has a strong combination of clinical, technical, and operational expertise, increasing the likelihood of success.",
    "PulseGuard is seeking $2.5M in seed capital to accelerate product development, expand go-to-market initiatives, and ensure regulatory compliance, a reasonable ask for a seed-stage company."
  ]);

  const handleViewThesis = () => {
    // In a real implementation, this would navigate to or open the fund thesis document
    toast({
      title: "Fund Thesis Document",
      description: "Opening your fund thesis document...",
    });
    
    // For demo purposes, let's just log to console
    console.log("Viewing fund thesis document");
  };

  return (
    <Card className="shadow-md border bg-card overflow-hidden mb-8">
      <CardHeader className="bg-muted/50 border-b pb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-[#5D4AFF]" />
          <CardTitle className="text-xl font-semibold">Fund Thesis Alignment</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="pt-5 px-4 sm:px-6">
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Assess how well {companyName} aligns with your investment thesis and strategic focus areas. 
            Review your fund thesis document to compare against this opportunity.
          </p>
          
          <div className="space-y-4 mt-4">
            {assessmentPoints.map((point, index) => (
              <div 
                key={index} 
                className="flex items-start gap-3 p-4 rounded-lg border border-[#5D4AFF]/20 bg-[#5D4AFF]/5"
              >
                <Lightbulb className="h-5 w-5 mt-0.5 text-[#5D4AFF] shrink-0" />
                <span className="text-sm leading-relaxed">{point}</span>
              </div>
            ))}
          </div>
          
          <div className="pt-2">
            <Button 
              variant="outline" 
              className="flex items-center gap-2 text-[#5D4AFF]"
              onClick={handleViewThesis}
            >
              <span>View Your Fund Thesis</span>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
