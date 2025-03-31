import { useParams, useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { SectionCard } from "./SectionCard";
import { ScoreAssessment } from "./ScoreAssessment";
import { CompanyInfoCard } from "./CompanyInfoCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, BarChart2, Files, ChevronLeft, Briefcase, BotMessageSquare, Send, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useCompanyDetails } from "@/hooks/companyHooks/useCompanyDetails";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ORDERED_SECTIONS } from "@/lib/constants";

const CompanyDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { company, isLoading } = useCompanyDetails(id || "");
  const [companyInfo, setCompanyInfo] = useState({
    website: "",
    stage: "",
    industry: "",
    founderLinkedIns: [] as string[],
    introduction: ""
  });
  const [infoLoading, setInfoLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Array<{content: string, role: 'user' | 'assistant'}>>([
    { content: "Hello! I'm your AI assistant. How can I help you analyze this company?", role: 'assistant' }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');

  useEffect(() => {
    async function fetchCompanyInfo() {
      if (!company || !company.id) return;
      
      try {
        const { data: companyDetails } = await supabase
          .from('company_details')
          .select('website, stage, industry, introduction')
          .eq('company_id', company.id.toString())
          .maybeSingle();
        
        if (companyDetails) {
          setCompanyInfo({
            website: companyDetails.website || "",
            stage: companyDetails.stage || "Not specified",
            industry: companyDetails.industry || "Not specified",
            founderLinkedIns: [],
            introduction: companyDetails.introduction || "No description available."
          });
          setInfoLoading(false);
          return;
        }
        
        if (company.reportId) {
          const { data: report } = await supabase
            .from('reports')
            .select('is_public_submission, submission_form_id')
            .eq('id', company.reportId)
            .single();
          
          if (report?.is_public_submission) {
            const { data: submission } = await supabase
              .from('public_form_submissions')
              .select('website_url, company_stage, industry, founder_linkedin_profiles, description')
              .eq('report_id', company.reportId)
              .single();
            
            if (submission) {
              setCompanyInfo({
                website: submission.website_url || "",
                stage: submission.company_stage || "Not specified",
                industry: submission.industry || "Not specified",
                founderLinkedIns: submission.founder_linkedin_profiles || [],
                introduction: submission.description || "No description available."
              });
            }
          } else {
            const { data: sections } = await supabase
              .from('sections')
              .select('title, description')
              .eq('company_id', id as string);
            
            let intro = "";
            let industry = "Not specified";
            let stage = "Not specified";
            
            sections?.forEach(section => {
              const title = section.title.toLowerCase();
              const description = section.description || "";
              
              if (title.includes('company') || title.includes('introduction') || title.includes('about')) {
                intro = description;
              }
              
              if (description.toLowerCase().includes('industry')) {
                const industryMatch = description.match(/industry.{0,5}:?\s*([^\.]+)/i);
                if (industryMatch && industryMatch[1]) {
                  industry = industryMatch[1].trim();
                }
              }
              
              if (description.toLowerCase().includes('stage')) {
                const stageMatch = description.match(/stage.{0,5}:?\s*([^\.]+)/i);
                if (stageMatch && stageMatch[1]) {
                  stage = stageMatch[1].trim();
                }
              }
            });
            
            setCompanyInfo({
              website: "",
              stage,
              industry,
              founderLinkedIns: [],
              introduction: intro || "No detailed information available for this company."
            });
          }
        }
      } catch (error) {
        console.error("Error fetching company information:", error);
      } finally {
        setInfoLoading(false);
      }
    }
    
    if (company) {
      fetchCompanyInfo();
    }
  }, [company, id]);

  const handleSectionClick = (sectionId: number | string) => {
    navigate(`/company/${id}/section/${sectionId.toString()}`);
  };

  const navigateToReport = () => {
    if (company?.reportId) {
      console.log('Navigating to report:', company.reportId);
      navigate(`/reports/${company.reportId}`);
    } else {
      toast({
        title: "No report available",
        description: "This company doesn't have an associated report",
        variant: "destructive"
      });
    }
  };

  const handleBack = () => {
    navigate("/dashboard");
  };

  const navigateToSupplementaryMaterials = () => {
    navigate(`/company/${id}/supplementary`);
  };
  
  const handleChatbotClick = () => {
    setShowChat(!showChat);
  };

  const handleSendMessage = () => {
    if (!currentMessage.trim()) return;
    
    setMessages([...messages, { content: currentMessage, role: 'user' }]);
    
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        content: `I'll help you analyze ${company?.name || 'this company'}. What specific aspects would you like to know more about?`, 
        role: 'assistant' 
      }]);
    }, 1000);
    
    setCurrentMessage('');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-4">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-secondary rounded w-1/3"></div>
          <div className="h-6 bg-secondary rounded w-1/2"></div>
          
          <Card className="mb-8 border-0 shadow-subtle">
            <CardContent className="p-6">
              <div className="h-6 bg-secondary rounded w-1/2 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-secondary rounded w-full"></div>
                <div className="h-4 bg-secondary rounded w-full"></div>
                <div className="h-4 bg-secondary rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
          
          <div className="h-6 bg-secondary rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-40 bg-secondary rounded shadow-subtle"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container mx-auto px-4 py-4">
        <p>Company not found</p>
      </div>
    );
  }

  const formattedScore = company ? parseFloat(company.overallScore.toFixed(1)) : 0;
  
  const progressPercentage = formattedScore * 20;

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return "score-excellent";
    if (score >= 3.5) return "score-good";
    if (score >= 2.5) return "score-average";
    if (score >= 1.5) return "score-poor";
    return "score-critical";
  };

  const sortedSections = [...company?.sections || []].sort((a, b) => {
    const indexA = ORDERED_SECTIONS.indexOf(a.type);
    const indexB = ORDERED_SECTIONS.indexOf(b.type);
    
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    
    return 0;
  });

  return (
    <div className="flex w-full h-screen overflow-hidden">
      <div className={`${showChat ? 'w-1/2 border-r border-border' : 'w-full'} h-screen overflow-auto`}>
        <div className="container mx-auto px-3 sm:px-4 pt-0 pb-4 sm:pb-8 animate-fade-in">
          <div className="mb-7 sm:mb-9">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBack}
                  className="flex items-center"
                >
                  <ChevronLeft className="mr-1" /> Back
                </Button>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{company?.name}</h1>
              </div>
              <div className="flex items-center gap-4 mt-2 sm:mt-0">
                {company?.reportId && (
                  <Button 
                    onClick={navigateToReport} 
                    variant="outline" 
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    View Deck
                  </Button>
                )}
                <Button 
                  onClick={navigateToSupplementaryMaterials} 
                  variant="outline" 
                  className="flex items-center gap-2"
                >
                  <Files className="h-4 w-4" />
                  Supplementary Material
                </Button>
                <Button
                  onClick={handleChatbotClick}
                  variant={showChat ? "secondary" : "default"}
                  className="flex items-center gap-2"
                >
                  <BotMessageSquare className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="mt-6 mb-8">
              <CompanyInfoCard 
                website={companyInfo.website}
                stage={companyInfo.stage}
                industry={companyInfo.industry}
                founderLinkedIns={companyInfo.founderLinkedIns}
                introduction={companyInfo.introduction}
              />
            </div>
            
            <div className="mb-5">
              <Progress 
                value={progressPercentage} 
                className={`h-2 ${getScoreColor(company.overallScore)}`} 
              />
            </div>

            <ScoreAssessment company={company} />
          </div>
          
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-5 flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary" />
            Section Metrics
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
            {sortedSections.map((section) => (
              <SectionCard 
                key={section.id} 
                section={section} 
                onClick={() => handleSectionClick(section.id)} 
              />
            ))}
          </div>

          <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-5 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Company Information
          </h2>
          <Card className="mb-8 border-0 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">About {company?.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {companyInfo.introduction || "No detailed description available."}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h3 className="font-medium mb-1">Industry</h3>
                    <p className="text-sm text-muted-foreground">{companyInfo.industry || "Not specified"}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-1">Stage</h3>
                    <p className="text-sm text-muted-foreground">{companyInfo.stage || "Not specified"}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-1">Website</h3>
                    {companyInfo.website ? (
                      <a 
                        href={companyInfo.website.startsWith('http') ? companyInfo.website : `https://${companyInfo.website}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {companyInfo.website.replace(/^https?:\/\/(www\.)?/, '')}
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not available</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {showChat && (
        <div className="w-1/2 h-screen flex flex-col border-l border-border bg-background shadow-card">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-lg flex items-center gap-2">
                InsightMaster by InvestorBase
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Ask questions about {company?.name} to get detailed insights
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleChatbotClick} 
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex-1 overflow-auto p-4 bg-secondary/10">
            <div className="flex flex-col space-y-4">
              {messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground ml-4' 
                        : 'bg-muted text-foreground mr-4'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask about this company..."
                className="flex-1 p-2 rounded-md border border-input bg-background"
              />
              <Button onClick={handleSendMessage} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Press Enter to send your message
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyDetails;
