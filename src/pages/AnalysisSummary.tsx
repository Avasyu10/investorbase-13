import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Maximize, HelpCircle, Printer } from 'lucide-react';
import { useCompanyDetails } from '@/hooks/useCompanies';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReportViewer } from '@/components/reports/ReportViewer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { InvestorResearch } from '@/components/companies/InvestorResearch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useReactToPrint } from 'react-to-print';

const PrintStyles = () => (
  <style type="text/css">{`
    @media print {
      @page {
        margin: 0;
        size: auto;
      }
      
      html, body {
        margin: 0;
        padding: 0;
        background-color: #1a1a1a !important;
        color: white !important;
        font-size: 12pt !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .print-container {
        padding: 0 !important;
        width: 100% !important;
        max-width: none !important;
        background-color: #1a1a1a !important;
      }
      
      .no-print {
        display: none !important;
      }
      
      .print-break-inside-avoid {
        break-inside: avoid !important;
      }
      
      .print-full-width {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      
      .print-shadow-none {
        box-shadow: none !important;
        border: 1px solid #333 !important;
      }
      
      .print-card {
        border: 1px solid #333 !important;
        margin-bottom: 16px !important;
        break-inside: avoid !important;
        background-color: #1a1a1a !important;
        color: white !important;
      }
      
      .print-text-black {
        color: white !important;
      }
      
      .print-text-dark {
        color: #ccc !important;
      }
      
      .print-text-gray {
        color: #bbb !important;
      }
      
      [class*="bg-"] {
        print-color-adjust: exact !important;
        -webkit-print-color-adjust: exact !important;
      }
      
      .recharts-wrapper {
        break-inside: avoid !important;
      }
      
      .print-title {
        font-size: 18pt !important;
        font-weight: bold !important;
        margin-bottom: 8px !important;
        color: white !important;
      }
      
      .print-header, .print-footer {
        display: none !important;
      }
      
      .print-page-break {
        page-break-after: always !important;
      }
      
      .print-section-title {
        font-size: 14pt !important;
        font-weight: bold !important;
        margin-top: 15px !important;
        margin-bottom: 10px !important;
        color: white !important;
      }
      
      .recharts-text.recharts-label {
        fill: white !important;
      }
      
      .recharts-text.recharts-cartesian-axis-tick-value {
        fill: white !important;
        font-weight: bold !important;
        font-size: 9pt !important;
      }
      
      .recharts-cartesian-grid line {
        stroke: #444 !important;
      }
      
      .recharts-tooltip-wrapper {
        background-color: #1a1a1a !important;
        color: white !important;
      }
      
      .print-chart-container {
        height: 300px !important;
        margin: 20px 0 !important;
        break-inside: avoid !important;
        background-color: #1a1a1a !important;
      }
      
      text {
        fill: white !important;
      }
      
      .progress-content div {
        background-color: inherit !important;
      }
    }
  `}</style>
);

