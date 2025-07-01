import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SectionCard } from "@/components/companies/SectionCard";
import { SectionChecklist } from "@/components/companies/SectionChecklist";
import { OverallAssessment } from "@/components/companies/OverallAssessment";
import { CompanyInfoCard } from "@/components/companies/CompanyInfoCard";
import { ImprovementSuggestions } from "@/components/companies/ImprovementSuggestions";
import { SlideBySlideViewer } from "@/components/companies/SlideBySlideViewer";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2, BarChart2, ListChecks, Lightbulb, FileText } from "lucide-react";
import { useCompanyDetails } from "@/hooks/companyHooks/useCompanyDetails";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyDetailed } from "@/lib/api/apiContract";
import { supabase } from "@/integrations/supabase/client";
import { MarketResearch } from "@/components/companies/MarketResearch";

interface SlideNote {
  slideNumber: number;
  notes: string[];
}

interface AnalysisResult {
  slideBySlideNotes?: SlideNote[];
  improvementSuggestions?: string[];
  [key: string]: any;
}

function CompanyDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isLoading: authLoading, user } = useAuth();
  const { profile, isLoading: profileLoading, isVCAndBits } = useProfile();
  const { company, isLoading } = useCompanyDetails(id || "");
  const [error, setError] = useState<string | null>(null);
  const [slideNotes, setSlideNotes] = useState<SlideNote[]>([]);
  const [improvementSuggestions, setImprovementSuggestions] = useState<string[]>([]);

  // Convert Company to CompanyDetailed for components that need it
  const companyDetailed: CompanyDetailed | null = company ? {
    ...company,
    sections: company.sections || []
  } : null;

  // Determine user type based on profile - using correct property names
  const isVCUser = profile?.is_vc || false;
  const isIITBombayUser = profile?.is_iitbombay || false;
  const isRegularUser = !isVCUser && !isIITBombayUser;

  // Extract slide notes and improvement suggestions from company data
  useEffect(() => {
    if (company?.report_id) {
      console.log('Fetching slide notes and improvement suggestions for report_id:', company.report_id);
      
      // Get slide notes and improvement suggestions from the report analysis result
      const fetchAnalysisData = async () => {
        try {
          const { data: report } = await supabase
            .from('reports')
            .select('analysis_result')
            .eq('id', company.report_id)
            .single();
          
          console.log('Report data fetched:', report);
          
          if (report?.analysis_result) {
            const analysisResult = report.analysis_result as AnalysisResult;
            console.log('Full analysis result:', analysisResult);
            
            // Set slide notes
            if (analysisResult.slideBySlideNotes && analysisResult.slideBySlideNotes.length > 0) {
              setSlideNotes(analysisResult.slideBySlideNotes);
              console.log('Slide notes found:', analysisResult.slideBySlideNotes.length);
            } else {
              console.log('No slideBySlideNotes in analysis result or empty array');
              setSlideNotes([]);
            }
            
            // Set improvement suggestions - check multiple possible locations
            let suggestions: string[] = [];
            
            if (analysisResult.improvementSuggestions && Array.isArray(analysisResult.improvementSuggestions)) {
              suggestions = analysisResult.improvementSuggestions;
              console.log('Found improvementSuggestions in root:', suggestions.length);
            } else if (analysisResult.sections) {
              // Sometimes improvement suggestions might be nested in sections
              console.log('Checking sections for improvement suggestions');
              for (const section of analysisResult.sections) {
                if (section.improvementSuggestions && Array.isArray(section.improvementSuggestions)) {
                  suggestions = [...suggestions, ...section.improvementSuggestions];
                }
              }
              console.log('Found suggestions in sections:', suggestions.length);
            }
            
            setImprovementSuggestions(suggestions);
            console.log('Final improvement suggestions count:', suggestions.length);
            console.log('Improvement suggestions:', suggestions);
          } else {
            console.log('No analysis_result in report');
            setSlideNotes([]);
            setImprovementSuggestions([]);
          }
        } catch (error) {
          console.error('Error fetching analysis data:', error);
          setSlideNotes([]);
          setImprovementSuggestions([]);
        }
      };
      
      fetchAnalysisData();
    } else {
      console.log('No report_id found for company');
      setSlideNotes([]);
      setImprovementSuggestions([]);
    }
  }, [company?.report_id]);

  // Early return for loading state
  // Early return for error state
  // Ensure we have values to display, using fallbacks and proper defaults
  // Filter sections based on user type - exclude slide notes and GTM strategy for display in section cards
  // Custom sorting for VC users with specific order
  // Debug logging for sections
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

  // Calculate score and progress based on 100-point scale for all users
  const rawScore = company?.overall_score || 0;
  const formattedScore = Math.min(100, Math.max(0, rawScore));
  const progressPercentage = formattedScore;

  const getScoreColor = (score: number) => {
    // 100-point scale colors for all users
    if (score >= 80) return "score-excellent";
    if (score >= 60) return "score-good";
    if (score >= 40) return "score-average";
    if (score >= 20) return "score-poor";
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

            {/* For VC users, show Overall Assessment with 100-point scale */}
            {isVCUser && (
              <OverallAssessment
                score={formattedScore}
                assessmentPoints={company?.assessment_points || []}
                companyId={company?.id}
                companyName={company?.name}
              />
            )}

            {/* For regular users (not VC and not IIT Bombay), show slide by slide notes */}
            {isRegularUser && company.report_id && slideNotes.length > 0 && (
              <>
                <h2 className="text-2xl font-bold mt-12 mb-6 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Slide by Slide Notes
                </h2>
                
                <div className="mb-8">
                  <SlideBySlideViewer 
                    reportId={company.report_id}
                    slideNotes={slideNotes}
                    companyName={company.name}
                  />
                </div>
              </>
            )}

            {/* Show section checklist for regular users */}
            {isRegularUser && sortedSections.length > 0 && (
              <>  
                <h2 className="text-2xl font-bold mt-12 mb-6 flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-primary" />
                  Section Analysis Checklist
                </h2>
                
                <div className="mb-8">
                  <SectionChecklist 
                    sections={sortedSections}
                  />
                </div>
              </>
            )}

            {/* Show improvement suggestions for regular users */}
            {isRegularUser && (
              <>
                <h2 className="text-2xl font-bold mt-12 mb-6 flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  Improvement Suggestions
                </h2>
                
                <div className="mb-8">
                  <ImprovementSuggestions 
                    suggestions={improvementSuggestions}
                    companyName={company.name}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CompanyDetails;
