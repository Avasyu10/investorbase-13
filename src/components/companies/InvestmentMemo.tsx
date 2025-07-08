import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';

// Ensure this Company interface matches your actual data structure in apiContract.ts
// Add any missing fields that are used within this component.
export interface Company {
  id: string;
  name: string;
  report_id?: string;
  introduction?: string;
  industry?: string;
  assessment_points?: string[];
  // You might also need:
  // founder_linkedins?: string[];
  // description?: string;
  // pitch_url?: string;
  // company_linkedin_url?: string;
}

interface InvestmentMemoProps {
  company: Company;
}

interface AnalysisResult {
  sections?: Array<{
    type?: string; // Made optional as it might not always be present
    title?: string; // Made optional
    description?: string;
    content?: string;
    keyPoints?: string[];
    details?: any;
  }>;
  companyInfo?: {
    stage?: string;
    industry?: string;
    website?: string;
    description?: string;
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
  // Now, it will also apply bolding to the first part of the sentence for HTML rendering
  const formatAsBulletPoints = (text: string | string[]): string[] => {
    const rawLines: string[] = Array.isArray(text) ? text :
      text.split(/[\r\n]+|(?<=[.!?])\s*(?=[A-Z])|\s*-\s*|^\s*\d+\.\s*/g)
          .map(line => line.trim())
          .filter(line => line.length > 0);

    return rawLines.map(line => {
      // Remove markdown bolding for internal processing, then re-apply for HTML/PDF appropriately
      const cleanLine = line.replace(/\*\*(.*?)\*\*/g, '$1').trim();
      if (!cleanLine) return '';

      // For HTML display: find the first colon or period to bold the key phrase
      const firstSeparatorIndex = cleanLine.indexOf(':');
      const secondSeparatorIndex = cleanLine.indexOf('.');

      let boldedLine = cleanLine;
      if (firstSeparatorIndex > -1 && firstSeparatorIndex < 30) { // Bold up to the first colon if it's early in the sentence
        boldedLine = `<strong>${cleanLine.substring(0, firstSeparatorIndex + 1)}</strong>${cleanLine.substring(firstSeparatorIndex + 1)}`;
      } else if (secondSeparatorIndex > -1 && secondSeparatorIndex < 30) { // Or up to the first period if it's early
          // Find the first space after the period to avoid bolding the entire sentence if it's short
          const spaceAfterPeriod = cleanLine.indexOf(' ', secondSeparatorIndex);
          if (spaceAfterPeriod > -1) {
            boldedLine = `<strong>${cleanLine.substring(0, spaceAfterPeriod).trim()}:</strong> ${cleanLine.substring(spaceAfterPeriod).trim()}`;
          } else {
            // If no space after period, just bold the whole short phrase ending with a period
            boldedLine = `<strong>${cleanLine.trim()}</strong>`;
          }
      }

      return `• ${boldedLine}`;
    }).filter(item => item.replace(/^•\s*/, '').trim().length > 0); // Filter out empty points after processing
  };

  // Helper to get text without the HTML bolding for PDF
  const formatForPdf = (text: string | string[]): string[] => {
    const rawLines: string[] = Array.isArray(text) ? text :
      text.split(/[\r\n]+|(?<=[.!?])\s*(?=[A-Z])|\s*-\s*|^\s*\d+\.\s*/g)
          .map(line => line.trim())
          .filter(line => line.length > 0);

    return rawLines.map(line => {
      // Remove any markdown bolding and HTML bolding tags for PDF
      return line.replace(/\*\*(.*?)\*\*/g, '$1') // Remove markdown **
                 .replace(/<\/?strong>/g, '') // Remove HTML <strong> tags
                 .trim();
    }).filter(item => item.length > 0);
  };


  const getSectionContent = (sectionType: string): string[] => {
    if (!analysisData?.sections) return [];

    const section = analysisData.sections.find(s =>
      s.type?.toLowerCase().includes(sectionType.toLowerCase()) ||
      s.title?.toLowerCase().includes(sectionType.toLowerCase())
    );

    let contentArray: string[] = [];
    if (section) {
      if (section.description) contentArray.push(section.description);
      if (section.content) contentArray.push(section.content);
      if (section.keyPoints && section.keyPoints.length > 0) {
        contentArray.push(...section.keyPoints);
      }
      // Add logic to extract from `details` if it's a structured object
      if (section.details && typeof section.details === 'object') {
        for (const key in section.details) {
          if (Object.prototype.hasOwnProperty.call(section.details, key)) {
            const value = section.details[key];
            if (typeof value === 'string' && value.length > 0) {
              contentArray.push(`${key}: ${value}`);
            } else if (Array.isArray(value) && value.length > 0) {
              contentArray.push(`${key}:`);
              contentArray.push(...value);
            }
          }
        }
      }
    }
    
    // Always return content formatted for HTML display in the dialog
    if (contentArray.some(c => c.trim().length > 0)) {
        return formatAsBulletPoints(contentArray.join('\n\n'));
    }
    return [];
  };

  // --- Fallback Content Functions (Enhanced for Professionalism) ---
  const getTeamContent = (): string[] => {
    let content = getSectionContent('team');
    if (content.length === 0) {
      content = getSectionContent('founder');
    }
    
    if (content.length === 0 || formatForPdf(content).join(' ').length < 150) { // Check raw length for fallback logic
      const defaultTeamContent = [
        `The founding team of ${company.name} comprises dedicated and experienced professionals with a strong understanding of the ${company.industry || 'EdTech and immersive learning'} sector.`,
        `Leadership: Brings a robust blend of technical expertise, product development foresight, and strategic operational management.`,
        `Collective Vision: Centered on revolutionizing virtual education and career development for underserved student populations.`,
        `Execution & Community: Early indicators show the team's capacity for agile execution and fostering a vibrant community, crucial for platform growth.`,
        `Mission Alignment: The commitment to the mission is evident in their proactive engagement with educational institutions and industry partners.`
      ];
      return formatAsBulletPoints(defaultTeamContent);
    }
    return content;
  };

  const getProblemContent = (): string[] => {
    let content = getSectionContent('problem');
    if (content.length === 0 || formatForPdf(content).join(' ').length < 150) {
      const defaultProblemContent = [
        `Access Barrier: High-quality career development resources remain a significant challenge for students in Tier 2 and 3 colleges across India.`,
        `Platform Gaps: Existing virtual learning platforms often lack the immersive, interactive, and community-driven experience essential for holistic development.`,
        `Limited Exposure: Students frequently face insufficient mentorship, limited exposure to industry best practices, and a lack of robust placement support.`,
        `Skill Mismatch: The current educational ecosystem struggles to bridge the critical gap between academic knowledge and practical industry demands, leading to skill mismatches.`,
        `Network Deficiency: Traditional alumni networks are often inaccessible or underdeveloped for these student demographics, hindering crucial professional connections.`
      ];
      return formatAsBulletPoints(defaultProblemContent);
    }
    return content;
  };

  const getSolutionContent = (): string[] => {
    let content = getSectionContent('solution');
    if (content.length === 0 || formatForPdf(content).join(' ').length < 150) {
      const defaultSolutionContent = [
        `Platform Introduction: ${company.name} introduces Upskillmafia, an innovative 2D metaverse platform designed to create an immersive, interactive, and inclusive learning ecosystem.`,
        `Environment Replication: The platform replicates the enriching environment of premier institutions (e.g., IITs, IIMs) by integrating structured learning, skill-building modules, and real-time project collaboration.`,
        `Comprehensive Tools: Offers comprehensive career development tools, including virtual career fairs, personalized mentorship programs, and direct access to industry experts.`,
        `Unique Value: Upskillmafia's unique value proposition lies in its ability to foster a strong sense of community and networking, making professional growth accessible and engaging.`,
        `Skill Gap Addressing: The solution directly addresses skill gaps by providing practical, industry-relevant content and pathways to meaningful employment opportunities.`
      ];
      return formatAsBulletPoints(defaultSolutionContent);
    }
    return content;
  };

  const getMarketContent = (): string[] => {
    let content = getSectionContent('market');
    if (content.length === 0 || formatForPdf(content).join(' ').length < 150) {
      const industry = company.industry || 'EdTech, Metaverse, Virtual Learning';
      const defaultMarketContent = [
        `Market Growth: The global ${industry} market is experiencing robust growth, driven by digital transformation and the increasing adoption of online education solutions.`,
        `Underserved Segment: Significant market opportunity exists within the underserved segment of Tier 2 and 3 college students, representing millions of potential users.`,
        `Demand Escalation: The demand for supplementary skill development and career enhancement platforms is rapidly escalating due to evolving industry requirements.`,
        `Emerging Trends: Emerging trends in immersive digital experiences and virtual collaboration further expand the addressable market for metaverse-based learning platforms.`,
        `Strategic Partnerships: Strategic partnerships with educational institutions and corporate entities are poised to unlock substantial market share and accelerate user acquisition.`
      ];
      return formatAsBulletPoints(defaultMarketContent);
    }
    return content;
  };

  const getBusinessModelContent = (): string[] => {
    let content = getSectionContent('business_model');
    if (content.length === 0) content = getSectionContent('business model');
    
    if (content.length === 0 || formatForPdf(content).join(' ').length < 150) {
      const defaultBusinessModelContent = [
        `${company.name} operates a diversified and scalable business model focused on maximizing value for both students and institutional partners.`,
        `Revenue Streams: Primary revenue streams include tiered subscription models for students, offering access to premium content, certifications, and exclusive networking events.`,
        `Institutional Partnerships: Collaborations with colleges and universities generate revenue through licensing the platform for integrated curriculum delivery and student support.`,
        `Corporate Clients: Contribute through talent sourcing fees, virtual recruitment fair participation, and sponsored skill development programs.`,
        `Scalability: The asset-light digital infrastructure ensures high-profit margins and efficient scalability as the user base expands.`
      ];
      return formatAsBulletPoints(defaultBusinessModelContent);
    }
    return content;
  };

  const getCompetitionContent = (): string[] => {
    let content = getSectionContent('competitive');
    if (content.length === 0) content = getSectionContent('competition');
    
    if (content.length === 0 || formatForPdf(content).join(' ').length < 150) {
      const defaultCompetitionContent = [
        `Market Landscape: The EdTech landscape includes established online course providers (e.g., Coursera, Udemy) and traditional career development services.`,
        `Unique Approach: Unlike general online learning platforms, ${company.name} offers a uniquely integrated and immersive metaverse experience focused on holistic student development.`,
        `Differentiation: Competitive differentiation stems from its community-first approach, personalized mentorship, and direct industry connectivity for Tier 2/3 students.`,
        `Barriers to Entry: Proprietary content, gamified learning pathways, and a strong network effect within the metaverse create significant barriers to entry for competitors.`,
        `Innovation Edge: The company's agile development and continuous innovation ensure it remains at the forefront of virtual learning technology.`
      ];
      return formatAsBulletPoints(defaultCompetitionContent);
    }
    return content;
  };

  const getRisksContent = (): string[] => {
    const defaultRisksContent = [
      `Market Adoption: Scaling user acquisition and engagement among diverse student populations, requiring significant marketing and community building efforts.`,
      `Competitive Intensity: Navigating a rapidly evolving EdTech and metaverse market with new entrants and evolving solutions.`,
      `Technological Evolution: Keeping the metaverse platform updated with the latest technological advancements and ensuring seamless user experience at scale.`,
      `Content Relevance: Continuously updating and expanding curriculum to align with dynamic industry demands and student needs.`,
      `Partnership Dependence: Reliance on successful collaborations with educational institutions and corporations for broad market penetration and revenue growth.`
    ];
    // Markdown bolding is handled by formatAsBulletPoints for display, and stripped for PDF
    return formatAsBulletPoints(defaultRisksContent);
  };

  const generateInvestmentHighlights = (): string[] => {
    const highlights: string[] = [];

    if (company.assessment_points && company.assessment_points.length > 0) {
      company.assessment_points.slice(0, 5).forEach(point => { // Take up to 5 points
        highlights.push(point);
      });
    }

    if (company.industry) {
      highlights.push(`Strategic positioning in the high-growth ${company.industry} and virtual learning market.`);
    }

    if (highlights.length < 5) {
      const defaultHighlights = [
        'Experienced and visionary leadership team with a demonstrated capacity for innovation and execution.',
        'Highly scalable 2D metaverse platform addressing a significant underserved demographic in higher education.',
        'Robust multi-faceted business model generating diverse revenue streams from students and institutional partners.',
        'Strong early product-market fit with positive user feedback and a rapidly expanding community base.',
        'Distinct competitive advantage through an integrated ecosystem for learning, skill development, networking, and career placement.'
      ];

      defaultHighlights.forEach(highlight => {
        if (highlights.length < 5 && !highlights.includes(highlight)) {
          highlights.push(highlight);
        }
      });
    }
    return formatAsBulletPoints(highlights); // Apply formatting to highlights as well
  };

  const getInvestmentRationale = (): string[] => {
    const defaultRationale = [
      `${company.name} represents a compelling investment opportunity due to its innovative solution for a critical educational and career development gap.`,
      `Market Positioning: The company is uniquely positioned to capitalize on the convergence of EdTech and metaverse trends, offering a highly scalable and engaging platform.`,
      `Operational Strength: Strong operational fundamentals, an experienced team, and a clear path to profitability underpin a robust investment thesis.`,
      `Addressable Market: The addressable market is substantial, with millions of students seeking enhanced learning and career opportunities.`,
      `Value Creation: This investment offers exposure to a high-growth sector with significant potential for long-term value creation and positive social impact.`
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

    // Helper function to add a section title and content (bullet points)
    const addSectionToPDF = (title: string, contentLines: string[], titleFontSize: number = 14, contentFontSize: number = 10) => {
      // Check for new page before adding title
      if (yPosition + (titleFontSize / 2) > 270) { // Estimate space needed for title
        doc.addPage();
        yPosition = 20;
        doc.setTextColor(0, 0, 0);
      }

      // Add Title
      doc.setFontSize(titleFontSize);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin, yPosition);
      yPosition += lineHeight + 5; // Space after title

      // Add Content (bullet points)
      doc.setFontSize(contentFontSize);
      doc.setFont('helvetica', 'normal');
      // Pass content through formatForPdf to strip HTML tags before PDF rendering
      const pdfContentLines = formatForPdf(contentLines.map(line => line.replace(/^•\s*/, ''))); // Remove leading bullet for PDF processing
      
      pdfContentLines.forEach(line => {
        const textLines = doc.splitTextToSize(`• ${line}`, maxWidth); // Re-add bullet for PDF display
        for (const textLine of textLines) {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
            doc.setTextColor(0, 0, 0);
          }
          doc.text(textLine, margin + 5, yPosition); // Indent bullet points
          yPosition += lineHeight;
        }
      });
      yPosition += 15; // Increased space after each section content for better visual break
    };

    // --- PDF Content Generation ---

    // Cover Page / Title Page - Enhanced
    const centerX = pageWidth / 2;
    doc.setFontSize(40); // Larger title
    doc.setFont('helvetica', 'bold');
    doc.text(`INVESTMENT`, centerX, yPosition + 50, { align: 'center' });
    doc.text(`MEMORANDUM`, centerX, yPosition + 65, { align: 'center' }); // Split for better visual
    yPosition += 90;

    doc.setFontSize(30); // Larger company name
    doc.text(company.name.toUpperCase(), centerX, yPosition + 30, { align: 'center' });
    yPosition += 40;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text(`A comprehensive analysis for potential investors`, centerX, yPosition + 20, { align: 'center' });
    yPosition += 80;

    // Subtle line separator (optional, but adds design)
    doc.setDrawColor(0, 0, 0); // Black line
    doc.line(margin + 50, yPosition, pageWidth - margin - 50, yPosition); // Draw a line
    yPosition += 20;

    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, centerX, yPosition, { align: 'center' });
    doc.addPage();
    yPosition = 20; // Reset y for next page
    doc.setTextColor(0, 0, 0); // Ensure black on new page

