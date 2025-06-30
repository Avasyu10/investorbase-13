import { useParams, useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { SectionCard } from "./SectionCard";
import { ScoreAssessment } from "./ScoreAssessment";
import { CompanyInfoCard } from "./CompanyInfoCard";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, BarChart2, ChevronLeft, Briefcase, BotMessageSquare, Send, X, ExternalLink, BookOpen } from "lucide-react";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useCompanyDetails } from "@/hooks/companyHooks/useCompanyDetails";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ORDERED_SECTIONS } from "@/lib/constants";
import ReactMarkdown from 'react-markdown';
import { CompanyDetailed } from "@/lib/api/apiContract";
import FormResponsesDialog from "./FormResponsesDialog";
import { useAuth } from "@/hooks/useAuth";

const CompanyDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { company, isLoading } = useCompanyDetails(id || "");
  const { user } = useAuth();
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
  const [isIITBombayUser, setIsIITBombayUser] = useState(false);

  // Convert Company to CompanyDetailed for components that need it
  const companyDetailed: CompanyDetailed | null = useMemo(() => {
    if (!company) return null;
    return {
      ...company,
      sections: company.sections || []
    };
  }, [company]);

  // Check if current user is IIT Bombay user
  useEffect(() => {
    const checkUserType = async () => {
      if (!user) return;
      
      try {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('is_iitbombay')
          .eq('id', user.id)
          .single();
        
        const isIITBombay = userProfile?.is_iitbombay || false;
        setIsIITBombayUser(isIITBombay);
        
        // Redirect non-IIT Bombay users to the dedicated company details page
        if (!isIITBombay && id) {
          navigate(`/company-details/${id}`, { replace: true });
          return;
        }
      } catch (error) {
        console.error('Error checking user type:', error);
      }
    };

    checkUserType();
  }, [user, id, navigate]);

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

  // Check if this company is from a BARC form submission
  useEffect(() => {
    const checkBarcFormOrigin = async () => {
      if (!id) return;
      
      try {
        const { data: barcSubmission, error } = await supabase
          .from('barc_form_submissions')
          .select('id')
          .eq('company_id', id)
          .maybeSingle();

        if (!error && barcSubmission) {
          setIsFromBarcForm(true);
        }
      } catch (error) {
        console.error('Error checking BARC form origin:', error);
      }
    };

    checkBarcFormOrigin();
  }, [id]);

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

  const formattedScore = company ? parseFloat(company.overall_score.toFixed(1)) : 0;
  
  const progressPercentage = formattedScore * 20;

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return "score-excellent";
    if (score >= 3.5) return "score-good";
    if (score >= 2.5) return "score-average";
    if (score >= 1.5) return "score-poor";
    return "score-critical";
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
                  className={`h-2 ${getScoreColor(company.overall_score)}`} 
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
