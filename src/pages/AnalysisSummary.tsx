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
        margin: 10mm;
        size: auto;
      }
      
      html, body {
        margin: 0;
        padding: 0;
        background-color: #1a1a1a !important;
        color: white !important;
        font-size: 11pt !important;
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
      
      .print-page-break {
        page-break-after: always !important;
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
        padding: 20px !important;
      }
      
      .print-text-white {
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
        font-size: 24pt !important;
        font-weight: bold !important;
        margin-bottom: 8px !important;
        color: white !important;
        text-align: center !important;
      }
      
      .print-subtitle {
        font-size: 16pt !important;
        margin-top: 0 !important;
        margin-bottom: 24px !important;
        color: #bbb !important;
        text-align: center !important;
      }
      
      .print-header, .print-footer {
        display: none !important;
      }
      
      .print-section-title {
        font-size: 14pt !important;
        font-weight: bold !important;
        margin-top: 20px !important;
        margin-bottom: 10px !important;
        color: white !important;
        border-bottom: 1px solid #444 !important;
        padding-bottom: 5px !important;
      }
      
      .print-section-content {
        margin-bottom: 15px !important;
      }
      
      .print-section {
        margin-bottom: 30px !important;
      }
      
      .print-memo-header {
        text-align: center !important;
        margin-bottom: 30px !important;
      }
      
      .print-company-meta {
        display: flex !important;
        justify-content: center !important;
        flex-wrap: wrap !important;
        gap: 15px !important;
        margin-bottom: 20px !important;
        color: #bbb !important;
      }
      
      .print-company-meta-item {
        font-size: 10pt !important;
      }
      
      .print-score-container {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        margin: 20px 0 !important;
      }
      
      .print-score-badge {
        padding: 5px 15px !important;
        border-radius: 9999px !important;
        font-weight: bold !important;
        font-size: 14pt !important;
        background-color: #334155 !important;
        color: white !important;
      }
      
      .print-score-excellent {
        background-color: #22c55e !important;
      }
      
      .print-score-good {
        background-color: #84cc16 !important;
      }
      
      .print-score-average {
        background-color: #facc15 !important;
        color: #1a1a1a !important;
      }
      
      .print-score-poor {
        background-color: #f97316 !important;
      }
      
      .print-score-critical {
        background-color: #ef4444 !important;
      }
      
      .print-assessment-items {
        margin-top: 10px !important;
      }
      
      .print-assessment-item {
        margin-bottom: 8px !important;
        display: flex !important;
      }
      
      .print-assessment-item:before {
        content: "•" !important;
        margin-right: 10px !important;
        color: #bbb !important;
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
      
      .print-date {
        text-align: right !important;
        font-size: 9pt !important;
        color: #999 !important;
        margin-bottom: 20px !important;
      }
      
      .progress-content div {
        background-color: inherit !important;
      }
      
      .print-section-content ul {
        list-style-type: disc !important;
        padding-left: 20px !important;
        margin-top: 10px !important;
      }
      
      .print-section-content ul li {
        margin-bottom: 5px !important;
      }
      
      .print-insights-list {
        padding-left: 20px !important;
      }
      
      .print-insights-item {
        margin-bottom: 5px !important;
        position: relative !important;
      }
      
      .print-insights-item:before {
        content: "•" !important;
        position: absolute !important;
        left: -18px !important;
        color: #bbb !important;
      }
      
      .print-strengths {
        color: #22c55e !important;
      }
      
      .print-weaknesses {
        color: #ef4444 !important;
      }
    }
  `}</style>
);

export default function AnalysisSummary() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { company, isLoading } = useCompanyDetails(companyId);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [sectionDetails, setSectionDetails] = useState<{
    [key: string]: { strengths: string[], weaknesses: string[] }
  }>({});
  
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

  useEffect(() => {
    const fetchSectionDetails = async () => {
      if (!company?.id) return;

      try {
        // Fetch all sections for this company
        const { data: sections, error: sectionsError } = await supabase
          .from('sections')
          .select('id, title, type')
          .eq('company_id', company.id);

        if (sectionsError) throw sectionsError;
        
        const details: { [key: string]: { strengths: string[], weaknesses: string[] } } = {};
        
        // Fetch details for each section
        for (const section of sections || []) {
          const { data: sectionDetails, error: detailsError } = await supabase
            .from('section_details')
            .select('content, detail_type')
            .eq('section_id', section.id);
            
          if (detailsError) throw detailsError;
          
          details[section.title] = {
            strengths: sectionDetails?.filter(d => d.detail_type === 'strength').map(d => d.content) || [],
            weaknesses: sectionDetails?.filter(d => d.detail_type === 'weakness').map(d => d.content) || []
          };
        }
        
        setSectionDetails(details);
      } catch (error) {
        console.error('Error fetching section details:', error);
      }
    };
    
    if (company) {
      fetchSectionDetails();
    }
  }, [company]);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `${company?.name || 'Company'} - Investment Memo`,
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
        title: "Investment Memo prepared",
        description: "Your investment memo has been prepared for printing",
      });
      // Don't close the modal automatically after printing
      // so user can see what was printed and close manually
    },
    pageStyle: '@page { size: auto; margin: 10mm; }',
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

  const getSectionInsights = (sectionName: string) => {
    const normalizedName = sectionName.toLowerCase();
    
    // Find the matching section by normalizing titles
    const key = Object.keys(sectionDetails).find(title => 
      title.toLowerCase().includes(normalizedName) || 
      normalizedName.includes(title.toLowerCase())
    );
    
    if (key && sectionDetails[key]) {
      return sectionDetails[key];
    }
    
    return { strengths: [], weaknesses: [] };
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
              onClick={() => setShowPrintModal(true)}
              className="no-print"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print Investment Memo
            </Button>
          </div>
        </div>

        {/* Main content of the Analysis Summary page */}
        <Card className="mb-4 print-shadow-none print-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-2xl font-bold">
              {company.name}
            </CardTitle>
            <HelpCircle className="h-5 w-5 text-gray-500 cursor-pointer" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Company Overview</h3>
                <p className="text-muted-foreground">
                  {company.companyDetails?.description || 'No description available.'}
                </p>
                <div className="mt-4">
                  <Badge variant={getScoreVariant(company.overallScore)}>
                    Overall Score: {formattedScore}/5
                  </Badge>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {getScoreDescription(company.overallScore)}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Key Metrics</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Market Opportunity:</p>
                    <Progress value={company.marketScore * 20} className="h-4" />
                    <p className="text-xs text-muted-foreground">
                      {getSectionScoreDescription(company.marketScore, "Market Opportunity")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Team:</p>
                    <Progress value={company.teamScore * 20} className="h-4" />
                    <p className="text-xs text-muted-foreground">
                      {getSectionScoreDescription(company.teamScore, "Team")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Product:</p>
                    <Progress value={company.productScore * 20} className="h-4" />
                    <p className="text-xs text-muted-foreground">
                      {getSectionScoreDescription(company.productScore, "Product")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Financials:</p>
                    <Progress value={company.financialsScore * 20} className="h-4" />
                    <p className="text-xs text-muted-foreground">
                      {getSectionScoreDescription(company.financialsScore, "Financials")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Traction:</p>
                    <Progress value={company.tractionScore * 20} className="h-4" />
                    <p className="text-xs text-muted-foreground">
                      {getSectionScoreDescription(company.tractionScore, "Traction")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Go-to-Market:</p>
                    <Progress value={company.goToMarketScore * 20} className="h-4" />
                    <p className="text-xs text-muted-foreground">
                      {getSectionScoreDescription(company.goToMarketScore, "Go-to-Market")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Competitive Landscape:</p>
                    <Progress value={company.competitiveScore * 20} className="h-4" />
                    <p className="text-xs text-muted-foreground">
                      {getSectionScoreDescription(company.competitiveScore, "Competitive Landscape")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Business Model:</p>
                    <Progress value={company.businessModelScore * 20} className="h-4" />
                    <p className="text-xs text-muted-foreground">
                      {getSectionScoreDescription(company.businessModelScore, "Business Model")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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

        {/* Print Investment Memo Dialog */}
        <Dialog 
          open={showPrintModal} 
          onOpenChange={(open) => {
            setShowPrintModal(open);
            if (open) {
              // Reset printing state when opening the dialog
              setIsPrinting(false);
            }
          }}
        >
          <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{company.name} - Investment Memo</DialogTitle>
            </DialogHeader>
            <div className="flex justify-end mb-4">
              <Button
                onClick={handlePrint}
                disabled={isPrinting}
              >
                <Printer className="mr-2 h-4 w-4" />
                {isPrinting ? "Preparing..." : "Print Memo"}
              </Button>
            </div>
            
            {/* Print Content */}
            <div ref={printRef} className="print-container">
              {/* Investment Memo Format */}
              <div className="print-memo-header">
                <h1 className="print-title">{company?.name} - Investment Memo</h1>
                <div className="print-company-meta">
                  {company?.companyDetails?.website && (
                    <span className="print-company-meta-item">
                      Website: {company.companyDetails.website}
                    </span>
                  )}
                  {company?.companyDetails?.stage && (
                    <span className="print-company-meta-item">
                      Stage: {company.companyDetails.stage}
                    </span>
                  )}
                  {company?.companyDetails?.industry && (
                    <span className="print-company-meta-item">
                      Industry: {company.companyDetails.industry}
                    </span>
                  )}
                </div>
                <div className="print-date">
                  Generated on {currentDate}
                </div>
              </div>

              {/* 2. Score */}
              <div className="print-section">
                <div className="print-score-container">
                  <div className={`print-score-badge ${getScoreColor(company.overallScore)}`}>
                    Investment Score: {formattedScore}/5
                  </div>
                </div>
                <p className="print-text-gray text-center">
                  {getScoreDescription(company.overallScore)}
                </p>
              </div>
              
              {/* 3. Overall Assessment */}
              <div className="print-section">
                <h2 className="print-section-title">Overall Assessment</h2>
                <div className="print-section-content">
                  <div className="print-assessment-items">
                    {company.assessmentPoints && company.assessmentPoints.map((point, index) => (
                      <div key={index} className="print-assessment-item">
                        {point}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. The Graph */}
              <div className="print-section print-break-inside-avoid">
                <h2 className="print-section-title">Performance Analysis by Category</h2>
                <div className="print-chart-container">
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
                      />
                      <YAxis 
                        domain={[0, 5]} 
                        tickCount={6} 
                        stroke={isPrinting ? "#ffffff" : "#666"}
                      />
                      <RechartsTooltip formatter={(value) => [`${value}/5`, 'Score']} />
                      <Bar dataKey="score" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 5. Problem Statement */}
              <div className="print-section">
                <h2 className="print-section-title">Problem Statement</h2>
                <div className="print-section-content">
                  {renderSectionInsights(getSectionInsights('problem'))}
                </div>
              </div>

              {/* 6. Market Opportunity */}
              <div className="print-section">
                <h2 className="print-section-title">Market Opportunity</h2>
                <div className="print-section-content">
                  {renderSectionInsights(getSectionInsights('market'))}
                </div>
              </div>

              {/* 7. Solution */}
              <div className="print-section">
                <h2 className="print-section-title">Solution</h2>
                <div className="print-section-content">
                  {renderSectionInsights(getSectionInsights('solution'))}
                </div>
              </div>

              {/* 8. Competitive Landscape */}
              <div className="print-section">
                <h2 className="print-section-title">Competitive Landscape</h2>
                <div className="print-section-content">
                  {renderSectionInsights(getSectionInsights('competitive'))}
                </div>
              </div>

              {/* 9. Traction */}
              <div className="print-section">
                <h2 className="print-section-title">Traction</h2>
                <div className="print-section-content">
                  {renderSectionInsights(getSectionInsights('traction'))}
                </div>
              </div>

              {/* 10. Business Model */}
              <div className="print-section">
                <h2 className="print-section-title">Business Model</h2>
                <div className="print-section-content">
                  {renderSectionInsights(getSectionInsights('business model'))}
                </div>
              </div>

              {/* 11. Go-to-market Strategy */}
              <div className="print-section">
                <h2 className="print-section-title">Go-to-market Strategy</h2>
                <div className="print-section-content">
                  {renderSectionInsights(getSectionInsights('go-to-market'))}
                </div>
              </div>

              {/* 12. Team */}
              <div className="print-section">
                <h2 className="print-section-title">Team</h2>
                <div className="print-section-content">
                  {renderSectionInsights(getSectionInsights('team'))}
                </div>
              </div>

              {/* 13. Financials */}
              <div className="print-section">
                <h2 className="print-section-title">Financials</h2>
                <div className="print-section-content">
                  {renderSectionInsights(getSectionInsights('financials'))}
                </div>
              </div>

              {/* 14. The Ask */}
              <div className="print-section">
                <h2 className="print-section-title">The Ask</h2>
                <div className="print-section-content">
                  {renderSectionInsights(getSectionInsights('ask'))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

// Helper function to render section strengths and weaknesses
function renderSectionInsights(insights: { strengths: string[], weaknesses: string[] }) {
  if ((!insights.strengths || insights.strengths.length === 0) && 
      (!insights.weaknesses || insights.weaknesses.length === 0)) {
    return <p className="text-muted-foreground print-text-gray">No specific insights available.</p>;
  }
  
  return (
    <div>
      {insights.strengths && insights.strengths.length > 0 && (
        <div className="mb-3">
          <p className="font-medium print-strengths">Strengths:</p>
          <div className="print-insights-list">
            {insights.strengths.map((strength, idx) => (
              <div key={`strength-${idx}`} className="print-insights-item">
                {strength}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {insights.weaknesses && insights.weaknesses.length > 0 && (
        <div>
          <p className="font-medium print-weaknesses">Weaknesses:</p>
          <div className="print-insights-list">
            {insights.weaknesses.map((weakness, idx) => (
              <div key={`weakness-${idx}`} className="print-insights-item">
                {weakness}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getColorForScore(score: number): string {
  if (score >= 4) return '#22c55e'; // Green
  if (score >= 3) return '#84cc16'; // Lime green
  if (score >= 2) return '#facc15'; // Yellow
  if (score >= 1) return '#f97316'; // Orange
  return '#ef4444'; // Red
}

function getScoreColor(score: number): string {
  if (score >= 4.5) return "print-score-excellent";
  if (score >= 3.5) return "print-score-good";
  if (score >= 2.5) return "print-score-average";
  if (score >= 1.5) return "print-score-poor";
  return "print-score-critical";
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
    if (score >= 3.5) return "The product demonstrates strong innovation, clear product-market fit, and compelling differentiation from competitors.";
    if (score >= 2.5) return "The product solves a real problem but may lack strong differentiation or have some technical limitations.";
    return "The product has critical flaws in design, lacks clear differentiation, or fails to address the stated problem effectively.";
  }
  
  if (sectionLower.includes("financials") || sectionLower.includes("finance")) {
    if (score >= 3.5) return "Financial projections are realistic and well-supported by market data and unit economics. The company demonstrates a clear path to profitability.";
    if (score >= 2.5) return "Financial model is generally sound but contains some optimistic assumptions or lacks detailed unit economics analysis.";
    return "Financial projections are unrealistic, with major gaps in understanding of unit economics or capital requirements.";
  }
  
  if (sectionLower.includes("traction")) {
    if (score >= 3.5) return "Strong demonstrated traction with validated customer interest, expanding user base, and positive growth trajectory.";
    if (score >= 2.5) return "Some early traction indicators but limited historical data or slower-than-expected user adoption.";
    return "Minimal verifiable traction, with limited customer validation or concerning churn metrics.";
  }
  
  if (sectionLower.includes("go") && sectionLower.includes("market")) {
    if (score >= 3.5) return "Clear go-to-market strategy with well-defined customer acquisition channels, reasonable CAC projections, and strong sales approach.";
    if (score >= 2.5) return "Basic go-to-market approach defined but may lack detailed channel strategy or have unclear customer acquisition economics.";
    return "Inadequate go-to-market plan with unrealistic customer acquisition costs or poorly defined sales strategy.";
  }
  
  if (sectionLower.includes("competitive")) {
    if (score >= 3.5) return "Strong competitive positioning with clear differentiation and sustainable advantages in a well-understood competitive landscape.";
    if (score >= 2.5) return "Adequate competitive analysis but with some gaps in differentiation strategy or vulnerability to larger competitors.";
    return "Poor understanding of the competitive landscape with limited differentiation or clear vulnerability to existing solutions.";
  }
  
  if (sectionLower.includes("business") && sectionLower.includes("model")) {
    if (score >= 3.5) return "Well-defined business model with clear revenue streams, strong unit economics, and scalable approach.";
    if (score >= 2.5) return "Plausible business model but with some concerns about long-term sustainability or scalability.";
    return "Poorly defined business model with fundamental flaws in revenue generation approach or unsustainable economics.";
  }
  
  // Default feedback for other sections
  if (score >= 3.5) return "Shows strong performance and potential in this area with minimal concerns.";
  if (score >= 2.5) return "Demonstrates adequate capability in this area but with room for improvement.";
  return "Shows significant weaknesses in this area requiring substantial improvement.";
}
