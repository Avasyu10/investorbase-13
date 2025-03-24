
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Lightbulb, ExternalLink } from "lucide-react";
import { Button } from "../ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadVCDocument } from "@/lib/supabase/documents";
import { toast } from "@/hooks/use-toast";

interface FundThesisAlignmentProps {
  companyName: string;
}

export function FundThesisAlignment({ companyName }: FundThesisAlignmentProps) {
  const [hasFundThesis, setHasFundThesis] = useState<boolean>(false);
  const [fundThesisUrl, setFundThesisUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function checkFundThesis() {
      try {
        setIsLoading(true);
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsLoading(false);
          return;
        }
        
        setUserId(user.id);
        
        // Check if the user has a VC profile with a fund thesis
        const { data: vcProfile, error } = await supabase
          .from('vc_profiles')
          .select('fund_thesis_url')
          .eq('id', user.id)
          .maybeSingle();
          
        if (error) {
          console.error("Error fetching VC profile:", error);
          setIsLoading(false);
          return;
        }
        
        if (vcProfile && vcProfile.fund_thesis_url) {
          setHasFundThesis(true);
          setFundThesisUrl(vcProfile.fund_thesis_url);
        }
      } catch (error) {
        console.error("Error checking fund thesis:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    checkFundThesis();
  }, []);
  
  const handleViewThesis = async () => {
    if (!fundThesisUrl || !userId) return;
    
    try {
      // Try to get the document
      const pdfBlob = await downloadVCDocument(fundThesisUrl, userId);
      
      if (!pdfBlob) {
        toast({
          title: "Error",
          description: "Could not retrieve the fund thesis document.",
          variant: "destructive",
        });
        return;
      }
      
      // Create URL and open in new tab
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
    } catch (error) {
      console.error("Error viewing fund thesis:", error);
      toast({
        title: "Error",
        description: "Failed to open the fund thesis document.",
        variant: "destructive",
      });
    }
  };
  
  if (isLoading) {
    return (
      <Card className="mb-6 border-0 shadow-subtle">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10 w-32 mt-2" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Don't render anything if user doesn't have a fund thesis
  if (!hasFundThesis) {
    return null;
  }
  
  return (
    <Card className="mb-6 border-0 shadow-subtle bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-indigo-500" />
          Fund Thesis Alignment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          Assess how well {companyName} aligns with your investment thesis and strategic focus areas.
          Review your fund thesis document to compare against this opportunity.
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2"
          onClick={handleViewThesis}
        >
          <FileText className="h-4 w-4" />
          View Your Fund Thesis
          <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
