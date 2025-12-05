/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ExternalLink, Mail, Phone, Linkedin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface IITGuwahatiSubmission {
  id: string;
  created_at: string;
  startup_name: string;
  founder_name: string | null;
  submitter_email: string;
  linkedin_url: string | null;
  phone_number: string | null;
  domain_and_problem: string | null;
  target_market_size: string | null;
  unique_proposition: string | null;
  product_type_and_stage: string | null;
  primary_revenue_model: string | null;
  ltv_cac_ratio: string | null;
  total_funding_sought: string | null;
  key_traction_metric: string | null;
  ip_moat_status: string | null;
  twelve_month_roadmap: string | null;
  analysis_status: string | null;
  analysis_result: any;
}

const IITGuwahatiCompanyPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submission, setSubmission] = useState<IITGuwahatiSubmission | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSubmission();
  }, [id]);

  const fetchSubmission = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("iitguwahati_form_submissions")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      setSubmission(data);
    } catch (error) {
      console.error("Error fetching submission:", error);
      toast({
        title: "Error",
        description: "Failed to load submission details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0c0e18] flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-[#0c0e18] flex items-center justify-center">
        <p className="text-gray-400">Submission not found</p>
      </div>
    );
  }

  const sectionClass = "bg-[#111422] border border-[#23262F] rounded-lg";

  return (
    <div className="min-h-screen bg-[#0c0e18]">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/iitguwahati-dashboard")}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">{submission.startup_name}</h1>
              <p className="text-gray-400 mt-1">
                Submitted on {new Date(submission.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Badge className={
            submission.analysis_status === 'completed' ? 'bg-green-100 text-green-700' :
            submission.analysis_status === 'analyzing' ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-700'
          }>
            {submission.analysis_status || 'Pending'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Problem Section */}
            <Card className={sectionClass}>
              <CardHeader>
                <CardTitle className="text-[rgb(245,168,61)]">I. The Problem</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm text-gray-400 mb-1">Domain & Problem</h4>
                  <p className="text-white">{submission.domain_and_problem || "Not provided"}</p>
                </div>
                <div>
                  <h4 className="text-sm text-gray-400 mb-1">Target Market Size</h4>
                  <p className="text-white">{submission.target_market_size || "Not provided"}</p>
                </div>
              </CardContent>
            </Card>

            {/* Solution Section */}
            <Card className={sectionClass}>
              <CardHeader>
                <CardTitle className="text-[rgb(245,168,61)]">II. The Solution</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <h4 className="text-sm text-gray-400 mb-1">Unique Proposition & Differentiator</h4>
                  <p className="text-white">{submission.unique_proposition || "Not provided"}</p>
                </div>
              </CardContent>
            </Card>

            {/* Product Section */}
            <Card className={sectionClass}>
              <CardHeader>
                <CardTitle className="text-[rgb(245,168,61)]">III. The Product</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <h4 className="text-sm text-gray-400 mb-1">Product Type & Stage</h4>
                  <p className="text-white">{submission.product_type_and_stage || "Not provided"}</p>
                </div>
              </CardContent>
            </Card>

            {/* Business Model Section */}
            <Card className={sectionClass}>
              <CardHeader>
                <CardTitle className="text-[rgb(245,168,61)]">IV. Business Model</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm text-gray-400 mb-1">Primary Revenue Model</h4>
                  <p className="text-white">{submission.primary_revenue_model || "Not provided"}</p>
                </div>
                <div>
                  <h4 className="text-sm text-gray-400 mb-1">LTV:CAC Ratio</h4>
                  <p className="text-white">{submission.ltv_cac_ratio || "Not provided"}</p>
                </div>
              </CardContent>
            </Card>

            {/* Finances Section */}
            <Card className={sectionClass}>
              <CardHeader>
                <CardTitle className="text-[rgb(245,168,61)]">V. Finances</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm text-gray-400 mb-1">Total Funding Sought</h4>
                  <p className="text-white text-lg font-semibold">{submission.total_funding_sought || "Not provided"}</p>
                </div>
                <div>
                  <h4 className="text-sm text-gray-400 mb-1">Key Traction Metric</h4>
                  <p className="text-white">{submission.key_traction_metric || "Not provided"}</p>
                </div>
              </CardContent>
            </Card>

            {/* IP Section */}
            <Card className={sectionClass}>
              <CardHeader>
                <CardTitle className="text-[rgb(245,168,61)]">VI. Patents & Legalities</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <h4 className="text-sm text-gray-400 mb-1">IP/Moat Status</h4>
                  <p className="text-white">{submission.ip_moat_status || "Not provided"}</p>
                </div>
              </CardContent>
            </Card>

            {/* Future Goals Section */}
            <Card className={sectionClass}>
              <CardHeader>
                <CardTitle className="text-[rgb(245,168,61)]">VII. Future Goals</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <h4 className="text-sm text-gray-400 mb-1">12-Month Roadmap Key Milestone</h4>
                  <p className="text-white">{submission.twelve_month_roadmap || "Not provided"}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Info */}
            <Card className={sectionClass}>
              <CardHeader>
                <CardTitle className="text-white">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm text-gray-400 mb-1">Founder</h4>
                  <p className="text-white font-medium">{submission.founder_name || "Not provided"}</p>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Mail className="h-4 w-4" />
                  <a href={`mailto:${submission.submitter_email}`} className="hover:text-white">
                    {submission.submitter_email}
                  </a>
                </div>
                {submission.phone_number && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Phone className="h-4 w-4" />
                    <span>{submission.phone_number}</span>
                  </div>
                )}
                {submission.linkedin_url && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Linkedin className="h-4 w-4" />
                    <a
                      href={submission.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white flex items-center gap-1"
                    >
                      LinkedIn <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className={sectionClass}>
              <CardHeader>
                <CardTitle className="text-white">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Stage</span>
                  <span className="text-white">{submission.product_type_and_stage?.split('/')[1]?.trim() || '-'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Revenue Model</span>
                  <span className="text-white">{submission.primary_revenue_model || '-'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Funding Ask</span>
                  <span className="text-[rgb(245,168,61)] font-semibold">{submission.total_funding_sought || '-'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">IP Status</span>
                  <span className="text-white">{submission.ip_moat_status || '-'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IITGuwahatiCompanyPage;
