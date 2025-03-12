
import * as pdfjsLib from 'pdfjs-dist';
import { TextItem } from 'pdfjs-dist/types/src/display/api';

// Set the worker source path
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ParsedPdfSegment {
  id: string;
  title: string;
  content: string;
  pageNumbers: number[];
  isTitle?: boolean;
}

// Common section headings in business reports
const COMMON_SECTION_HEADINGS = [
  'Executive Summary',
  'Introduction',
  'Background',
  'Methodology',
  'Findings',
  'Financial Analysis',
  'Market Analysis',
  'Operational Metrics',
  'Risk Assessment',
  'Recommendations',
  'Future Outlook',
  'Conclusion',
  'Appendix',
  'Baseline Score',
  'Risk Factors',
  'Overall Score Assessment',
  'Analysis Summary',
  'BaselineScore',
  'OverallScoreAssessment',
  'AnalysisSummary',
];

// Check if a string matches common report section title patterns
function isSectionTitle(text: string): boolean {
  // Remove extra whitespace and normalize
  const normalizedText = text.trim().replace(/\s+/g, ' ');
  
  // Skip if too short
  if (normalizedText.length < 3) return false;
  
  // Skip if too long to be a title
  if (normalizedText.length > 60) return false;

  // Check for exact matches with common headings (case insensitive)
  for (const heading of COMMON_SECTION_HEADINGS) {
    if (normalizedText.toLowerCase().includes(heading.toLowerCase())) {
      return true;
    }
  }
  
  // Check for patterns like "Section 1: Title" or "1. Title"
  if (/^(section|part|chapter)\s+\d+(\.\d+)*\s*:?/i.test(normalizedText) ||
      /^\d+(\.\d+)*\s+[A-Z]/.test(normalizedText)) {
    return true;
  }
  
  // Check for title case with specific ending patterns
  if (/^[A-Z][a-z]+((\s[A-Z][a-z]+)+)(\s(Analysis|Report|Summary|Assessment|Overview|Factors))?$/.test(normalizedText)) {
    return true;
  }
  
  // Check for all caps titles (common in reports)
  if (normalizedText === normalizedText.toUpperCase() && 
      normalizedText.length > 4 &&
      normalizedText.length < 30) {
    return true;
  }
  
  return false;
}

export async function parsePdfFromBlob(pdfBlob: Blob): Promise<ParsedPdfSegment[]> {
  try {
    // Load the PDF document
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;

    // Extract text content from all pages
    const textContentItems: { pageNum: number; items: TextItem[] }[] = [];
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      textContentItems.push({ pageNum, items: textContent.items as TextItem[] });
    }

    // Find sections and their content
    const segments: ParsedPdfSegment[] = [];
    let currentSectionTitle = 'Overview';
    let currentSectionContent: string[] = [];
    let currentSectionPages: number[] = [1];
    let foundAnySection = false;

    // Process text to identify sections
    textContentItems.forEach(({ pageNum, items }) => {
      items.forEach((item, index) => {
        // Check if this text item is likely a section heading
        const text = (item as any).str || '';
        
        if (text.trim()) {
          // Enhanced section title detection
          const isPotentialTitle = (
            isSectionTitle(text) || 
            // Check for font size/style differences that might indicate a title
            ((item as any).height > 12 && text.length > 3 && text.length < 50) ||
            // Check if this is the only text on a line and might be a title
            (items.length > 10 && index > 0 && index < items.length - 1 && 
             !(items[index-1] as any).str.trim() && 
             !(items[index+1] as any).str.trim())
          );

          if (isPotentialTitle) {
            // Save previous section before starting new one
            if (currentSectionContent.length > 0) {
              foundAnySection = true;
              const id = currentSectionTitle.toLowerCase().replace(/[^a-z0-9]/g, '-');
              segments.push({
                id,
                title: currentSectionTitle,
                content: currentSectionContent.join(' '),
                pageNumbers: [...new Set(currentSectionPages)],
                isTitle: true
              });
            }

            // Start new section
            currentSectionTitle = text.trim();
            currentSectionContent = [];
            currentSectionPages = [pageNum];
          } else if (text.trim()) {
            // Add text to current section
            currentSectionContent.push(text.trim());
            if (!currentSectionPages.includes(pageNum)) {
              currentSectionPages.push(pageNum);
            }
          }
        }
      });
    });

    // Add the last section
    if (currentSectionContent.length > 0) {
      const id = currentSectionTitle.toLowerCase().replace(/[^a-z0-9]/g, '-');
      segments.push({
        id,
        title: currentSectionTitle,
        content: currentSectionContent.join(' '),
        pageNumbers: [...new Set(currentSectionPages)],
        isTitle: true
      });
    }

    // If no sections were detected, create a single "Full Report" section
    if (!foundAnySection && segments.length <= 1) {
      const allContent = textContentItems.flatMap(({ items }) => 
        items.map(item => (item as any).str || '').filter(text => text.trim())
      );
      
      return [{
        id: 'full-report',
        title: 'Full Report',
        content: allContent.join(' '),
        pageNumbers: Array.from({ length: numPages }, (_, i) => i + 1),
      }];
    }

    return segments;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    return [{
      id: 'error',
      title: 'Error Parsing PDF',
      content: 'There was an error extracting content from this PDF. Please download the report to view it.',
      pageNumbers: [1],
    }];
  }
}
