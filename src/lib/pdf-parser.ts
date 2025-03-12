
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
      
      // Get the first line as title (or use 'Page X' if empty)
      let title = '';
      let contentStartIndex = 0;
      
      // Find the first non-empty text item to use as title
      for (let i = 0; i < items.length; i++) {
        const text = (items[i] as any).str?.trim();
        if (text) {
          title = text;
          contentStartIndex = i + 1;
          break;
        }
      }
      
      // If no title found, use Page X
      if (!title) {
        title = `Page ${pageNum}`;
      }
      
      // Get remaining content
      const contentItems = items.slice(contentStartIndex).map(item => (item as any).str || '').filter(str => str.trim());
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