export default function AnalysisSummary() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { company, isLoading } = useCompanyDetails(companyId);
  const [showReportModal, setShowReportModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
        }
      } catch (error) {
        console.error('Error getting user:', error);
      }
    };
    
    getUser();
  }, []);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `${company?.name || 'Company'} - Investment Analysis`,
    onBeforeGetContent: () => {
      setIsPrinting(true);
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 300);
      });
    },
    onAfterPrint: () => {
      setIsPrinting(false);
      toast({
        title: "Print prepared",
        description: "Your analysis document has been prepared for printing",
      });
    },
    pageStyle: '@page { size: auto; margin: 0; }',
  });

  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <p>Company not found. Please return to dashboard.</p>
            <Button onClick={() => navigate('/dashboard')} className="mt-4">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formattedScore = parseFloat(company.overallScore.toFixed(1));
  console.log(`Company score: original=${company.overallScore}, formatted=${formattedScore}`);

  const chartData = company.sections.map(section => ({
    name: section.title,
    score: parseFloat(section.score.toFixed(1)),
    fill: getColorForScore(section.score)
  }));

  const CustomXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    return (
      <g transform={`translate(${x},${y})`}>
        <text 
          x={0} 
          y={0} 
          dy={16} 
          textAnchor="end" 
          fill={isPrinting ? "#ffffff" : "#666"} 
          transform="rotate(-45)"
          className="text-xs font-medium print:text-white print:font-semibold"
          style={{ fontWeight: isPrinting ? 'bold' : 'normal' }}
        >
          {payload.value}
        </text>
      </g>
    );
  };

  return (
    <>
      <PrintStyles />
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-4 no-print">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/company/${companyId}`)}
            className="no-print"
          >
            <ChevronLeft className="mr-1" /> Back to Company Details
          </Button>
          
          <div className="flex gap-2">
            {company?.reportId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReportModal(true)}
                className="no-print"
              >
                <Maximize className="mr-2 h-4 w-4" />
                View Deck
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={isPrinting}
              className="no-print"
            >
              <Printer className="mr-2 h-4 w-4" />
              {isPrinting ? "Preparing..." : "Print Analysis"}
            </Button>
          </div>
        </div>

        <div ref={printRef} className="print-container">
          <Card className="mb-8 print-shadow-none print-card">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-2xl print-text-black">{company?.name}</CardTitle>
                <div className="flex items-center">
                  <Badge variant={getScoreVariant(company.overallScore)}>
                    Score: {formattedScore}/5
                  </Badge>
                  <TooltipProvider>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 ml-1 text-muted-foreground no-print">
                          <HelpCircle className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" align="center" className="max-w-[320px] text-xs">
                        <p>{getScoreDescription(company.overallScore)}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <CardDescription className="print-text-dark">Complete analysis summary and market research</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 print-break-inside-avoid">
                <h3 className="text-lg font-medium mb-2 print-text-black">Overall Performance</h3>
                <Progress value={company.overallScore * 20} className="h-2.5 mb-2 progress-content" />
                <p className="text-sm text-muted-foreground print-text-gray">
                  {getScoreDescription(company.overallScore)}
                </p>
              </div>

              <div className="mb-8 print-break-inside-avoid">
                <h3 className="text-lg font-medium mb-4 print-text-black print-section-title">Section Performance Analysis</h3>
                <div className="h-80 print-chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        height={70} 
                        tick={<CustomXAxisTick />}
                        stroke={isPrinting ? "#ffffff" : "#666"}
                        className="print-text-black"
                      />
                      <YAxis 
                        domain={[0, 5]} 
                        tickCount={6} 
                        stroke={isPrinting ? "#ffffff" : "#666"}
                        className="print-text-black"
                      />
                      <RechartsTooltip formatter={(value) => [`${value}/5`, 'Score']} />
                      <Bar dataKey="score" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4 print-text-black print-section-title">Detailed Section Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {company.sections.map((section) => (
                    <Card key={section.id} className="overflow-hidden print-card print-break-inside-avoid">
                      <CardHeader className="bg-muted/50 pb-2">
                        <CardTitle className="text-base print-text-black">{section.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="flex items-center mb-2">
                          <span className="font-medium mr-2 print-text-black">Score: {section.score}/5</span>
                          <Progress 
                            value={section.score * 20} 
                            className={`h-2 flex-1 ${section.score >= 4 ? 'bg-green-100' : section.score >= 2.5 ? 'bg-amber-100' : 'bg-red-100'}`} 
                          />
                          <TooltipProvider>
                            <Tooltip delayDuration={300}>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 ml-1 text-muted-foreground no-print">
                                  <HelpCircle className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" align="center" className="max-w-[320px] text-xs">
                                <p>{getSectionScoreDescription(section.score, section.title)}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 print-text-dark">
                          {section.description || 'No description available'}
                        </p>
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="p-0 h-auto mt-2 no-print"
                          onClick={() => navigate(`/company/${companyId}/section/${section.id}`)}
                        >
                          View Research Details →
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {company.reportId && (
          <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
            <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>{company.name} - Analysis Report</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-auto p-1">
                <ReportViewer reportId={company.reportId} />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </>
  );
}

function getColorForScore(score: number): string {
  if (score >= 4) return '#22c55e'; // Green
  if (score >= 3) return '#84cc16'; // Lime green
  if (score >= 2) return '#facc15'; // Yellow
  if (score >= 1) return '#f97316'; // Orange
  return '#ef4444'; // Red
}

function getScoreVariant(score: number): 'default' | 'outline' | 'secondary' | 'destructive' {
  if (score >= 4) return 'default';
  if (score >= 2.5) return 'secondary';
  if (score >= 1.5) return 'outline';
  return 'destructive';
}

function getScoreDescription(score: number): string {
  if (score >= 4.5) return `Outstanding Investment Opportunity (${score}/5): This company demonstrates exceptional market position, business model, and growth metrics. Clear competitive advantages with minimal risk factors. Recommended for immediate investment consideration.`;
  if (score >= 3.5) return `Strong Investment Candidate (${score}/5): This company shows solid fundamentals with some competitive advantages, though minor concerns exist. Good potential for returns with manageable risk profile. Worth serious investment consideration.`;
  if (score >= 2.5) return `Moderate Investment Potential (${score}/5): This company has sound basic operations but several areas need improvement. Moderate risk factors exist that could impact growth. Requires careful due diligence before investment.`;
  if (score >= 1.5) return `High-Risk Investment (${score}/5): Significant flaws in business model, market approach, or financials create substantial concerns. Many improvements needed before being investment-ready. Consider only with extensive restructuring.`;
  return `Not Recommended (${score}/5): This company shows critical deficiencies across multiple dimensions, presenting unacceptable investment risk. Fundamental business model or execution issues require complete overhaul.`;
}

function getSectionScoreDescription(score: number, sectionTitle: string): string {
  const sectionSpecific = getSectionSpecificFeedback(score, sectionTitle);
  
  if (score >= 4.5) return `Outstanding (${score}/5): ${sectionSpecific}`;
  if (score >= 3.5) return `Very Good (${score}/5): ${sectionSpecific}`;
  if (score >= 2.5) return `Satisfactory (${score}/5): ${sectionSpecific}`;
  if (score >= 1.5) return `Needs Work (${score}/5): ${sectionSpecific}`;
  return `Critical Concerns (${score}/5): ${sectionSpecific}`;
}

function getSectionSpecificFeedback(score: number, sectionTitle: string): string {
  const sectionLower = sectionTitle.toLowerCase();
  
  if (sectionLower.includes("market") || sectionLower.includes("opportunity")) {
    if (score >= 3.5) return "The market analysis shows strong growth potential with well-validated TAM/SAM/SOM figures and clear understanding of market trends.";
    if (score >= 2.5) return "The market analysis presents reasonable market size and growth figures but lacks depth in competitive positioning or trend analysis.";
    return "The market analysis lacks credible data, has unrealistic market size projections, or misses critical market trends and dynamics.";
  }
  
  if (sectionLower.includes("team") || sectionLower.includes("management")) {
    if (score >= 3.5) return "The team demonstrates strong relevant experience, complementary skill sets, and proven execution ability in this domain.";
    if (score >= 2.5) return "The team has adequate experience but may lack specific expertise or track record in key business areas.";
    return "The team lacks critical experience or capabilities needed for success, with significant gaps in leadership or domain expertise.";
  }
  
  if (sectionLower.includes("product") || sectionLower.includes("solution")) {
    if (score >= 3.5) return "The product shows clear differentiation, addresses a specific need, and has demonstrable competitive advantages.";
    if (score >= 2.5) return "The product addresses a real problem but has limited differentiation or hasn't fully validated product-market fit.";
    return "The product lacks unique selling proposition, faces significant technical challenges, or doesn't effectively solve the stated problem.";
  }
  
  if (sectionLower.includes("finance") || sectionLower.includes("financial")) {
    if (score >= 3.5) return "Financial projections are realistic with clear unit economics, reasonable growth assumptions, and well-planned capital needs.";
    if (score >= 2.5) return "Financial model is structurally sound but contains optimistic assumptions or lacks detail in key operational metrics.";
    return "Financial projections lack credibility, contain major inconsistencies, or fail to demonstrate a path to profitability.";
  }
  
  if (sectionLower.includes("traction") || sectionLower.includes("metrics")) {
    if (score >= 3.5) return "Strong validated traction with growing user/customer base, improving engagement metrics, and solid revenue growth.";
    if (score >= 2.5) return "Shows early traction with some customer validation, but limited operating history or inconsistent growth metrics.";
    return "Limited or unverifiable traction, concerning churn rates, or inability to demonstrate product-market fit with actual usage data.";
  }
  
  if (sectionLower.includes("go-to-market") || sectionLower.includes("strategy") || sectionLower.includes("marketing")) {
    if (score >= 3.5) return "Well-defined customer acquisition strategy with clear channels, realistic CAC projections, and proven conversion metrics.";
    if (score >= 2.5) return "Basic customer acquisition approach is outlined but lacks detail on specific channels, conversion rates, or scaling strategies.";
    return "Go-to-market strategy is vague, lacks proven channels, or shows unrealistic customer acquisition cost assumptions.";
  }
  
  if (sectionLower.includes("competition") || sectionLower.includes("competitive")) {
    if (score >= 3.5) return "Thorough competitive analysis with clear differentiation strategy and realistic assessment of market positioning.";
    if (score >= 2.5) return "Identifies major competitors but has gaps in competitive differentiation strategy or underestimates competitive threats.";
    return "Fails to identify key competitors, lacks meaningful differentiation, or underestimates barriers to entry and competitive responses.";
  }
  
  if (sectionLower.includes("business model")) {
    if (score >= 3.5) return "Clear, sustainable revenue model with strong unit economics, reasonable pricing strategy, and multiple potential revenue streams.";
    if (score >= 2.5) return "Viable revenue model but with concerns about scalability, pricing power, or long-term margin potential.";
    return "Unclear path to sustainable revenue, problematic unit economics, or unproven business model requiring significant validation.";
  }
  
  if (score >= 3.5) return "This aspect is well-handled with strong execution and clear strategic alignment.";
  if (score >= 2.5) return "This aspect meets basic requirements but has room for improvement in execution and strategic alignment.";
  return "This aspect shows significant weaknesses that require substantial revision to meet investor expectations.";
}
