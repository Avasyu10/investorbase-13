
// This fix addresses the TypeScript error with the company id
// where a number was being passed to a parameter expecting a string
import { useParams } from "react-router-dom";
import { useCompanyDetails } from "@/hooks/companyHooks/useCompanyDetails";
import { CompanyInfoCard } from "./CompanyInfoCard";
import { SectionCard } from "./SectionCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ScoreAssessment } from "./ScoreAssessment";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { LatestResearch } from "./LatestResearch";

const CompanyDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { company, sections, isLoading, fetchSections } = useCompanyDetails(id || "");
  const [activeTab, setActiveTab] = useState("product");
  
  useEffect(() => {
    if (company && company.id) {
      fetchSections(company.id.toString());
    }
  }, [company, fetchSections]);

  // Filter sections by type
  const getFilteredSections = (type: string) => {
    return sections.filter(section => 
      section.type.toLowerCase() === type.toLowerCase()
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container mx-auto p-4">
        <p className="text-center mt-8 text-lg">Company not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-6">{company.name}</h1>
            
            <CompanyInfoCard company={company} />
            
            <div className="mt-6">
              <ScoreAssessment company={company} />
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="grid grid-cols-5">
              <TabsTrigger value="product">Product</TabsTrigger>
              <TabsTrigger value="market">Market</TabsTrigger>
              <TabsTrigger value="business">Business</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
              <TabsTrigger value="overall">Overall</TabsTrigger>
            </TabsList>
            
            <TabsContent value="product" className="mt-6">
              <div className="grid grid-cols-1 gap-6">
                {getFilteredSections('product').map(section => (
                  <SectionCard key={section.id} section={section} companyId={company.id.toString()} />
                ))}
                {getFilteredSections('product').length === 0 && (
                  <p className="text-center p-6 text-muted-foreground">No product sections available.</p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="market" className="mt-6">
              <div className="grid grid-cols-1 gap-6">
                {getFilteredSections('market').map(section => (
                  <SectionCard key={section.id} section={section} companyId={company.id.toString()} />
                ))}
                {getFilteredSections('market').length === 0 && (
                  <p className="text-center p-6 text-muted-foreground">No market sections available.</p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="business" className="mt-6">
              <div className="grid grid-cols-1 gap-6">
                {getFilteredSections('business').map(section => (
                  <SectionCard key={section.id} section={section} companyId={company.id.toString()} />
                ))}
                {getFilteredSections('business').length === 0 && (
                  <p className="text-center p-6 text-muted-foreground">No business sections available.</p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="team" className="mt-6">
              <div className="grid grid-cols-1 gap-6">
                {getFilteredSections('team').map(section => (
                  <SectionCard key={section.id} section={section} companyId={company.id.toString()} />
                ))}
                {getFilteredSections('team').length === 0 && (
                  <p className="text-center p-6 text-muted-foreground">No team sections available.</p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="overall" className="mt-6">
              <div className="grid grid-cols-1 gap-6">
                {getFilteredSections('overall').map(section => (
                  <SectionCard key={section.id} section={section} companyId={company.id.toString()} />
                ))}
                {getFilteredSections('overall').length === 0 && (
                  <p className="text-center p-6 text-muted-foreground">No overall sections available.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="md:col-span-1">
          <LatestResearch companyId={company.id.toString()} />
        </div>
      </div>
    </div>
  );
};

export default CompanyDetails;