    // Add content sections
    // Note: The content functions (e.g., getTeamContent) now return HTML-formatted strings for dialog
    // We pass their raw, pre-formatted content (without bullets or HTML) to addSectionToPDF
    addSectionToPDF('EXECUTIVE SUMMARY', formatForPdf(company.introduction || `${company.name} is an innovative company operating in the ${company.industry || 'EdTech and immersive virtual learning'} sector, poised for significant growth. This memorandum provides a comprehensive analysis of the investment opportunity, highlighting its unique value proposition, market position, and growth potential.`));
    addSectionToPDF('INVESTMENT HIGHLIGHTS', formatForPdf(generateInvestmentHighlights().map(line => line.replace(/^•\s*/, ''))));
    addSectionToPDF('TEAM', formatForPdf(getTeamContent().map(line => line.replace(/^•\s*/, ''))));
    addSectionToPDF('PROBLEM', formatForPdf(getProblemContent().map(line => line.replace(/^•\s*/, ''))));
    addSectionToPDF('SOLUTION', formatForPdf(getSolutionContent().map(line => line.replace(/^•\s*/, ''))));
    addSectionToPDF('MARKET OPPORTUNITY', formatForPdf(getMarketContent().map(line => line.replace(/^•\s*/, ''))));
    addSectionToPDF('BUSINESS MODEL', formatForPdf(getBusinessModelContent().map(line => line.replace(/^•\s*/, ''))));
    addSectionToPDF('COMPETITIVE LANDSCAPE', formatForPdf(getCompetitionContent().map(line => line.replace(/^•\s*/, ''))));
    addSectionToPDF('RISKS AND CONCERNS', formatForPdf(getRisksContent().map(line => line.replace(/^•\s*/, ''))));
    addSectionToPDF('INVESTMENT RATIONALE', formatForPdf(getInvestmentRationale().map(line => line.replace(/^•\s*/, ''))));

