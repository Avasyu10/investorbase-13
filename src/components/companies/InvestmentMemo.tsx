
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Company } from '@/lib/api/apiContract';
import jsPDF from 'jspdf';

interface InvestmentMemoProps {
  company: Company;
}

interface AnalysisResult {
  sections?: Array<{
    type: string;
    title: string;
    description?: string;
    score?: number;
    content?: string;
  }>;
  slideBySlideNotes?: Array<{
    slideNumber: number;
    notes: string[];
  }>;
  improvementSuggestions?: string[];
  [key: string]: any;
}

export const InvestmentMemo: React.FC<InvestmentMemoProps> = ({ company }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && company.report_id) {
      fetchAnalysisData();
    }
  }, [isOpen, company.report_id]);

  const fetchAnalysisData = async () => {
    if (!company.report_id) return;

    setLoading(true);
    try {
      const { data: report } = await supabase
        .from('reports')
        .select('analysis_result')
        .eq('id', company.report_id)
        .maybeSingle();

      if (report?.analysis_result) {
        setAnalysisData(report.analysis_result as AnalysisResult);
      }
    } catch (error) {
      console.error('Error fetching analysis data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSectionContent = (sectionType: string): string => {
    if (!analysisData?.sections) return 'Analysis pending...';
    
    const section = analysisData.sections.find(s => 
      s.type.toLowerCase().includes(sectionType.toLowerCase()) ||
      s.title.toLowerCase().includes(sectionType.toLowerCase())
    );
    
    return section?.description || section?.content || 'No detailed analysis available for this section.';
  };

  const getTeamContent = (): string => {
    const teamSection = getSectionContent('team');
    const founderSection = getSectionContent('founder');
    return teamSection !== 'Analysis pending...' ? teamSection : founderSection;
  };

  const generateInvestmentHighlights = (): string[] => {
    const highlights: string[] = [];
    
    if (company.overall_score > 70) {
      highlights.push('Strong overall investment score indicating high potential');
    }
    
    if (company.industry) {
      highlights.push(`Operating in ${company.industry} sector with growth opportunities`);
    }
    
    if (company.assessment_points && company.assessment_points.length > 0) {
      highlights.push(...company.assessment_points.slice(0, 3));
    }
    
    if (analysisData?.sections) {
      const highScoringSection = analysisData.sections.find(s => s.score && s.score > 8);
      if (highScoringSection) {
        highlights.push(`Strong ${highScoringSection.title.toLowerCase()} with excellent execution`);
      }
    }
    
    return highlights.length > 0 ? highlights : [
      'Innovative business model with market potential',
      'Experienced team with relevant industry expertise',
      'Scalable technology platform'
    ];
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

    // Introduction
    addWrappedText('EXECUTIVE SUMMARY', 14, true);
    const introduction = company.introduction || 
      `${company.name} is an innovative company operating in the ${company.industry || 'technology'} sector. This investment memo provides a comprehensive analysis of the investment opportunity, highlighting key strengths, market position, and growth potential.`;
    addWrappedText(introduction);

    // Investment Highlights
    addWrappedText('INVESTMENT HIGHLIGHTS', 14, true);
    const highlights = generateInvestmentHighlights();
    highlights.forEach((highlight, index) => {
      addWrappedText(`• ${highlight}`);
    });

    // Team Section
    addWrappedText('TEAM', 14, true);
    addWrappedText(getTeamContent());

    // Problem Section
    addWrappedText('PROBLEM', 14, true);
    addWrappedText(getSectionContent('problem'));

    // Solution Section
    addWrappedText('SOLUTION', 14, true);
    addWrappedText(getSectionContent('solution'));

    // Market Opportunity
    addWrappedText('MARKET OPPORTUNITY', 14, true);
    addWrappedText(getSectionContent('market'));

    // Business Model
    addWrappedText('BUSINESS MODEL', 14, true);
    addWrappedText(getSectionContent('business_model'));

    // Competition
    addWrappedText('COMPETITIVE LANDSCAPE', 14, true);
    addWrappedText(getSectionContent('competitive'));

    // Risks and Concerns
    addWrappedText('RISKS AND CONCERNS', 14, true);
    const risks = analysisData?.improvementSuggestions?.length > 0 
      ? analysisData.improvementSuggestions.join('. ') + '.'
      : 'Standard market risks associated with early-stage companies including execution risk, market adoption challenges, and competitive pressures.';
    addWrappedText(risks);

    // Investment Rationale
    addWrappedText('INVESTMENT RATIONALE', 14, true);
    const rationale = company.scoring_reason || 
      `Based on our analysis, ${company.name} presents a compelling investment opportunity with a score of ${Math.round(company.overall_score)}/100. The company demonstrates strong fundamentals across key evaluation criteria including team capability, market opportunity, and business model viability.`;
    addWrappedText(rationale);

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
              <p className="text-sm leading-relaxed">{getSectionContent('problem')}</p>
            </section>

            {/* Solution */}
            <section>
              <h3 className="text-lg font-bold mb-3 text-blue-800">SOLUTION</h3>
              <p className="text-sm leading-relaxed">{getSectionContent('solution')}</p>
            </section>

            {/* Market Opportunity */}
            <section>
              <h3 className="text-lg font-bold mb-3 text-blue-800">MARKET OPPORTUNITY</h3>
              <p className="text-sm leading-relaxed">{getSectionContent('market')}</p>
            </section>

            {/* Business Model */}
            <section>
              <h3 className="text-lg font-bold mb-3 text-blue-800">BUSINESS MODEL</h3>
              <p className="text-sm leading-relaxed">{getSectionContent('business_model')}</p>
            </section>

            {/* Competition */}
            <section>
              <h3 className="text-lg font-bold mb-3 text-blue-800">COMPETITIVE LANDSCAPE</h3>
              <p className="text-sm leading-relaxed">{getSectionContent('competitive')}</p>
            </section>

            {/* Risks and Concerns */}
            <section>
              <h3 className="text-lg font-bold mb-3 text-blue-800">RISKS AND CONCERNS</h3>
              <p className="text-sm leading-relaxed">
                {analysisData?.improvementSuggestions?.length > 0 
                  ? analysisData.improvementSuggestions.join('. ') + '.'
                  : 'Standard market risks associated with early-stage companies including execution risk, market adoption challenges, and competitive pressures.'
                }
              </p>
            </section>

            {/* Investment Rationale */}
            <section>
              <h3 className="text-lg font-bold mb-3 text-blue-800">INVESTMENT RATIONALE</h3>
              <p className="text-sm leading-relaxed">
                {company.scoring_reason || 
                  `Based on our analysis, ${company.name} presents a compelling investment opportunity with a score of ${Math.round(company.overall_score)}/100. The company demonstrates strong fundamentals across key evaluation criteria including team capability, market opportunity, and business model viability.`
                }
              </p>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
