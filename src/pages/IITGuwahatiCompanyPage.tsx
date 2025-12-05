import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2, FileText, Mail, Phone, Linkedin, Globe, TrendingUp, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useIITGuwahatiCompanyDetails } from "@/hooks/useIITGuwahatiCompanyDetails";
import { IITGuwahatiOverallAssessment } from "@/components/iitguwahati/IITGuwahatiOverallAssessment";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IITGuwahatiSectionMetrics } from "@/components/iitguwahati/IITGuwahatiSectionMetrics";
import { IITGuwahatiCompanyInfoDialog } from "@/components/iitguwahati/IITGuwahatiCompanyInfoDialog";
import { useState } from "react";

const IITGuwahatiCompanyPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: company, isLoading } = useIITGuwahatiCompanyDetails(id || "");
  const [formResponsesOpen, setFormResponsesOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Submission Not Found
          </h2>
          <p className="text-muted-foreground mb-6">
            The submission you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => navigate('/iitguwahati-dashboard')}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  const submission = company._rawSubmission;

  return (
    <div className="min-h-screen">
      <div className="w-full px-4 pt-0 pb-6 animate-fade-in">
        {/* Back Button and Form Responses Button */}
        <div className="container mx-auto mb-6 flex items-center justify-between">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate("/iitguwahati-dashboard")} 
            className="flex items-center"
          >
            <ChevronLeft className="mr-1" /> Back to Dashboard
          </Button>
          
          <div className="flex flex-col items-end gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setFormResponsesOpen(true)}
              className="flex items-center bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-600"
            >
              <FileText className="mr-2 h-4 w-4" />
              View Form Responses
            </Button>
            <IITGuwahatiCompanyInfoDialog 
              companyName={company.name} 
              submissionId={company.id} 
            />
          </div>
        </div>

        {/* Company Overview */}
        <div className="w-full mb-8">
          <div className="container mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">{company.name}</h3>
            </div>
            
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Founder</p>
                    <p className="font-medium">{company.founder_name || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Domain</p>
                    <p className="font-medium">{submission?.domain_and_problem?.split('.')[0] || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Funding Sought</p>
                    <p className="font-medium">{submission?.total_funding_sought || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Contact</p>
                    <div className="flex items-center gap-2">
                      {company.email && (
                        <a href={`mailto:${company.email}`} className="text-primary hover:underline">
                          <Mail className="h-4 w-4" />
                        </a>
                      )}
                      {company.phone_number && (
                        <a href={`tel:${company.phone_number}`} className="text-primary hover:underline">
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                      {company.linkedin_url && (
                        <a href={company.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          <Linkedin className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                
                {company.introduction && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-1">Summary</p>
                    <p className="text-foreground">{company.introduction}</p>
                  </div>
                )}
                
                {/* Website, Stage, Industry row */}
                <div className="mt-4 pt-4 border-t flex flex-wrap gap-8">
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Website/Link</p>
                      <p className="text-sm text-muted-foreground">
                        {company.website ? (
                          <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {company.website}
                          </a>
                        ) : 'Not available'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Stage</p>
                      <p className="text-sm text-muted-foreground">
                        {submission?.product_type_and_stage || 'Early Stage'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Industry</p>
                      <p className="text-sm text-muted-foreground">
                        {submission?.domain_and_problem?.split(' ')[0] || 'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="container mx-auto">
          {/* Overall Assessment with AI Evaluation */}
          <IITGuwahatiOverallAssessment 
            submissionId={company.id}
            companyName={company.name} 
          />

          {/* Section Metrics with AI Evaluation */}
          <IITGuwahatiSectionMetrics submissionId={company.id} />
        </div>
        
        {/* Form Responses Dialog */}
        {submission && (
          <Dialog open={formResponsesOpen} onOpenChange={setFormResponsesOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-background border">
              <DialogHeader className="border-b pb-4">
                <DialogTitle className="flex items-center gap-3 text-xl">
                  <FileText className="h-6 w-6 text-amber-500" />
                  IIT Guwahati Submission Details
                </DialogTitle>
              </DialogHeader>
              
              <ScrollArea className="h-[75vh] pr-4">
                <div className="space-y-6 py-4">
                  {/* Company ID and Date */}
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-primary">{company.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Submitted: {new Date(submission.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Domain & Problem */}
                  {submission.domain_and_problem && (
                    <div className="space-y-2 border-l-4 border-amber-400 pl-4">
                      <h4 className="font-semibold">Domain & Problem</h4>
                      <p className="text-muted-foreground">{submission.domain_and_problem}</p>
                    </div>
                  )}

                  {/* Target Market Size */}
                  {submission.target_market_size && (
                    <div className="space-y-2 border-l-4 border-blue-400 pl-4">
                      <h4 className="font-semibold">Target Market Size (TAM/SAM/SOM)</h4>
                      <p className="text-muted-foreground">{submission.target_market_size}</p>
                    </div>
                  )}

                  {/* Unique Proposition */}
                  {submission.unique_proposition && (
                    <div className="space-y-2 border-l-4 border-green-400 pl-4">
                      <h4 className="font-semibold">Unique Proposition</h4>
                      <p className="text-muted-foreground">{submission.unique_proposition}</p>
                    </div>
                  )}

                  {/* Product Type & Stage */}
                  {submission.product_type_and_stage && (
                    <div className="space-y-2 border-l-4 border-purple-400 pl-4">
                      <h4 className="font-semibold">Product Type & Development Stage</h4>
                      <p className="text-muted-foreground">{submission.product_type_and_stage}</p>
                    </div>
                  )}

                  {/* Primary Revenue Model */}
                  {submission.primary_revenue_model && (
                    <div className="space-y-2 border-l-4 border-indigo-400 pl-4">
                      <h4 className="font-semibold">Primary Revenue Model</h4>
                      <p className="text-muted-foreground">{submission.primary_revenue_model}</p>
                    </div>
                  )}

                  {/* LTV/CAC Ratio */}
                  {submission.ltv_cac_ratio && (
                    <div className="space-y-2 border-l-4 border-pink-400 pl-4">
                      <h4 className="font-semibold">LTV/CAC Ratio</h4>
                      <p className="text-muted-foreground">{submission.ltv_cac_ratio}</p>
                    </div>
                  )}

                  {/* Total Funding Sought */}
                  {submission.total_funding_sought && (
                    <div className="space-y-2 border-l-4 border-orange-400 pl-4">
                      <h4 className="font-semibold">Total Funding Sought</h4>
                      <p className="text-muted-foreground">{submission.total_funding_sought}</p>
                    </div>
                  )}

                  {/* Key Traction Metric */}
                  {submission.key_traction_metric && (
                    <div className="space-y-2 border-l-4 border-teal-400 pl-4">
                      <h4 className="font-semibold">Key Traction Metrics</h4>
                      <p className="text-muted-foreground">{submission.key_traction_metric}</p>
                    </div>
                  )}

                  {/* IP/Moat Status */}
                  {submission.ip_moat_status && (
                    <div className="space-y-2 border-l-4 border-cyan-400 pl-4">
                      <h4 className="font-semibold">IP/Moat Status</h4>
                      <p className="text-muted-foreground">{submission.ip_moat_status}</p>
                    </div>
                  )}

                  {/* 12-Month Roadmap */}
                  {submission.twelve_month_roadmap && (
                    <div className="space-y-2 border-l-4 border-lime-400 pl-4">
                      <h4 className="font-semibold">12-Month Roadmap</h4>
                      <p className="text-muted-foreground">{submission.twelve_month_roadmap}</p>
                    </div>
                  )}

                  {/* Contact Information */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <h3 className="font-semibold mb-1 text-sm">Founder</h3>
                      <p className="text-sm text-muted-foreground">{submission.founder_name || 'Not provided'}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-sm">Email</h3>
                      <p className="text-sm text-muted-foreground">{submission.submitter_email}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-sm">Phone</h3>
                      <p className="text-sm text-muted-foreground">{submission.phone_number || 'Not provided'}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-sm">LinkedIn</h3>
                      <p className="text-sm text-muted-foreground">
                        {submission.linkedin_url ? (
                          <a href={submission.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            View Profile
                          </a>
                        ) : 'Not provided'}
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default IITGuwahatiCompanyPage;