    // Final Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(`Confidential & Proprietary. Not for distribution.`, margin, doc.internal.pageSize.height - 10);

    // Save the PDF
    doc.save(`${company.name}_Investment_Memo.pdf`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {/* Button with neutral colors and a subtle amber background */}
        <Button variant="outline" className="flex items-center gap-2 border-gray-300 text-gray-950 bg-amber-400 hover:bg-amber-400/90">
          <FileText className="h-4 w-4" />
          Investment Memo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0"> {/* Removed padding from DialogContent to control it inside */}
        <DialogHeader className="p-6 pb-4 border-b border-gray-200 bg-zinc-800"> {/* Darker header for contrast */}
          <DialogTitle className="flex items-center justify-between text-white text-2xl font-semibold"> {/* White text for dark header */}
            <span>Investment Memo - {company.name}</span>
            {/* Download Button with neutral colors */}
            <Button onClick={downloadAsPDF} variant="outline" size="sm" className="flex items-center gap-2 border-gray-300 text-gray-800 bg-zinc-50 hover:bg-zinc-100">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-12"> {/* Increased padding */}
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" /> {/* Larger, neutral loader */}
          </div>
        ) : (
          // Increased space-y for overall section spacing in dialog
          <div className="space-y-10 p-8 text-black bg-white"> {/* Increased padding, base text color */}
            
            {/* Executive Summary */}
            <section className="pb-4 border-b border-gray-100"> {/* Subtle border for separation */}
              <h3 className="text-xl font-bold mb-4 text-gray-900">EXECUTIVE SUMMARY</h3> {/* Larger title, darker gray */}
              <ul className="list-disc list-inside space-y-2 text-base leading-relaxed text-gray-800 ml-4"> {/* Increased spacing, larger text, indent bullets */}
                {formatAsBulletPoints(company.introduction ||
                  `${company.name} is an innovative company operating in the ${company.industry || 'EdTech, Metaverse, Virtual Learning'} sector, poised for significant growth. This memorandum provides a comprehensive analysis of the investment opportunity, highlighting its unique value proposition and market potential.`
                ).map((line, index) => (
                  <li key={`exec-sum-${index}`} dangerouslySetInnerHTML={{ __html: line.replace(/^•\s*/, '') }}></li>
                ))}
              </ul>
            </section>

            {/* All sections follow the same improved spacing and styling */}
            <section className="pt-4 pb-4 border-b border-gray-100">
              <h3 className="text-xl font-bold mb-4 text-gray-900">INVESTMENT HIGHLIGHTS</h3>
              <ul className="list-disc list-inside space-y-2 text-base text-gray-800 ml-4">
                {generateInvestmentHighlights().map((highlight, index) => (
                  <li key={`highlight-${index}`} dangerouslySetInnerHTML={{ __html: highlight.replace(/^•\s*/, '') }}></li>
                ))}
              </ul>
            </section>

            <section className="pt-4 pb-4 border-b border-gray-100">
              <h3 className="text-xl font-bold mb-4 text-gray-900">TEAM</h3>
              <ul className="list-disc list-inside space-y-2 text-base leading-relaxed text-gray-800 ml-4">
                {getTeamContent().map((line, index) => (
                  <li key={`team-${index}`} dangerouslySetInnerHTML={{ __html: line.replace(/^•\s*/, '') }}></li>
                ))}
              </ul>
            </section>

            <section className="pt-4 pb-4 border-b border-gray-100">
              <h3 className="text-xl font-bold mb-4 text-gray-900">PROBLEM</h3>
              <ul className="list-disc list-inside space-y-2 text-base leading-relaxed text-gray-800 ml-4">
                {getProblemContent().map((line, index) => (
                  <li key={`problem-${index}`} dangerouslySetInnerHTML={{ __html: line.replace(/^•\s*/, '') }}></li>
                ))}
              </ul>
            </section>

            <section className="pt-4 pb-4 border-b border-gray-100">
              <h3 className="text-xl font-bold mb-4 text-gray-900">SOLUTION</h3>
              <ul className="list-disc list-inside space-y-2 text-base leading-relaxed text-gray-800 ml-4">
                {getSolutionContent().map((line, index) => (
                  <li key={`solution-${index}`} dangerouslySetInnerHTML={{ __html: line.replace(/^•\s*/, '') }}></li>
                ))}
              </ul>
            </section>

            <section className="pt-4 pb-4 border-b border-gray-100">
              <h3 className="text-xl font-bold mb-4 text-gray-900">MARKET OPPORTUNITY</h3>
              <ul className="list-disc list-inside space-y-2 text-base leading-relaxed text-gray-800 ml-4">
                {getMarketContent().map((line, index) => (
                  <li key={`market-${index}`} dangerouslySetInnerHTML={{ __html: line.replace(/^•\s*/, '') }}></li>
                ))}
              </ul>
            </section>

            <section className="pt-4 pb-4 border-b border-gray-100">
              <h3 className="text-xl font-bold mb-4 text-gray-900">BUSINESS MODEL</h3>
              <ul className="list-disc list-inside space-y-2 text-base leading-relaxed text-gray-800 ml-4">
                {getBusinessModelContent().map((line, index) => (
                  <li key={`biz-model-${index}`} dangerouslySetInnerHTML={{ __html: line.replace(/^•\s*/, '') }}></li>
                ))}
              </ul>
            </section>

            <section className="pt-4 pb-4 border-b border-gray-100">
              <h3 className="text-xl font-bold mb-4 text-gray-900">COMPETITIVE LANDSCAPE</h3>
              <ul className="list-disc list-inside space-y-2 text-base leading-relaxed text-gray-800 ml-4">
                {getCompetitionContent().map((line, index) => (
                  <li key={`comp-${index}`} dangerouslySetInnerHTML={{ __html: line.replace(/^•\s*/, '') }}></li>
                ))}
              </ul>
            </section>

            <section className="pt-4 pb-4 border-b border-gray-100">
              <h3 className="text-xl font-bold mb-4 text-gray-900">RISKS AND CONCERNS</h3>
              <ul className="list-disc list-inside space-y-2 text-base leading-relaxed text-gray-800 ml-4">
                {getRisksContent().map((line, index) => (
                  <li key={`risks-${index}`} dangerouslySetInnerHTML={{ __html: line.replace(/^•\s*/, '') }}></li>
                ))}
              </ul>
            </section>

            <section className="pt-4"> {/* No border-b for the last section */}
              <h3 className="text-xl font-bold mb-4 text-gray-900">INVESTMENT RATIONALE</h3>
              <ul className="list-disc list-inside space-y-2 text-base leading-relaxed text-gray-800 ml-4">
                {getInvestmentRationale().map((line, index) => (
                  <li key={`rationale-${index}`} dangerouslySetInnerHTML={{ __html: line.replace(/^•\s*/, '') }}></li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
