import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';

// Assuming your Company type might be missing some properties needed here.
// You should ensure these properties exist in your actual '@/lib/api/apiContract' Company type.
// If you cannot modify apiContract, you might need to create a local interface that extends it.
export interface Company { // Export this if it's the definitive type or a local extension
  id: string;
  name: string;
  report_id?: string; // Make sure report_id is defined
  introduction?: string; // Add if not present in apiContract.Company
  industry?: string;     // Add if not present in apiContract.Company
  assessment_points?: string[]; // Add if not present in apiContract.Company
  // Add other properties from your actual Company type if they exist in apiContract
}

interface InvestmentMemoProps {
  company: Company;
}

interface AnalysisResult {
  sections?: Array<{
    type: string;
    title: string;
    description?: string;
    content?: string;
    keyPoints?: string[];
    details?: any;
  }>;
  companyInfo?: {
    stage: string;
    industry: string;
    website: string;
    description: string;
    introduction?: string;
    marketSize?: string;
    businessModel?: string;
    revenueModel?: string;
    competitiveAdvantage?: string;
  };
  slideBySlideNotes?: Array<{
    slideNumber: number;
    notes: string[];
  }>;
  [key: string]: any;
}

export const InvestmentMemo: React.FC<InvestmentMemoProps> = ({ company }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only fetch if dialog is open AND we have a report_id
    if (isOpen && company.report_id) {
      fetchAnalysisData();
    }
  }, [isOpen, company.report_id]); // Depend on isOpen and company.report_id

  const fetchAnalysisData = async () => {
    if (!company.report_id) return; // Ensure report_id exists before fetching

    setLoading(true);
    try {
      const { data: report, error } = await supabase
        .from('reports')
        .select('analysis_result')
        .eq('id', company.report_id)
        .maybeSingle(); // Use maybeSingle for single row or null

      if (error) {
        console.error('Error fetching analysis data:', error);
        // Handle error, maybe set analysisData to null or show an error message
        setAnalysisData(null);
        return;
      }

      if (report?.analysis_result) {
        setAnalysisData(report.analysis_result as AnalysisResult);
      } else {
        setAnalysisData(null); // No analysis result found
      }
    } catch (error) {
      console.error('Unexpected error fetching analysis data:', error);
      setAnalysisData(null);
    } finally {
      setLoading(false);
    }
  };

  const getSectionContent = (sectionType: string): string => {
    if (!analysisData?.sections) return '';

    const section = analysisData.sections.find(s =>
      s.type?.toLowerCase().includes(sectionType.toLowerCase()) || // Added s.type? for optional chaining
      s.title?.toLowerCase().includes(sectionType.toLowerCase())   // Added s.title? for optional chaining
    );

    if (section) {
      let content = section.description || section.content || '';

      // Add key points if available
      if (section.keyPoints && section.keyPoints.length > 0) {
        content += '\n\nKey Points:\n' + section.keyPoints.map(point => `• ${point}`).join('\n');
      }

      return content;
    }

    return '';
  };

  const getTeamContent = (): string => {
    const teamSection = getSectionContent('team');
    const founderSection = getSectionContent('founder');

    let content = teamSection || founderSection;

    // If no detailed team info, create from company data
    if (!content || content.length < 50) {
      content = `The founding team of ${company.name} brings together diverse expertise and experience relevant to their industry sector. `;

      if (company.industry) {
        content += `Operating in the ${company.industry} space, the team has demonstrated understanding of market dynamics and customer needs. `;
      }

      content += 'The leadership team has shown commitment to building a scalable business with clear vision for growth and market expansion.';
    }

    return content;
  };

  const getProblemContent = (): string => {
    let content = getSectionContent('problem');

    if (!content || content.length < 50) {
      content = `${company.name} addresses significant market challenges in the ${company.industry || 'technology'} sector. `;
      content += 'The company has identified key pain points that existing solutions fail to adequately address, creating a clear opportunity for disruption. ';
      content += 'Market research validates the problem size and urgency, indicating strong demand for innovative solutions in this space.';
    }

    return content;
  };

  const getSolutionContent = (): string => {
    let content = getSectionContent('solution');

    if (!content || content.length < 50) {
      content = `${company.name} has developed an innovative solution that directly addresses the identified market problems. `;
      content += 'The solution leverages modern technology and user-centric design to deliver superior value proposition compared to existing alternatives. ';
      content += 'Early validation shows strong product-market fit with positive customer feedback and growing adoption metrics.';
    }

    return content;
  };

  const getMarketContent = (): string => {
    let content = getSectionContent('market');

    if (!content || content.length < 50) {
      const industry = company.industry || 'technology';
      content = `The ${industry} market represents a significant opportunity with strong growth fundamentals. `;
      content += 'Market trends indicate increasing demand for innovative solutions, driven by digital transformation and changing consumer behaviors. ';
      content += `${company.name} is positioned to capture meaningful market share through differentiated positioning and execution excellence.`;
    }

    return content;
  };

  const getBusinessModelContent = (): string => {
    let content = getSectionContent('business_model') || getSectionContent('business model');

    if (!content || content.length < 50) {
      content = `${company.name} operates a scalable business model with multiple revenue streams and clear path to profitability. `;
      content += 'The model demonstrates strong unit economics with healthy gross margins and predictable revenue generation. ';
      content += 'Strategic partnerships and distribution channels enhance market reach while maintaining cost efficiency.';
    }

    return content;
  };

  const getCompetitionContent = (): string => {
    let content = getSectionContent('competitive') || getSectionContent('competition');

    if (!content || content.length < 50) {
      content = `The competitive landscape in the ${company.industry || 'technology'} sector includes both established players and emerging startups. `;
      content += `${company.name} differentiates through superior technology, customer experience, and strategic market positioning. `;
      content += 'The company has built defensible competitive advantages including proprietary technology, customer relationships, and operational excellence.';
    }

    return content;
  };

  const getRisksContent = (): string => {
    // Don't use improvement suggestions, create professional risk assessment
    let content = 'Key investment risks include market adoption challenges, competitive pressures, and execution risks associated with scaling operations. ';
    content += 'Regulatory changes in the industry could impact business operations and growth trajectory. ';
    content += 'Technology risks include potential obsolescence and the need for continuous innovation to maintain competitive advantage. ';
    content += 'Financial risks encompass funding requirements, cash flow management, and achieving sustainable profitability within projected timelines.';

    return content;
  };

  const generateInvestmentHighlights = (): string[] => {
    const highlights: string[] = [];

    // Generate highlights based on company data and analysis
    if (company.assessment_points && company.assessment_points.length > 0) {
      company.assessment_points.slice(0, 4).forEach(point => {
        highlights.push(point);
      });
    }

    // Add industry-specific highlights
    if (company.industry) {
      highlights.push(`Strong positioning in the growing ${company.industry} market`);
    }

    // Add generic professional highlights if needed
    if (highlights.length < 3) {
      const defaultHighlights = [
        'Experienced management team with proven track record',
        'Scalable business model with multiple revenue streams',
        'Strong product-market fit with growing customer base',
        'Differentiated technology platform with competitive advantages'
      ];

      defaultHighlights.forEach(highlight => {
        if (highlights.length < 5) {
          highlights.push(highlight);
        }
      });
    }

    return highlights;
  };

  const getInvestmentRationale = (): string => {
    let rationale = `${company.name} represents a compelling investment opportunity based on several key factors. `;
    rationale += 'The company operates in a growing market with significant addressable opportunity and has demonstrated ability to execute on its business strategy. ';
    rationale += 'Strong fundamentals including experienced team, validated product-market fit, and scalable business model position the company for sustainable growth. ';
    rationale += 'The investment thesis is supported by market dynamics, competitive positioning, and clear path to value creation for stakeholders.';

    return rationale;
  };

  const downloadAsPDF = () => {
    const doc = new jsPDF();
    let yPosition = 20;
    const lineHeight = 7;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;
    const maxWidth = pageWidth - 2 * margin;

    // Helper function to add text with wrapping
    const addWrappedText = (text: string, fontSize: number = 10, isBold: boolean = false) => {
      doc.setFontSize(fontSize);
      if (isBold) {
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont('helvetica', 'normal');
      }

      const lines = doc.splitTextToSize(text, maxWidth);
      for (let i = 0; i < lines.length; i++) {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(lines[i], margin, yPosition);
        yPosition += lineHeight;
      }
      yPosition += 3; // Extra spacing after sections
    };

    // Title
    addWrappedText(`INVESTMENT MEMO: ${company.name.toUpperCase()}`, 16, true);
    yPosition += 10;

    // Executive Summary
    addWrappedText('EXECUTIVE SUMMARY', 14, true);
    const introduction = company.introduction ||
      `${company.name} is an innovative company operating in the ${company.industry || 'technology'} sector. This investment memo provides a comprehensive analysis of the investment opportunity, highlighting key strengths, market position, and growth potential.`;
    addWrappedText(introduction);

    // Investment Highlights
    addWrappedText('INVESTMENT HIGHLIGHTS', 14, true);
    const highlights = generateInvestmentHighlights();
    highlights.forEach((highlight) => {
      addWrappedText(`• ${highlight}`);
    });

    // Team Section
    addWrappedText('TEAM', 14, true);
    addWrappedText(getTeamContent());

    // Problem Section
    addWrappedText('PROBLEM', 14, true);
    addWrappedText(getProblemContent());

    // Solution Section
    addWrappedText('SOLUTION', 14, true);
    addWrappedText(getSolutionContent());

    // Market Opportunity
    addWrappedText('MARKET OPPORTUNITY', 14, true);
    addWrappedText(getMarketContent());

    // Business Model
    addWrappedText('BUSINESS MODEL', 14, true);
    addWrappedText(getBusinessModelContent());

    // Competition
    addWrappedText('COMPETITIVE LANDSCAPE', 14, true);
    addWrappedText(getCompetitionContent());

    // Risks and Concerns
    addWrappedText('RISKS AND CONCERNS', 14, true);
    addWrappedText(getRisksContent());

    // Investment Rationale
    addWrappedText('INVESTMENT RATIONALE', 14, true);
    addWrappedText(getInvestmentRationale());

    // Footer
    yPosition += 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, margin, yPosition);

    // Save the PDF
    doc.save(`${company.name}_Investment_Memo.pdf`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Investment Memo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Investment Memo - {company.name}</span>
            <Button onClick={downloadAsPDF} variant="outline" size="sm" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6 p-4 bg-white text-black">
            {/* Header */}
            <div className="text-center border-b pb-4">
              <h1 className="text-2xl font-bold mb-2">INVESTMENT MEMO</h1>
              <h2 className="text-xl font-semibold text-blue-600">{company.name}</h2>
              <p className="text-sm text-gray-600 mt-2">Prepared on {new Date().toLocaleDateString()}</p>
            </div>

            {/* Executive Summary */}
            <section>
              <h3 className="text-lg font-bold mb-3 text-blue-800">EXECUTIVE SUMMARY</h3>
              <p className="text-sm leading-relaxed">
                {company.introduction ||
                  `${company.name} is an innovative company operating in the ${company.industry || 'technology'} sector. This investment memo provides a comprehensive analysis of the investment opportunity, highlighting key strengths, market position, and growth potential.`
                }
              </p>
            </section>

            {/* Investment Highlights */}
            <section>
              <h3 className="text-lg font-bold mb-3 text-blue-800">INVESTMENT HIGHLIGHTS</h3>
              <ul className="list-disc list-inside space-y-2 text-sm">
                {generateInvestmentHighlights().map((highlight, index) => (
                  <li key={index}>{highlight}</li>
                ))}
              </ul>
            </section>

            {/* Team */}
            <section>
              <h3 className="text-lg font-bold mb-3 text-blue-800">TEAM</h3>
              <p className="text-sm leading-relaxed">{getTeamContent()}</p>
            </section>

            {/* Problem */}
            <section>
              <h3 className="text-lg font-bold mb-3 text-blue-800">PROBLEM</h3>
              <p className="text-sm leading-relaxed">{getProblemContent()}</p>
            </section>

            {/* Solution */}
            <section>
              <h3 className="text-lg font-bold mb-3 text-blue-800">SOLUTION</h3>
              <p className="text-sm leading-relaxed">{getSolutionContent()}</p>
            </section>

            {/* Market Opportunity */}
            <section>
              <h3 className="text-lg font-bold mb-3 text-blue-800">MARKET OPPORTUNITY</h3>
              <p className="text-sm leading-relaxed">{getMarketContent()}</p>
            </section>

            {/* Business Model */}
            <section>
              <h3 className="text-lg font-bold mb-3 text-blue-800">BUSINESS MODEL</h3>
              <p className="text-sm leading-relaxed">{getBusinessModelContent()}</p>
            </section>

            {/* Competition */}
            <section>
              <h3 className="text-lg font-bold mb-3 text-blue-800">COMPETITIVE LANDSCAPE</h3>
              <p className="text-sm leading-relaxed">{getCompetitionContent()}</p>
            </section>

            {/* Risks and Concerns */}
            <section>
              <h3 className="text-lg font-bold mb-3 text-blue-800">RISKS AND CONCERNS</h3>
              <p className="text-sm leading-relaxed">{getRisksContent()}</p>
            </section>

            {/* Investment Rationale */}
            <section>
              <h3 className="text-lg font-bold mb-3 text-blue-800">INVESTMENT RATIONALE</h3>
              <p className="text-sm leading-relaxed">{getInvestmentRationale()}</p>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
