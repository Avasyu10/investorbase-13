
import { useState } from "react";
import { ArrowUpRight, ChevronDown, ChevronUp, BadgeCheck, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/types/company";

interface CompanyDetailsProps {
  company: any;
  sections: Section[];
}

export function CompanyDetails({ company, sections }: CompanyDetailsProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  // Toggle a section's expanded state
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };
  
  // Format the score for display
  const formatScore = (score: number | string): string => {
    if (typeof score === 'number') {
      return score.toFixed(1);
    }
    return String(score);
  };

  // Get a CSS class based on the score
  const getScoreClass = (score: number | string): string => {
    const numericScore = typeof score === 'number' ? score : parseFloat(String(score));
    
    if (numericScore >= 4.5) return "bg-green-500 text-white";
    if (numericScore >= 3.5) return "bg-green-400 text-white";
    if (numericScore >= 2.5) return "bg-yellow-400 text-black";
    if (numericScore >= 1.5) return "bg-amber-500 text-white";
    return "bg-red-500 text-white";
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Detailed Analysis</h2>
      
      <div className="space-y-4">
        {sections.length === 0 ? (
          <Card>
            <CardContent className="py-6">
              <p className="text-muted-foreground text-center">No detailed analysis available for this company yet.</p>
            </CardContent>
          </Card>
        ) : (
          sections.map((section) => (
            <Collapsible
              key={section.id}
              open={expandedSections[section.id] || false}
              className="border rounded-lg shadow-sm bg-card"
            >
              <div className="flex justify-between items-center p-4">
                <div className="flex-1">
                  <div className="flex items-center">
                    <h3 className="text-lg font-semibold mr-2">{section.title}</h3>
                    <Badge className={`${getScoreClass(section.score)}`}>
                      {formatScore(section.score)}
                    </Badge>
                  </div>
                </div>
                
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => toggleSection(section.id)}
                    className="p-1"
                  >
                    {expandedSections[section.id] ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
              
              <CollapsibleContent>
                <Separator />
                <div className="p-4">
                  <div className="text-muted-foreground mb-4">
                    {section.description || "No description available."}
                  </div>
                  
                  <SectionDetailsList 
                    sectionId={section.id}
                    companyId={company.id}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))
        )}
      </div>
    </div>
  );
}

interface SectionDetailsListProps {
  sectionId: string;
  companyId: string;
}

function SectionDetailsList({ sectionId, companyId }: SectionDetailsListProps) {
  const [details, setDetails] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch section details from the database
  useState(() => {
    const fetchSectionDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const { data, error } = await fetch(`/api/sections/${sectionId}/details`).then(res => res.json());
        
        if (error) throw new Error(error.message);
        
        setDetails(data || []);
      } catch (err: any) {
        console.error("Error fetching section details:", err);
        setError(err.message || "Failed to load section details");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSectionDetails();
  });
  
  // Filter details by type
  const strengths = details.filter(detail => detail.detail_type === 'strength');
  const weaknesses = details.filter(detail => detail.detail_type === 'weakness');
  
  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-2">Loading details...</p>;
  }
  
  if (error) {
    return <p className="text-sm text-red-500 py-2">Error: {error}</p>;
  }
  
  if (details.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">No details available.</p>;
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <h4 className="font-medium mb-2 flex items-center">
          <BadgeCheck className="mr-1 h-4 w-4 text-green-500" />
          Strengths
        </h4>
        <ul className="list-disc pl-5 space-y-1">
          {strengths.length > 0 ? (
            strengths.map((strength, index) => (
              <li key={`strength-${index}`} className="text-sm">
                {strength.content}
              </li>
            ))
          ) : (
            <li className="text-sm text-muted-foreground">No strengths identified.</li>
          )}
        </ul>
      </div>
      
      <div>
        <h4 className="font-medium mb-2 flex items-center">
          <XCircle className="mr-1 h-4 w-4 text-red-500" />
          Weaknesses
        </h4>
        <ul className="list-disc pl-5 space-y-1">
          {weaknesses.length > 0 ? (
            weaknesses.map((weakness, index) => (
              <li key={`weakness-${index}`} className="text-sm">
                {weakness.content}
              </li>
            ))
          ) : (
            <li className="text-sm text-muted-foreground">No weaknesses identified.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
