import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, Menu, X, CheckCircle, XCircle, Maximize, ChevronLeft, HelpCircle } from "lucide-react";
import { useCompanyDetails, useSectionDetails } from "@/hooks/useCompanies";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ReportViewer } from "@/components/reports/ReportViewer";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function SectionDetail() {
  const { companyId, sectionId } = useParams<{ companyId: string, sectionId: string }>();
  const navigate = useNavigate();
  const { company } = useCompanyDetails(companyId);
  const { section, isLoading } = useSectionDetails(companyId, sectionId);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)]">
        <div className="w-64 border-r bg-background/95 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
          <div className="p-4 border-b">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="px-4 py-3 border-b">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 p-6">
          <Card className="shadow-sm animate-pulse">
            <CardHeader className="pb-4 border-b">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!company || !section) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Section details not found</p>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return "text-emerald-600 font-medium"; 
    if (score >= 3.5) return "text-blue-600 font-medium";    
    if (score >= 2.5) return "text-amber-600 font-medium";   
    if (score >= 1.5) return "text-orange-600 font-medium";  
    return "text-red-600 font-medium";                      
  };

  const highlightNumbers = (text: string) => {
    return {
      __html: text.replace(
        /([\d.]+%|[\d.,]+|[$€£¥][\d.,]+|[\d.,]+[KMBTkmbt])/g,
        match => `<span class="text-primary font-medium">${match}</span>`
      )
    };
  };

  const formatDescriptionAsBullets = (description: string): string[] => {
    if (!description) return [];
    
    const sentences = description
      .replace(/\*/g, '')
      .split(/(?:\.|\n|•)\s+/)
      .filter(s => s.trim().length > 10)
      .map(s => s.trim());
    
    return sentences;
  };

  const getScoreDescription = (score: number): string => {
    const sectionLower = section.title.toLowerCase();
    
    if (sectionLower.includes("market") || sectionLower.includes("opportunity")) {
      if (score >= 4.5) return `Outstanding (${score}/5): Exceptional market analysis with comprehensive TAM/SAM/SOM breakdown, strong validation of growth trends, and clear competitive positioning.`;
      if (score >= 3.5) return `Very Good (${score}/5): Solid market analysis with reliable growth forecasts and good understanding of target segments and market dynamics.`;
      if (score >= 2.5) return `Satisfactory (${score}/5): Adequate market sizing but needs more rigorous validation of assumptions and deeper competitive landscape analysis.`;
      if (score >= 1.5) return `Needs Work (${score}/5): Market analysis lacks credibility with optimistic projections and insufficient understanding of market dynamics.`;
      return `Critical Concerns (${score}/5): Market analysis contains serious flaws in sizing, growth assumptions, or fails to identify key market constraints.`;
    }
    
    if (sectionLower.includes("team") || sectionLower.includes("management")) {
      if (score >= 4.5) return `Outstanding (${score}/5): Exceptional founding team with proven track record of success in this domain and complementary skill sets.`;
      if (score >= 3.5) return `Very Good (${score}/5): Strong team with relevant industry experience and demonstrated ability to execute in key business areas.`;
      if (score >= 2.5) return `Satisfactory (${score}/5): Core team has basic qualifications but lacks specific expertise in critical areas or startup experience.`;
      if (score >= 1.5) return `Needs Work (${score}/5): Team has significant gaps in leadership, technical expertise, or domain knowledge needed for success.`;
      return `Critical Concerns (${score}/5): Team lacks fundamental capabilities or experience needed to execute the business plan effectively.`;
    }
    
    if (sectionLower.includes("product") || sectionLower.includes("solution")) {
      if (score >= 4.5) return `Outstanding (${score}/5): Product demonstrates superior innovation with strong technical moat and proven product-market fit.`;
      if (score >= 3.5) return `Very Good (${score}/5): Well-developed product with clear value proposition and validated customer problem-solution fit.`;
      if (score >= 2.5) return `Satisfactory (${score}/5): Product addresses a real need but has limited differentiation or protection from competitors.`;
      if (score >= 1.5) return `Needs Work (${score}/5): Product concept requires significant development with unclear unique selling proposition.`;
      return `Critical Concerns (${score}/5): Product has fundamental flaws in concept, feasibility, or market alignment.`;
    }
    
    if (sectionLower.includes("finance") || sectionLower.includes("financial")) {
      if (score >= 4.5) return `Outstanding (${score}/5): Financial model shows exceptional clarity with realistic projections, strong unit economics, and clear path to profitability.`;
      if (score >= 3.5) return `Very Good (${score}/5): Sound financial planning with reasonable assumptions and well-articulated capital requirements.`;
      if (score >= 2.5) return `Satisfactory (${score}/5): Basic financial model with some optimistic assumptions needing further validation.`;
      if (score >= 1.5) return `Needs Work (${score}/5): Financial projections contain significant inconsistencies or unrealistic assumptions about growth or costs.`;
      return `Critical Concerns (${score}/5): Financial model lacks credibility with fundamental flaws in revenue model or cost structure.`;
    }
    
    if (sectionLower.includes("traction") || sectionLower.includes("metrics")) {
      if (score >= 4.5) return `Outstanding (${score}/5): Exceptional growth metrics with strong customer retention, rapidly increasing revenue, and validated demand.`;
      if (score >= 3.5) return `Very Good (${score}/5): Solid traction with growing user base, revenue, and engagement metrics showing product-market fit.`;
      if (score >= 2.5) return `Satisfactory (${score}/5): Shows early signs of traction but limited operating history and needs more validation at scale.`;
      if (score >= 1.5) return `Needs Work (${score}/5): Limited traction with concerning customer acquisition or retention metrics.`;
      return `Critical Concerns (${score}/5): Minimal or no verifiable traction, with major concerns about customer interest or validation.`;
    }
    
    if (sectionLower.includes("go-to-market") || sectionLower.includes("strategy") || sectionLower.includes("marketing")) {
      if (score >= 4.5) return `Outstanding (${score}/5): Exceptional marketing strategy with proven channels, optimized CAC, and clear scaling plan.`;
      if (score >= 3.5) return `Very Good (${score}/5): Well-defined go-to-market strategy with identified channels and realistic customer acquisition costs.`;
      if (score >= 2.5) return `Satisfactory (${score}/5): Basic marketing approach outlined but lacking detail on specific channels or conversion metrics.`;
      if (score >= 1.5) return `Needs Work (${score}/5): Marketing strategy is vague with unrealistic customer acquisition assumptions.`;
      return `Critical Concerns (${score}/5): Go-to-market plan is fundamentally flawed or missing critical elements for successful customer acquisition.`;
    }
    
    if (sectionLower.includes("competition") || sectionLower.includes("competitive")) {
      if (score >= 4.5) return `Outstanding (${score}/5): Comprehensive competitive analysis with clear positioning strategy and sustainable competitive advantages.`;
      if (score >= 3.5) return `Very Good (${score}/5): Solid understanding of competitive landscape with realistic assessment of threats and differentiators.`;
      if (score >= 2.5) return `Satisfactory (${score}/5): Identifies major competitors but lacks detailed analysis of competitive responses or future threats.`;
      if (score >= 1.5) return `Needs Work (${score}/5): Incomplete competitive analysis with overestimated differentiation or underestimated threats.`;
      return `Critical Concerns (${score}/5): Severely underestimates competition or fails to identify key competitors and barriers to entry.`;
    }
    
    if (sectionLower.includes("business model")) {
      if (score >= 4.5) return `Outstanding (${score}/5): Business model shows exceptional unit economics, multiple revenue streams, and sustainable competitive advantage.`;
      if (score >= 3.5) return `Very Good (${score}/5): Strong business model with clear revenue mechanics, sensible pricing, and good margin potential.`;
      if (score >= 2.5) return `Satisfactory (${score}/5): Workable business model but concerns about scalability, pricing power, or long-term margins.`;
      if (score >= 1.5) return `Needs Work (${score}/5): Business model has significant flaws in revenue generation, pricing, or customer value.`;
      return `Critical Concerns (${score}/5): Fundamentally flawed business model with unrealistic revenue assumptions or value creation mechanism.`;
    }
    
    if (score >= 4.5) return `Outstanding (${score}/5): This section demonstrates exceptional quality with industry-leading practices, providing significant competitive advantage.`;
    if (score >= 3.5) return `Very Good (${score}/5): This section is well executed with minor opportunities for enhancement. Shows solid understanding of investor expectations.`;
    if (score >= 2.5) return `Satisfactory (${score}/5): Several aspects need improvement, though the foundation is adequate. Some key elements require further development.`;
    if (score >= 1.5) return `Needs Work (${score}/5): Significant deficiencies exist that would concern potential investors. Requires substantial revisions.`;
    return `Critical Concerns (${score}/5): This section fails to meet basic standards and requires complete overhaul. Major red flags for investors.`;
  };

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)]">
      <div className="absolute top-3 left-3 sm:top-4 sm:left-6 z-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/company/${companyId}`)}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
      </div>

      <Button 
        variant="outline" 
        size="icon"
        className="fixed bottom-4 right-4 z-50 lg:hidden shadow-md rounded-full h-12 w-12"
        onClick={toggleSidebar}
      >
        {sidebarOpen ? <X /> : <Menu />}
      </Button>

      <div 
        className={`fixed lg:relative lg:flex w-64 border-r bg-background/95 backdrop-blur-sm h-[calc(100vh-4rem)] top-16 z-40 transition-all duration-300 ease-in-out transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } overflow-y-auto`}
      >
        <div className="p-4 border-b bg-secondary/30">
          <h3 className="font-medium text-foreground">{company?.name}</h3>
          <p className="text-sm text-muted-foreground">Sections</p>
        </div>
        <nav className="flex flex-col w-full">
          {company?.sections.map((s) => (
            <Link
              key={s.id}
              to={`/company/${companyId}/section/${s.id}`}
              className={`flex items-center px-4 py-3 text-sm hover:bg-secondary/50 transition-colors ${
                Number(s.id) === Number(sectionId) ? "bg-secondary/80 font-medium" : ""
              }`}
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setSidebarOpen(false);
                }
              }}
            >
              <span className="flex-1">{s.title}</span>
              {Number(s.id) === Number(sectionId) && <ChevronRight className="h-4 w-4" />}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex-1 p-3 sm:p-6 w-full pt-14 sm:pt-16">
        <Card className="border-0 shadow-card bg-card/95 backdrop-blur-sm">
          <CardHeader className="pb-4 border-b bg-secondary/20 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-xl sm:text-2xl font-bold text-foreground">{section?.title}</CardTitle>
              <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                {company?.reportId && (
                  <Button 
                    onClick={() => setShowReportModal(true)}
                    variant="outline"
                    className="flex items-center gap-2 bg-background hover:bg-secondary/70"
                    size="sm"
                  >
                    <Maximize className="h-4 w-4" />
                    View Deck
                  </Button>
                )}
                <div className="flex items-center">
                  <span className="font-semibold text-sm sm:text-base text-foreground mr-2">Score:</span>
                  <span className={`font-bold text-base sm:text-lg ${getScoreColor(section?.score || 0)}`}>{section?.score}</span>
                  <span className="text-sm text-muted-foreground ml-1">/5</span>
                  <TooltipProvider>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 ml-1 text-muted-foreground">
                          <HelpCircle className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" align="center" className="max-w-[320px] text-xs">
                        <p>{getScoreDescription(section?.score || 0)}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="w-24 sm:w-32 flex items-center">
                  <Progress 
                    value={(section?.score || 0) * 20} 
                    className={`h-2.5 ${
                      (section?.score || 0) >= 4 ? 'bg-emerald-100 [&>div]:bg-emerald-600' : 
                      (section?.score || 0) >= 3 ? 'bg-blue-100 [&>div]:bg-blue-600' : 
                      (section?.score || 0) >= 2 ? 'bg-amber-100 [&>div]:bg-amber-600' : 
                      'bg-red-100 [&>div]:bg-red-600'
                    }`}
                  />
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6 sm:pt-8">
            <div className="space-y-6">
              <div className="p-6 rounded-lg bg-background border border-border shadow-md">
                <h3 className="text-lg font-semibold mb-4 text-foreground">Summary</h3>
                <ul className="list-disc pl-5 space-y-2">
                  {formatDescriptionAsBullets(section?.description || '').map((point, idx) => (
                    <li 
                      key={idx} 
                      className="text-sm sm:text-base text-foreground/90"
                      dangerouslySetInnerHTML={highlightNumbers(point)}
                    />
                  ))}
                </ul>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-6 rounded-lg bg-gradient-to-br from-emerald-50/70 to-emerald-100/40 dark:from-emerald-950/40 dark:to-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 shadow-md">
                  <h4 className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-400 mb-4">
                    <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
                    <span>Key Strengths</span>
                  </h4>
                  <ul className="space-y-3 text-sm sm:text-base">
                    {section?.strengths && section.strengths.length > 0 ? (
                      section.strengths.map((strength, idx) => (
                        <li 
                          key={idx} 
                          className="pl-4 border-l-2 border-emerald-400 dark:border-emerald-600 text-foreground/90 pb-1"
                        >
                          {strength}
                        </li>
                      ))
                    ) : (
                      <li className="pl-4 border-l-2 border-emerald-400 dark:border-emerald-600 text-muted-foreground">
                        No strengths data available
                      </li>
                    )}
                  </ul>
                </div>
                
                <div className="p-6 rounded-lg bg-gradient-to-br from-amber-50/70 to-amber-100/40 dark:from-amber-950/40 dark:to-amber-900/20 border border-amber-200 dark:border-amber-800/50 shadow-md">
                  <h4 className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-400 mb-4">
                    <XCircle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                    <span>Areas for Improvement</span>
                  </h4>
                  <ul className="space-y-3 text-sm sm:text-base">
                    {section?.weaknesses && section.weaknesses.length > 0 ? (
                      section.weaknesses.map((weakness, idx) => (
                        <li 
                          key={idx} 
                          className="pl-4 border-l-2 border-amber-400 dark:border-amber-600 text-foreground/90 pb-1"
                        >
                          {weakness}
                        </li>
                      ))
                    ) : (
                      <li className="pl-4 border-l-2 border-amber-400 dark:border-amber-600 text-muted-foreground">
                        No weaknesses data available
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {company?.reportId && (
        <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
          <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col bg-background/95 backdrop-blur-md border border-border/80">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">{company.name} - {section?.title}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto p-1">
              <ReportViewer reportId={company.reportId} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
