import { useParams, useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { SectionCard } from "./SectionCard";
import { ScoreAssessment } from "./ScoreAssessment";
import { CompanyInfoCard } from "./CompanyInfoCard";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, BarChart2, ChevronLeft, Briefcase, BotMessageSquare, Send, X, ExternalLink, BookOpen, Globe, Newspaper, TrendingUp } from "lucide-react";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useCompanyDetails } from "@/hooks/companyHooks/useCompanyDetails";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ORDERED_SECTIONS } from "@/lib/constants";
import ReactMarkdown from 'react-markdown';
import { CompanyDetailed } from "@/lib/api/apiContract";
import FormResponsesDialog from "./FormResponsesDialog";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { InvestmentMemo } from "./InvestmentMemo";
import { VCMatchmakingDialog } from "./VCMatchmakingDialog";
import { MarketResearchDisplay } from "./MarketResearchDisplay";

const CompanyDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { company, isLoading } = useCompanyDetails(id || "");
  const { user } = useAuth();
  const { isVCAndBits, isIITBombayUser } = useProfile();
  const [companyInfo, setCompanyInfo] = useState({
    website: "",
    stage: "",
    industry: "",
    founderLinkedIns: [] as string[],
    introduction: ""
  });
  const [infoLoading, setInfoLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Array<{content: string, role: 'user' | 'assistant'}>>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isFromBarcForm, setIsFromBarcForm] = useState(false);

  // Convert Company to CompanyDetailed for components that need it
  const companyDetailed: CompanyDetailed | null = useMemo(() => {
    if (!company) return null;
    return {
      ...company,
      sections: company.sections || []
    };
  }, [company]);

  // Memoize sorted sections for better performance, filtering out slide notes for IIT Bombay users
  const sortedSections = useMemo(() => {
    if (!company?.sections) return [];
    
    let sectionsToShow = company.sections;
    
    // Filter sections based on user type
    if (isIITBombayUser) {
      // IIT Bombay users: show all sections except slide notes
      sectionsToShow = company.sections.filter(section => section.type !== 'SLIDE_NOTES');
    } else {
      // Non-IIT Bombay users: show slide notes and regular sections
      sectionsToShow = company.sections;
    }
    
    return [...sectionsToShow].sort((a, b) => {
      const indexA = ORDERED_SECTIONS.indexOf(a.type);
      const indexB = ORDERED_SECTIONS.indexOf(b.type);
      
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      return 0;
    });
  }, [company?.sections, isIITBombayUser]);

  // Separate slide notes section for non-IIT Bombay users
  const slideNotesSection = useMemo(() => {
    if (isIITBombayUser || !company?.sections) return null;
    
    return company.sections.find(section => section.type === 'SLIDE_NOTES');
  }, [company?.sections, isIITBombayUser]);

  // Check if this company is from a BARC form submission and enrich if needed
  useEffect(() => {
    const checkBarcFormOrigin = async () => {
      if (!id || !company) return;
      
      try {
        const { data: barcSubmission, error } = await supabase
          .from('barc_form_submissions')
          .select('id')
          .eq('company_id', id)
          .maybeSingle();

        if (!error && barcSubmission) {
          setIsFromBarcForm(true);
        }

        // Enrich company data if response_received is null or empty
        if (!company.response_received || company.response_received === 'null') {
          console.log('Enriching company data...');
          
          const { data: enrichData, error: enrichError } = await supabase.functions.invoke(
            'enrich-company-data',
            { body: { companyId: id } }
          );

          if (enrichError) {
            console.error('Error enriching company:', enrichError);
          } else {
            console.log('Company enriched successfully');
            // Refresh the company data
            queryClient.invalidateQueries({ queryKey: ['company', id] });
          }
        }
      } catch (error) {
        console.error('Error checking BARC form origin:', error);
      }
    };

    checkBarcFormOrigin();
  }, [id, company, queryClient]);

  // Use company data directly from useCompanyDetails if available
  useEffect(() => {
    if (company) {
      setCompanyInfo({
        website: company.website || "",
        stage: company.stage || "Not specified",
        industry: company.industry || "Not specified", 
        founderLinkedIns: [],
        introduction: company.introduction || "No description available."
      });
      setInfoLoading(false);
    }
  }, [company]);

  useEffect(() => {
    if (showChat && messages.length === 0 && companyInfo.introduction) {
      setMessages([{ 
        content: `Hello! I'm InsightMaster by InvestorBase. How can I help you analyze ${company?.name || 'this company'}?`, 
        role: 'assistant' 
      }]);
    }
  }, [showChat, messages.length, companyInfo.introduction, company?.name]);

  // Debug logging for sections
  useEffect(() => {
    if (company) {
      console.log('Company data loaded:', company);
      console.log('Company sections:', company.sections);
      console.log('Number of sections:', company.sections?.length || 0);
      console.log('Is IIT Bombay user:', isIITBombayUser);
    }
  }, [company, isIITBombayUser]);

  const handleSectionClick = useCallback((sectionId: number | string) => {
    navigate(`/company/${id}/section/${sectionId.toString()}`);
  }, [navigate, id]);

  const navigateToReport = useCallback(() => {
    if (company?.report_id) {
      navigate(`/reports/${company.report_id}`);
    } else {
      toast({
        title: "No report available",
        description: "This company doesn't have an associated report",
        variant: "destructive"
      });
    }
  }, [company?.report_id, navigate]);

  const handleBack = useCallback(() => {
    navigate("/dashboard");
  }, [navigate]);
  
  const handleChatbotClick = useCallback(() => {
    setShowChat(!showChat);
  }, [showChat]);

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isSendingMessage) return;
    
    const userMessage = { content: currentMessage, role: 'user' as const };
    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsSendingMessage(true);
    
    try {
      const conversationHistory = messages.map(msg => ({
        content: msg.content,
        role: msg.role
      }));
      
      conversationHistory.push(userMessage);
      
      const { data, error } = await supabase.functions.invoke('company-chatbot', {
        body: { 
          companyId: id,
          companyName: company?.name || 'Company',
          companyIntroduction: companyInfo.introduction,
          companyIndustry: companyInfo.industry,
          companyStage: companyInfo.stage,
          assessmentPoints: company?.assessment_points || [],
          messages: conversationHistory
        }
      });
      
      if (error) {
        console.error('Error invoking company-chatbot function:', error);
        setMessages(prev => [...prev, { 
          content: "I'm sorry, I encountered an error. Please try again later.", 
          role: 'assistant' 
        }]);
        
        toast({
          title: "Error",
          description: "Failed to get a response from the chatbot",
          variant: "destructive"
        });
        return;
      }
      
      setMessages(prev => [...prev, { 
        content: data.response || "I'm analyzing this company, but I don't have enough information to provide a detailed response.", 
        role: 'assistant' 
      }]);
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      setMessages(prev => [...prev, { 
        content: "I'm sorry, I encountered an error processing your request.", 
        role: 'assistant' 
      }]);
      
      toast({
        title: "Error",
        description: "Failed to process your message",
        variant: "destructive"
      });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
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
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-4">
          <p>Company not found</p>
        </div>
      </div>
    );
  }

  // Calculate score and progress based on user type
  const rawScore = company.overall_score;
  const formattedScore = isVCAndBits ? Math.min(5, Math.max(0, rawScore)) : parseFloat(rawScore.toFixed(1));
  const progressPercentage = isVCAndBits ? (formattedScore / 5) * 100 : formattedScore * 20;

  const getScoreColor = (score: number) => {
    if (isVCAndBits) {
      // 5-point scale colors
      if (score >= 4.0) return "score-excellent";
      if (score >= 3.0) return "score-good";
      if (score >= 2.0) return "score-average";
      if (score >= 1.0) return "score-poor";
      return "score-critical";
    } else {
      // Original 5-point scale colors
      if (score >= 4.0) return "score-excellent";
      if (score >= 3.5) return "score-good";
      if (score >= 2.5) return "score-average";
      if (score >= 1.5) return "score-poor";
      return "score-critical";
    }
  };

  return (
    <div className="min-h-screen">
      <div className="flex w-full">
        <div className={`${showChat ? 'w-1/2' : 'w-full'} flex flex-col`}>
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
                  {company?.report_id && (
                    <Button 
                      onClick={navigateToReport} 
                      variant="outline" 
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      View Deck
                    </Button>
                  )}
                  {id && <FormResponsesDialog companyId={id} />}
                  {/* Investment Memo button for non-IIT Bombay users */}
                  {!isIITBombayUser && company && (
                    <InvestmentMemo company={company} />
                  )}
                  {/* VC Matchmaking button for general users with score > 65 */}
                  {!isIITBombayUser && company && rawScore > 65 && id && (
                    <VCMatchmakingDialog 
                      companyId={id} 
                      companyName={company.name} 
                    />
                  )}
                  {/* Only show chatbot button for non-IIT Bombay users */}
                  {!isIITBombayUser && (
                    <Button
                      onClick={handleChatbotClick}
                      variant={showChat ? "secondary" : "default"}
                      className="flex items-center gap-2"
                    >
                      <BotMessageSquare className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="mt-6 mb-8">
                <CompanyInfoCard 
                  website={companyInfo.website}
                  stage={companyInfo.stage}
                  industry={companyInfo.industry}
                  founderLinkedIns={companyInfo.founderLinkedIns}
                  introduction={companyInfo.introduction}
                  companyName={company?.name}
                />
              </div>
              
              <div className="mb-5">
                <Progress 
                  value={progressPercentage} 
                  className={`h-2 ${getScoreColor(formattedScore)}`} 
                />
              </div>

              {/* Only show ScoreAssessment for IIT Bombay users */}
              {isIITBombayUser && companyDetailed && <ScoreAssessment company={companyDetailed} />}
            </div>
            
            {/* Show section metrics for IIT Bombay users only */}
            {isIITBombayUser && (
              <>
                <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-5 flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-primary" />
                  Section Metrics
                </h2>
                
                {sortedSections.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
                    {sortedSections.map((section) => (
                      <SectionCard 
                        key={section.id} 
                        section={section} 
                        onClick={() => handleSectionClick(section.id)} 
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="mb-8 border-0 shadow-subtle">
                    <CardContent className="p-6 text-center">
                      <BarChart2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No Sections Available</h3>
                      <p className="text-muted-foreground">
                        This company doesn't have any analysis sections yet. The analysis might still be in progress or hasn't been completed.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
            
            {/* Submission Details Section - Show for all users */}
            {company.response_received && company.response_received !== 'null' && (() => {
              try {
                const responseData = JSON.parse(company.response_received);
                const submission = responseData?.submission;
                const evaluation = responseData?.evaluation;
                
                if (!submission) return null;
                
                return (
                  <div className="mt-8">
                    <h2 className="text-xl sm:text-2xl font-semibold mb-6 flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-primary" />
                      Startup Details
                    </h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                      {/* Problem Statement */}
                      {submission.problem_statement && (
                        <Card className="border-0 shadow-subtle">
                          <CardHeader>
                            <CardTitle className="text-lg">Problem Statement</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-muted-foreground">{submission.problem_statement}</p>
                          </CardContent>
                        </Card>
                      )}
                      
                      {/* Solution */}
                      {submission.solution && (
                        <Card className="border-0 shadow-subtle">
                          <CardHeader>
                            <CardTitle className="text-lg">Solution</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-muted-foreground">{submission.solution}</p>
                          </CardContent>
                        </Card>
                      )}
                      
                      {/* Market Understanding */}
                      {submission.market_understanding && (
                        <Card className="border-0 shadow-subtle">
                          <CardHeader>
                            <CardTitle className="text-lg">Market Understanding</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-muted-foreground">{submission.market_understanding}</p>
                          </CardContent>
                        </Card>
                      )}
                      
                      {/* Customer Understanding */}
                      {submission.customer_understanding && (
                        <Card className="border-0 shadow-subtle">
                          <CardHeader>
                            <CardTitle className="text-lg">Customer Understanding</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-muted-foreground">{submission.customer_understanding}</p>
                          </CardContent>
                        </Card>
                      )}
                      
                      {/* Competitive Understanding */}
                      {submission.competitive_understanding && (
                        <Card className="border-0 shadow-subtle">
                          <CardHeader>
                            <CardTitle className="text-lg">Competitive Landscape</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-muted-foreground">{submission.competitive_understanding}</p>
                          </CardContent>
                        </Card>
                      )}
                      
                      {/* USP */}
                      {submission.unique_selling_proposition && (
                        <Card className="border-0 shadow-subtle">
                          <CardHeader>
                            <CardTitle className="text-lg">Unique Selling Proposition</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-muted-foreground">{submission.unique_selling_proposition}</p>
                          </CardContent>
                        </Card>
                      )}
                      
                      {/* Technical Understanding */}
                      {submission.technical_understanding && (
                        <Card className="border-0 shadow-subtle">
                          <CardHeader>
                            <CardTitle className="text-lg">Technical Approach</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-muted-foreground">{submission.technical_understanding}</p>
                          </CardContent>
                        </Card>
                      )}
                      
                      {/* Vision */}
                      {submission.vision && (
                        <Card className="border-0 shadow-subtle">
                          <CardHeader>
                            <CardTitle className="text-lg">Vision</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-muted-foreground">{submission.vision}</p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                    
                    {/* AI Evaluation Section */}
                    {evaluation && (
                      <div className="mt-8">
                        <h2 className="text-xl sm:text-2xl font-semibold mb-6 flex items-center gap-2">
                          <BotMessageSquare className="h-5 w-5 text-primary" />
                          AI Evaluation
                        </h2>
                        
                        {/* AI Analysis Summary */}
                        {evaluation.ai_analysis_summary && (
                          <Card className="border-0 shadow-subtle mb-6">
                            <CardHeader>
                              <CardTitle>Analysis Summary</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-muted-foreground leading-relaxed">{evaluation.ai_analysis_summary}</p>
                            </CardContent>
                          </Card>
                        )}
                        
                        {/* AI Recommendations */}
                        {evaluation.ai_recommendations && (
                          <Card className="border-0 shadow-subtle mb-6">
                            <CardHeader>
                              <CardTitle>Recommendations</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-muted-foreground leading-relaxed whitespace-pre-line">{evaluation.ai_recommendations}</div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}
                  </div>
                );
              } catch (error) {
                console.error('Error parsing response_received:', error);
                return null;
              }
            })()}
            
            {/* Real-Time Market Research Section */}
            <div className="mt-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-[#f59e0b]" />
                  Real-Time Market Research
                </h2>
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={async () => {
                    if (!id) return;
                    toast({
                      title: "Updating Research",
                      description: "Fetching latest market insights...",
                    });
                    
                    try {
                      const { error } = await supabase.functions.invoke('research-with-perplexity', {
                        body: { companyId: id }
                      });
                      
                      if (error) throw error;
                      
                      queryClient.invalidateQueries({ queryKey: ['company', id] });
                      toast({
                        title: "Research Updated",
                        description: "Latest market insights have been fetched successfully",
                      });
                    } catch (error) {
                      console.error('Error updating research:', error);
                      toast({
                        title: "Error",
                        description: "Failed to update research",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                  Update Research
                </Button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Research Categories - Left Column */}
                <div className="lg:col-span-1">
                  <h3 className="text-lg font-semibold text-[#f59e0b] mb-4">Research Categories</h3>
                  
                  <div className="space-y-4">
                    {/* Market Research */}
                    <Card className="border-0 shadow-subtle bg-[#1a1d2e] hover:bg-[#20243a] transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Globe className="h-5 w-5 text-[#3b82f6] flex-shrink-0 mt-1" />
                          <div>
                            <h4 className="font-semibold text-white mb-1">Market Research</h4>
                            <p className="text-sm text-gray-400">
                              Comprehensive market analysis with up-to-date insights from reputable sources.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Latest News */}
                    <Card className="border-0 shadow-subtle bg-[#1a1d2e] hover:bg-[#20243a] transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Newspaper className="h-5 w-5 text-[#10b981] flex-shrink-0 mt-1" />
                          <div>
                            <h4 className="font-semibold text-white mb-1">Latest News</h4>
                            <p className="text-sm text-gray-400">
                              Recent industry news and events with relevant implications for this company.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Market Trends */}
                    <Card className="border-2 border-[#f59e0b] shadow-subtle bg-[#1a1d2e] hover:bg-[#20243a] transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <TrendingUp className="h-5 w-5 text-[#f59e0b] flex-shrink-0 mt-1" />
                          <div>
                            <h4 className="font-semibold text-white mb-1">Market Trends</h4>
                            <p className="text-sm text-gray-400">
                              Current trends, market size data, and competitive landscape analysis.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
                
                {/* Market Insights - Right Column */}
                <div className="lg:col-span-2">
                  <h3 className="text-lg font-semibold text-[#f59e0b] mb-4">Market Insights</h3>
                  
                  <MarketResearchDisplay companyId={id || ''} />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Chat sidebar - only show for non-IIT Bombay users */}
        {showChat && !isIITBombayUser && (
          <div className="w-1/2 border-l border-border bg-background shadow-card fixed right-0 top-0 h-screen flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center flex-shrink-0">
              <div>
                <h2 className="font-semibold text-lg flex items-center gap-2 text-primary">
                  InsightMaster
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Discuss {company?.name}'s investment opportunity with InsightMaster
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
            
            <div className="flex-1 p-4 bg-secondary/10 overflow-y-auto">
              <div className="flex flex-col space-y-4">
                {messages.map((message, index) => (
                  <div 
                    key={index} 
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground ml-4' 
                          : 'bg-muted text-foreground mr-4'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <p className="text-sm leading-relaxed">{message.content}</p>
                      ) : (
                        <ReactMarkdown 
                          className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                          components={{
                            // Enhanced paragraph styling with proper spacing
                            p: ({ children }) => (
                              <p className="mb-3 last:mb-0 leading-relaxed text-sm">{children}</p>
                            ),
                            // Enhanced bullet points with better spacing and indentation
                            ul: ({ children }) => (
                              <ul className="mb-4 last:mb-0 space-y-1 pl-4">{children}</ul>
                            ),
                            li: ({ children }) => (
                              <li className="text-sm leading-relaxed list-disc ml-1 pl-1">{children}</li>
                            ),
                            // Enhanced numbered lists
                            ol: ({ children }) => (
                              <ol className="mb-4 last:mb-0 space-y-1 pl-4 list-decimal">{children}</ol>
                            ),
                            // Enhanced headers with better spacing
                            h1: ({ children }) => (
                              <h1 className="text-base font-semibold mb-3 mt-4 first:mt-0">{children}</h1>
                            ),
                            h2: ({ children }) => (
                              <h2 className="text-sm font-semibold mb-2 mt-3 first:mt-0">{children}</h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="text-sm font-medium mb-2 mt-3 first:mt-0">{children}</h3>
                            ),
                            // Enhanced strong text
                            strong: ({ children }) => (
                              <strong className="font-semibold text-foreground">{children}</strong>
                            ),
                            // Enhanced code blocks
                            code: ({ children }) => (
                              <code className="bg-secondary/50 px-1 py-0.5 rounded text-xs font-mono">{children}</code>
                            ),
                            // Enhanced blockquotes
                            blockquote: ({ children }) => (
                              <blockquote className="border-l-2 border-border pl-3 ml-2 italic text-muted-foreground my-3">
                                {children}
                              </blockquote>
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                ))}
                {isSendingMessage && (
                  <div className="flex justify-start">
                    <div className="bg-muted text-foreground max-w-[80%] rounded-lg p-4 mr-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-primary rounded-full animate-pulse"></div>
                        <div className="h-2 w-2 bg-primary rounded-full animate-pulse delay-75"></div>
                        <div className="h-2 w-2 bg-primary rounded-full animate-pulse delay-150"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-border flex-shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about this company..."
                  className="flex-1 p-2 rounded-md border border-input bg-background"
                  disabled={isSendingMessage}
                />
                <Button 
                  onClick={handleSendMessage} 
                  size="icon"
                  disabled={isSendingMessage || !currentMessage.trim()}
                >
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
    </div>
  );
};

export default CompanyDetails;
