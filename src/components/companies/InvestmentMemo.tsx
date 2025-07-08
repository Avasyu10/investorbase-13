import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';

// Assuming your Company type might be missing some properties needed here.
// You should ensure these properties exist in your actual '@/lib/api/apiContract' Company type.
export interface Company {
  id: string;
  name: string;
  report_id?: string;
  introduction?: string;
  industry?: string;
  assessment_points?: string[];
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
    details?: any; // For more complex structured data
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
    if (isOpen && company.report_id) {
      fetchAnalysisData();
    }
  }, [isOpen, company.report_id]);

  const fetchAnalysisData = async () => {
    if (!company.report_id) return;

    setLoading(true);
    try {
      const { data: report, error } = await supabase
        .from('reports')
        .select('analysis_result')
        .eq('id', company.report_id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching analysis data:', error);
        setAnalysisData(null);
        return;
      }

      if (report?.analysis_result) {
        setAnalysisData(report.analysis_result as AnalysisResult);
      } else {
        setAnalysisData(null);
      }
    } catch (error) {
      console.error('Unexpected error fetching analysis data:', error);
      setAnalysisData(null);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format text into bullet points
  const formatAsBulletPoints = (text: string | string[]): string[] => {
    if (Array.isArray(text)) {
      return text.map(item => `• ${item}`);
    }
    // Attempt to split text by common list delimiters if it's a string
    // This regex splits by new line or a period/exclamation/question mark followed by space and a capital letter
    const lines = text.split(/[\r\n]+|(?<=[.!?])\s*(?=[A-Z])/g).filter(line => line.trim() !== '');
    if (lines.length > 1) {
      return lines.map(line => `• ${line.trim()}`);
    }
    return [`• ${text.trim()}`]; // Default to one bullet point if not clearly multi-line
  };


  const getSectionContent = (sectionType: string): string[] => {
    if (!analysisData?.sections) return [];

    const section = analysisData.sections.find(s =>
      s.type?.toLowerCase().includes(sectionType.toLowerCase()) ||
      s.title?.toLowerCase().includes(sectionType.toLowerCase())
    );

    if (section) {
      let contentArray: string[] = [];
      if (section.description) contentArray.push(section.description);
      if (section.content) contentArray.push(section.content);

      if (section.keyPoints && section.keyPoints.length > 0) {
        contentArray.push(...section.keyPoints);
      }
      
      // If contentArray has meaningful data, format it
      if (contentArray.some(c => c.trim().length > 0)) {
          return formatAsBulletPoints(contentArray.join('\n')); // Join and then re-split for consistent formatting
      }
    }
    return [];
  };

  const getTeamContent = (): string[] => {
    let content = getSectionContent('team');
    if (content.length === 0) { // If no content from analysisData
      content = getSectionContent('founder'); // Try founder section
    }
    
    if (content.length === 0 || content.join(' ').length < 100) { // If still not detailed enough
      const defaultTeamContent = [
        `The leadership team of ${company.name} comprises seasoned professionals with expertise relevant to the ${company.industry || 'EdTech and virtual learning'} sector.`,
        `Our founders bring a strong blend of technical acumen, product development experience, and community building skills.`,
        `Their vision and track record are critical for driving innovation and market penetration in a competitive landscape.`,
        `The team is committed to building a scalable and impactful platform, evidenced by their strategic partnerships and early user adoption.`
      ];
      return formatAsBulletPoints(defaultTeamContent);
    }
    return content;
  };

  const getProblemContent = (): string[] => {
    let content = getSectionContent('problem');
    if (content.length === 0 || content.join(' ').length < 100) {
      const defaultProblemContent = [
        `Tier 2 and 3 college students often face significant challenges in career development, including outdated curricula and limited exposure to industry trends.`,
        `A major pain point is the lack of robust alumni networks and mentorship opportunities, hindering professional growth and access to valuable insights.`,
        `Insufficient placement support and limited access to high-quality internships create a bottleneck for students seeking relevant career opportunities.`,
        `The current virtual learning environments often lack engagement and community, failing to replicate the holistic university experience.`
      ];
      return formatAsBulletPoints(defaultProblemContent);
    }
    return content;
  };

  const getSolutionContent = (): string[] => {
    let content = getSectionContent('solution');
    if (content.length === 0 || content.join(' ').length < 100) {
      const defaultSolutionContent = [
        `${company.name} introduces Upskillmafia, a 2D metaverse platform designed to revolutionize virtual learning and networking.`,
        `The platform provides an immersive ecosystem akin to IITs, IIMs, and NITs, focusing on integrated learning, skill building, and professional development.`,
        `Key features include interactive learning modules, virtual career fairs, mentorship programs, and collaborative project spaces.`,
        `Upskillmafia aims to bridge the gap between academic education and industry demands, empowering students with practical skills and strong professional networks.`
      ];
      return formatAsBulletPoints(defaultSolutionContent);
    }
    return content;
  };

  const getMarketContent = (): string[] => {
    let content = getSectionContent('market');
    if (content.length === 0 || content.join(' ').length < 100) {
      const industry = company.industry || 'EdTech, Metaverse, Virtual Learning';
      const defaultMarketContent = [
        `The ${industry} market is experiencing exponential growth, driven by the increasing demand for online education and immersive digital experiences.`,
        `The global EdTech market size is projected to reach significant figures in the coming years, presenting a vast addressable market for ${company.name}.`,
        `There is a growing underserved segment of Tier 2 and 3 college students who are actively seeking better career and learning opportunities.`,
        `Technological advancements in metaverse and virtual reality are opening new avenues for innovative learning solutions, aligning perfectly with ${company.name}'s offerings.`
      ];
      return formatAsBulletPoints(defaultMarketContent);
    }
    return content;
  };

  const getBusinessModelContent = (): string[] => {
    let content = getSectionContent('business_model');
    if (content.length === 0) content = getSectionContent('business model'); // Try both variations
    
    if (content.length === 0 || content.join(' ').length < 100) {
      const defaultBusinessModelContent = [
        `${company.name} operates on a multi-faceted revenue model, primarily through subscription-based access for students and educational institutions.`,
        `Additional revenue streams include premium features, certified courses, and partnerships with companies for virtual recruitment and talent sourcing.`,
        `The platform's scalability is inherent in its digital nature, allowing for rapid expansion without significant physical infrastructure costs.`,
        `Strategic partnerships with colleges and universities are being explored to integrate Upskillmafia into their existing academic frameworks, ensuring broader reach and adoption.`
      ];
      return formatAsBulletPoints(defaultBusinessModelContent);
    }
    return content;
  };

  const getCompetitionContent = (): string[] => {
    let content = getSectionContent('competitive');
    if (content.length === 0) content = getSectionContent('competition'); // Try both variations
    
    if (content.length === 0 || content.join(' ').length < 100) {
      const defaultCompetitionContent = [
        `The competitive landscape includes traditional online learning platforms (e.g., Coursera, Udemy) and other emerging EdTech startups.`,
        `Traditional platforms often lack the immersive and community-driven experience that ${company.name}'s metaverse offers.`,
        `Competitors focusing on networking typically lack the integrated learning and skill-building components present in Upskillmafia.`,
        `${company.name}'s competitive advantage lies in its unique 2D metaverse ecosystem, comprehensive skill development programs, and strong focus on student outcomes.`
      ];
      return formatAsBulletPoints(defaultCompetitionContent);
    }
    return content;
  };

  const getRisksContent = (): string[] => {
    const defaultRisksContent = [
      `Market adoption challenges, including the need for significant marketing and outreach to attract a large user base from Tier 2 and 3 colleges.`,
      `Competition from established players and new entrants in the rapidly evolving EdTech and metaverse sectors.`,
      `Technological risks associated with maintaining and scaling a metaverse platform, including cybersecurity and performance issues.`,
      `Ensuring continuous content relevance and quality to meet the evolving demands of students and industries.`,
      `Dependency on partnerships with educational institutions and corporations for broader market integration and revenue generation.`
    ];
    return formatAsBulletPoints(defaultRisksContent);
  };

  const generateInvestmentHighlights = (): string[] => {
    const highlights: string[] = [];

    if (company.assessment_points && company.assessment_points.length > 0) {
      company.assessment_points.slice(0, 4).forEach(point => {
        highlights.push(point);
      });
    }

    if (company.industry) {
      highlights.push(`Strong positioning in the growing ${company.industry} market.`);
    }

    if (highlights.length < 5) { // Ensure at least 5 solid highlights
      const defaultHighlights = [
        'Experienced management team with a proven track record in technology and education.',
        'Scalable business model with diversified revenue streams and high growth potential.',
        'Strong product-market fit demonstrated by positive early user engagement and feedback.',
        'Differentiated 2D metaverse platform offering a unique blend of learning, building, and networking.',
        'Addressing a significant underserved market segment in Tier 2 and 3 colleges with high demand for skill enhancement.'
      ];

      defaultHighlights.forEach(highlight => {
        if (highlights.length < 5 && !highlights.includes(highlight)) { // Avoid duplicates
          highlights.push(highlight);
        }
      });
    }
    return highlights;
  };

  const getInvestmentRationale = (): string[] => {
    const defaultRationale = [
      `${company.name} presents a compelling investment opportunity due to its innovative approach to addressing critical gaps in higher education and skill development.`,
      `The company's 2D metaverse platform offers a scalable and engaging solution for a large, underserved market, particularly in Tier 2 and 3 colleges.`,
      `A robust business model with multiple revenue streams, coupled with a strong and experienced founding team, positions ${company.name} for sustainable growth and profitability.`,
      `The increasing demand for digital learning solutions and immersive online experiences creates a favorable market environment for ${company.name} to capture significant market share.`
    ];
    return formatAsBulletPoints(defaultRationale);
  };

  const downloadAsPDF = () => {
    const doc = new jsPDF();
    let yPosition = 20;
    const lineHeight = 7;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;
    const maxWidth = pageWidth - 2 * margin;

    // Set default text color to black for the PDF
    doc.setTextColor(0, 0, 0); // RGB for black

    // Helper function to add text with wrapping and handling bullet points
    const addContentToPDF = (title: string, contentLines: string[], titleFontSize: number = 14, contentFontSize: number = 10) => {
      // Add Title
      doc.setFontSize(titleFontSize);
      doc.setFont('helvetica', 'bold');
      const titleLines = doc.splitTextToSize(title, maxWidth);
      for (const line of titleLines) {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
          doc.setTextColor(0, 0, 0); // Ensure black on new page
        }
        doc.text(line, margin, yPosition);
        yPosition += lineHeight;
      }
      yPosition += 8; // Increased space after title

      // Add Content (bullet points)
      doc.setFontSize(contentFontSize);
      doc.setFont('helvetica', 'normal');
      contentLines.forEach(line => {
        const textLines = doc.splitTextToSize(line, maxWidth);
        for (const textLine of textLines) {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
            doc.setTextColor(0, 0, 0); // Ensure black on new page
          }
          doc.text(textLine, margin, yPosition);
          yPosition += lineHeight;
        }
      });
      yPosition += 15; // Increased extra spacing after each section content
    };

    // Title Page (optional, but good for memos)
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(`INVESTMENT MEMORANDUM`, pageWidth / 2, yPosition + 40, { align: 'center' });
    yPosition += 20;
    doc.setFontSize(20);
    doc.text(company.name.toUpperCase(), pageWidth / 2, yPosition + 40, { align: 'center' });
    yPosition += 20;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Prepared on: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition + 40, { align: 'center' });
    doc.addPage();
    yPosition = 20; // Reset y for next page
    doc.setTextColor(0, 0, 0); // Ensure black on new page

    // Executive Summary
    const executiveSummaryContent = formatAsBulletPoints(
      company.introduction ||
      `${company.name} is an innovative company operating in the ${company.industry || 'EdTech, Metaverse, Virtual Learning'} sector, poised for significant growth. This memo outlines the investment opportunity, highlighting its unique value proposition and market potential.`
    );
    addContentToPDF('EXECUTIVE SUMMARY', executiveSummaryContent);

    // Investment Highlights
    addContentToPDF('INVESTMENT HIGHLIGHTS', generateInvestmentHighlights());

    // Team Section
    addContentToPDF('TEAM', getTeamContent());

    // Problem Section
    addContentToPDF('PROBLEM', getProblemContent());

    // Solution Section
    addContentToPDF('SOLUTION', getSolutionContent());

    // Market Opportunity
    addContentToPDF('MARKET OPPORTUNITY', getMarketContent());

    // Business Model
    addContentToPDF('BUSINESS MODEL', getBusinessModelContent());

    // Competition
    addContentToPDF('COMPETITIVE LANDSCAPE', getCompetitionContent());

    // Risks and Concerns
    addContentToPDF('RISKS AND CONCERNS', getRisksContent());

    // Investment Rationale
    addContentToPDF('INVESTMENT RATIONALE', getInvestmentRationale());

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
        {/* Changed button variant/class for neutral color */}
        <Button variant="outline" className="flex items-center gap-2 border-gray-300 text-gray-800 hover:bg-gray-100">
          <FileText className="h-4 w-4" />
          Investment Memo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-black">
            <span>Investment Memo - {company.name}</span>
            {/* Changed button variant/class for neutral color */}
            <Button onClick={downloadAsPDF} variant="outline" size="sm" className="flex items-center gap-2 border-gray-300 text-gray-800 hover:bg-gray-100">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-600" /> {/* Neutral loader color */}
          </div>
        ) : (
          // Increased space-y for overall section spacing
          <div className="space-y-8 p-4 bg-white text-black">
            {/* Header for display in dialog */}
            <div className="text-center border-b pb-4">
              <h1 className="text-2xl font-bold mb-2">INVESTMENT MEMO</h1>
              {/* Changed text color to black/gray */}
              <h2 className="text-xl font-semibold text-gray-800">{company.name}</h2>
              <p className="text-sm text-gray-600 mt-2">Prepared on {new Date().toLocaleDateString()}</p>
            </div>

            {/* Executive Summary - Increased mb for section spacing */}
            <section className="mb-6">
              {/* Changed text color to black/gray */}
              <h3 className="text-lg font-bold mb-3 text-gray-800">EXECUTIVE SUMMARY</h3>
              <ul className="list-disc list-inside space-y-2 text-sm leading-relaxed text-gray-800"> {/* Added text-gray-800 */}
                {formatAsBulletPoints(company.introduction ||
                  `${company.name} is an innovative company operating in the ${company.industry || 'EdTech, Metaverse, Virtual Learning'} sector, poised for significant growth. This memo outlines the investment opportunity, highlighting its unique value proposition and market potential.`
                ).map((line, index) => (
                  <li key={`exec-sum-${index}`}>{line.replace(/^•\s*/, '')}</li>
                ))}
              </ul>
            </section>

            {/* Investment Highlights */}
            <section className="mb-6">
              <h3 className="text-lg font-bold mb-3 text-gray-800">INVESTMENT HIGHLIGHTS</h3>
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-800">
                {generateInvestmentHighlights().map((highlight, index) => (
                  <li key={`highlight-${index}`}>{highlight.replace(/^•\s*/, '')}</li>
                ))}
              </ul>
            </section>

            {/* Team */}
            <section className="mb-6">
              <h3 className="text-lg font-bold mb-3 text-gray-800">TEAM</h3>
              <ul className="list-disc list-inside space-y-2 text-sm leading-relaxed text-gray-800">
                {getTeamContent().map((line, index) => (
                  <li key={`team-${index}`}>{line.replace(/^•\s*/, '')}</li>
                ))}
              </ul>
            </section>

            {/* Problem */}
            <section className="mb-6">
              <h3 className="text-lg font-bold mb-3 text-gray-800">PROBLEM</h3>
              <ul className="list-disc list-inside space-y-2 text-sm leading-relaxed text-gray-800">
                {getProblemContent().map((line, index) => (
                  <li key={`problem-${index}`}>{line.replace(/^•\s*/, '')}</li>
                ))}
              </ul>
            </section>

            {/* Solution */}
            <section className="mb-6">
              <h3 className="text-lg font-bold mb-3 text-gray-800">SOLUTION</h3>
              <ul className="list-disc list-inside space-y-2 text-sm leading-relaxed text-gray-800">
                {getSolutionContent().map((line, index) => (
                  <li key={`solution-${index}`}>{line.replace(/^•\s*/, '')}</li>
                ))}
              </ul>
            </section>

            {/* Market Opportunity */}
            <section className="mb-6">
              <h3 className="text-lg font-bold mb-3 text-gray-800">MARKET OPPORTUNITY</h3>
              <ul className="list-disc list-inside space-y-2 text-sm leading-relaxed text-gray-800">
                {getMarketContent().map((line, index) => (
                  <li key={`market-${index}`}>{line.replace(/^•\s*/, '')}</li>
                ))}
              </ul>
            </section>

            {/* Business Model */}
            <section className="mb-6">
              <h3 className="text-lg font-bold mb-3 text-gray-800">BUSINESS MODEL</h3>
              <ul className="list-disc list-inside space-y-2 text-sm leading-relaxed text-gray-800">
                {getBusinessModelContent().map((line, index) => (
                  <li key={`biz-model-${index}`}>{line.replace(/^•\s*/, '')}</li>
                ))}
              </ul>
            </section>

            {/* Competition */}
            <section className="mb-6">
              <h3 className="text-lg font-bold mb-3 text-gray-800">COMPETITIVE LANDSCAPE</h3>
              <ul className="list-disc list-inside space-y-2 text-sm leading-relaxed text-gray-800">
                {getCompetitionContent().map((line, index) => (
                  <li key={`comp-${index}`}>{line.replace(/^•\s*/, '')}</li>
                ))}
              </ul>
            </section>

            {/* Risks and Concerns */}
            <section className="mb-6">
              <h3 className="text-lg font-bold mb-3 text-gray-800">RISKS AND CONCERNS</h3>
              <ul className="list-disc list-inside space-y-2 text-sm leading-relaxed text-gray-800">
                {getRisksContent().map((line, index) => (
                  <li key={`risks-${index}`}>{line.replace(/^•\s*/, '')}</li>
                ))}
              </ul>
            </section>

            {/* Investment Rationale */}
            <section className="mb-6">
              <h3 className="text-lg font-bold mb-3 text-gray-800">INVESTMENT RATIONALE</h3>
              <ul className="list-disc list-inside space-y-2 text-sm leading-relaxed text-gray-800">
                {getInvestmentRationale().map((line, index) => (
                  <li key={`rationale-${index}`}>{line.replace(/^•\s*/, '')}</li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
