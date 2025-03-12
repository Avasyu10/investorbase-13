
import * as pdfjsLib from 'pdfjs-dist';
import { TextItem } from 'pdfjs-dist/types/src/display/api';

// Set the worker source path
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ParsedPdfSegment {
  id: string;
  title: string;
  content: string;
  pageNumbers: number[];
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
];

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
      items.forEach((item) => {
        // Check if this text item is likely a section heading
        const text = (item as any).str || '';

        // Section detection: large font, all caps, or matching common headings
        const isSectionHeading = 
          (COMMON_SECTION_HEADINGS.some(heading => text.includes(heading))) || 
          (text === text.toUpperCase() && text.length > 3 && text.length < 50) ||
          ((item as any).height > 12 && text.length > 3 && text.length < 50);

        if (isSectionHeading) {
          // Save previous section before starting new one
          if (currentSectionContent.length > 0) {
            foundAnySection = true;
            const id = currentSectionTitle.toLowerCase().replace(/[^a-z0-9]/g, '-');
            segments.push({
              id,
              title: currentSectionTitle,
              content: currentSectionContent.join(' '),
              pageNumbers: [...new Set(currentSectionPages)],
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
