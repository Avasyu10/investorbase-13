import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCompanyDetails } from "@/hooks/companyHooks/useCompanyDetails";
import { ResearchSection } from "@/components/research/ResearchSection";
import { AssessmentPoints } from "@/components/assessment/AssessmentPoints";
import { SectionDisplay } from "@/components/sections/SectionDisplay";
import { MarketInsightsDisplay } from "@/components/market-insights/MarketInsightsDisplay";
import { NewsHighlightsDisplay } from "@/components/news-highlights/NewsHighlightsDisplay";
import { ResearchWithPerplexity } from "@/components/research/ResearchWithPerplexity";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface CompanyDetailsProps {}

export function CompanyDetails({}: CompanyDetailsProps) {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);

  const { company, isLoading, error, refetch } = useCompanyDetails(companyId!);

  useEffect(() => {
    if (error) {
      toast({
        title: "Error fetching company details",
        description: error,
        variant: "destructive",
      });
    }
  }, [error]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (companyId) {
        const { error } = await supabase
          .from("companies")
          .delete()
          .eq("id", companyId);

        if (error) {
          console.error("Error deleting company:", error);
          toast({
            title: "Error deleting company",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Company deleted",
            description: "Company has been successfully deleted.",
          });
          navigate("/dashboard");
        }
      }
    } catch (err: any) {
      console.error("Unexpected error deleting company:", err);
      toast({
        title: "Unexpected error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <div className="animate-pulse flex flex-col items-center space-y-4">
          <div className="h-8 w-64 bg-secondary rounded"></div>
          <div className="h-4 w-48 bg-secondary rounded"></div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">
            No company found with this id.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{company.name}</h1>
          <p className="text-muted-foreground">
            View detailed information and analysis for {company.name}
          </p>
        </div>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => refetch()}>
            Refresh
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete
                  this company and all associated data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="overallScore">Overall Score</Label>
            <Input
              type="text"
              id="overallScore"
              value={company.overall_score?.toString() || "N/A"}
              readOnly
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="source">Source</Label>
            <Input type="text" id="source" value={company.source || "N/A"} readOnly />
          </div>
        </CardContent>
      </Card>

      <AssessmentPoints company={company} />

      <ResearchWithPerplexity companyId={company.id} />

      <ResearchSection company={company} />

      <MarketInsightsDisplay company={company} />

      <NewsHighlightsDisplay company={company} />

      <SectionDisplay company={company} />
    </div>
  );
}

export default CompanyDetails;
