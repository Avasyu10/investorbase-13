
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

export async function parsePdfFromBlob(pdfBlob: Blob): Promise<ParsedPdfSegment[]> {
  try {
    // Load the PDF document
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;

    // Skip if PDF has 2 or fewer pages
    if (numPages <= 2) {
      return [{
        id: 'full-report',
        title: 'Full Report',
        content: 'This report is too short to be segmented.',
        pageNumbers: [1],
      }];
    }

    const segments: ParsedPdfSegment[] = [];

    // Process each page (skipping first and last)
    for (let pageNum = 2; pageNum < numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const items = textContent.items as TextItem[];
      
      if (items.length === 0) continue;
      
      // Find the text item with the largest font size to use as title
      let largestFontItem: any = null;
      let largestFontSize = 0;
      
      // First pass: find the largest font size
      for (let i = 0; i < items.length; i++) {
        const item = items[i] as any;
        // Skip empty items
        if (!item.str?.trim()) continue;
        
        // Check if this item has font size info
        if (item.transform && item.transform.length >= 6) {
          // In PDF.js, the font size can be approximated from the transform matrix
          // The vertical scale factor is often at index 3
          const fontSize = Math.abs(item.transform[3]);
          
          if (fontSize > largestFontSize) {
            largestFontSize = fontSize;
            largestFontItem = item;
          }
        }
      }
      
      // Set title based on largest font item or fallback
      let title = '';
      if (largestFontItem && largestFontItem.str) {
        title = largestFontItem.str.trim();
      }
      
      // If no title could be determined, use Page X
      if (!title) {
        title = `Page ${pageNum}`;
      }
      
      // Collect all text content (excluding the title)
      const contentItems = items
        .map(item => (item as any).str || '')
        .filter(str => str.trim() && str.trim() !== title.trim());
      
      const content = contentItems.join(' ');
      
      const id = `page-${pageNum}`;
      
      segments.push({
        id,
        title,
        content: content || `Content from page ${pageNum}`,
        pageNumbers: [pageNum],
      });
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
