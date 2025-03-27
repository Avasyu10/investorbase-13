
import { Building, Award, Users, ChevronRight, Globe, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface CompanyInfoCardProps {
  company: any;
  overallScore: string;
}

export function CompanyInfoCard({ company, overallScore }: CompanyInfoCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCompanyDetails = async () => {
      try {
        setIsLoading(true);
        
        if (!company?.id) return;
        
        const { data, error } = await supabase
          .from('company_details')
          .select('*')
          .eq('company_id', company.id)
          .maybeSingle();
          
        if (error) throw error;
        
        setCompanyDetails(data);
      } catch (error) {
        console.error("Error fetching company details:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCompanyDetails();
  }, [company?.id]);
  
  // Format the score for display
  const getScoreClass = () => {
    const score = parseFloat(overallScore);
    
    if (score >= 4.5) return "bg-green-500 text-white";
    if (score >= 3.5) return "bg-green-400 text-white";
    if (score >= 2.5) return "bg-yellow-400 text-black";
    if (score >= 1.5) return "bg-amber-500 text-white";
    return "bg-red-500 text-white";
  };

  return (
    <Card className="shadow-md border bg-card overflow-hidden">
      <CardHeader className="bg-muted/50 border-b pb-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl font-semibold">Company Profile</CardTitle>
          </div>
          
          <Badge className={`${getScoreClass()} h-6 text-xs font-semibold`}>
            {overallScore}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-bold">{company.name}</h3>
          
          {companyDetails?.introduction && (
            <p className="text-sm text-muted-foreground">
              {companyDetails.introduction}
            </p>
          )}
        </div>
        
        {!isLoading && (
          <div className="space-y-3 pt-1">
            {companyDetails?.industry && (
              <div className="flex items-start">
                <Award className="h-4 w-4 text-muted-foreground mr-2 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Industry</p>
                  <p className="text-sm font-medium">{companyDetails.industry}</p>
                </div>
              </div>
            )}
            
            {companyDetails?.stage && (
              <div className="flex items-start">
                <Users className="h-4 w-4 text-muted-foreground mr-2 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Stage</p>
                  <p className="text-sm font-medium">{companyDetails.stage}</p>
                </div>
              </div>
            )}
            
            {companyDetails?.website && (
              <div className="flex items-start">
                <Globe className="h-4 w-4 text-muted-foreground mr-2 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Website</p>
                  <a 
                    href={companyDetails.website.startsWith('http') ? companyDetails.website : `https://${companyDetails.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-500 hover:underline truncate block max-w-[180px]"
                  >
                    {companyDetails.website.replace(/^https?:\/\/(www\.)?/, '')}
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
        
        <Collapsible open={isExpanded} className="w-full">
          <CollapsibleContent className="pt-2">
            <div className="space-y-3">
              {company.assessment_points && company.assessment_points.length > 0 && (
                <>
                  <Separator className="my-2" />
                  <div>
                    <h4 className="text-sm font-medium mb-2">Key Assessment Points</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {company.assessment_points.map((point: string, index: number) => (
                        <li key={index} className="text-xs text-muted-foreground">
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
      
      <CardFooter className="flex justify-between px-4 py-2 bg-muted/30 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              Show More
            </>
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/companies`)}
          className="text-xs"
        >
          All Companies
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  );
}
