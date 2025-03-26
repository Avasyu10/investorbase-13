import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { fetchCompanySections } from "@/api/company";
import { Section } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ScoreAssessment from "./ScoreAssessment";
import SectionCard from "./SectionCard";
import CompanyInfoCard from "./CompanyInfoCard";
import MarketResearch from "./MarketResearch";

interface CompanyDetailsProps {
  company: {
    id: string;
    name: string;
    reportId?: string;
  } | null;
  isLoading: boolean;
}

interface Params {
  companyId: string;
}

const CompanyDetails = ({ company, isLoading }: CompanyDetailsProps) => {
  const { companyId } = useParams<Params>();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (companyId) {
      setLoading(true);
      fetchCompanySections(companyId)
        .then((data) => {
          setSections(data);
        })
        .catch((error) => {
          console.error("Error fetching sections:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [companyId]);

  if (isLoading) {
    return <p>Loading...</p>;
  }

  if (!company) {
    return <p>Company not found</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
          <CardDescription>
            Basic details about the company.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CompanyInfoCard company={company} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Score Assessment</CardTitle>
          <CardDescription>
            Overall score and assessment of the company.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScoreAssessment companyId={company.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sections</CardTitle>
          <CardDescription>
            Detailed sections and information about the company.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading sections...</p>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {sections.map((section) => (
                <SectionCard key={section.id} section={section} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Make sure to pass a string ID to MarketResearch */}
      {company?.id && (
        <MarketResearch companyId={String(company.id)} />
      )}
    </div>
  );
};

export default CompanyDetails;
