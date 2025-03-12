
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
  pageIndex?: number; // Store page index for rendering
}

// New function to extract title from page using layout analysis
function extractTitleFromPage(textItems: TextItem[], viewport: any): string {
  if (!textItems || textItems.length === 0) return "Untitled Page";
  
  // Convert text items to a more usable format with position and styling info
  const items = textItems.map((item: any) => {
    return {
      text: item.str.trim(),
      fontSize: item.transform[0], // In PDF.js, this transform value often correlates with font size
      y: viewport.height - item.transform[5], // y-position, inverted to match top-down coordinate system
      x: item.transform[4], // x-position
      fontName: item.fontName || "",
    };
  }).filter(item => item.text.length > 0);
  
  if (items.length === 0) return "Untitled Page";
  
  // Sort items by vertical position (top to bottom)
  items.sort((a, b) => a.y - b.y);
  
  // Group text items that appear to be in the same line/paragraph
  const lineGroups: any[] = [];
  let currentGroup: any[] = [items[0]];
  const LINE_THRESHOLD = 5; // Items within this many pixels vertically are considered same line
  
  for (let i = 1; i < items.length; i++) {
    const prevItem = items[i-1];
    const currItem = items[i];
    
    // If this item is roughly on the same line as previous
    if (Math.abs(currItem.y - prevItem.y) < LINE_THRESHOLD) {
      currentGroup.push(currItem);
    } else {
      // Start a new line group
      lineGroups.push(currentGroup);
      currentGroup = [currItem];
    }
  }
  
  if (currentGroup.length > 0) {
    lineGroups.push(currentGroup);
  }
  
  // Process line groups to find title candidates
  for (let i = 0; i < Math.min(lineGroups.length, 5); i++) { // Check first 5 line groups
    const group = lineGroups[i];
    
    // Sort items in group by x-position (left to right)
    group.sort((a: any, b: any) => a.x - b.x);
    
    // Combine text in this line
    const lineText = group.map((item: any) => item.text).join(" ").trim();
    
    // Title heuristics:
    // 1. Reasonable length for a title (not too short, not too long)
    // 2. Not ending with common sentence-ending punctuation (suggesting it's complete)
    // 3. Preferably has larger font size than average
    
    if (
      lineText.length > 3 && 
      lineText.length < 100 && 
      !lineText.endsWith(".") && 
      !lineText.match(/Page \d+/) && // Not just a page number
      !lineText.match(/^\d+$/) // Not just a number
    ) {
      // Calculate average font size for this group
      const avgFontSize = group.reduce((sum: number, item: any) => sum + item.fontSize, 0) / group.length;
      
      // If font size is 10% larger than the average of all items or it's one of the first few lines
      if (i < 2 || avgFontSize > 1.1 * (items.reduce((sum, item) => sum + item.fontSize, 0) / items.length)) {
        return lineText;
      }
    }
  }
  
  // Fallback: Use the first non-empty line if no title candidate found
  for (const group of lineGroups) {
    const lineText = group.map((item: any) => item.text).join(" ").trim();
    if (lineText.length > 3 && !lineText.match(/Page \d+/)) {
      return lineText;
    }
  }
  
  return "Untitled Page";
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
      const viewport = page.getViewport({ scale: 1.0 });
      const textContent = await page.getTextContent();
      const items = textContent.items as TextItem[];
      
      if (items.length === 0) continue;
      
      // Get all text items with their content
      const textItems: string[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i] as any;
        if (item.str?.trim()) {
          textItems.push(item.str.trim());
        }
      }
      
      // Extract title using our layout analysis function
      let title = extractTitleFromPage(items, viewport);
      
      const id = `page-${pageNum}`;
      
      segments.push({
        id,
        title,
        content: textItems.join('\n'), // Store full page text content
        pageNumbers: [pageNum],
        pageIndex: pageNum - 1 // Store 0-based page index for rendering
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

// Function to render a PDF page to a canvas
export async function renderPdfPageToCanvas(
  pdfBlob: Blob, 
  pageIndex: number, 
  canvas: HTMLCanvasElement,
  scale: number = 1.0
): Promise<void> {
  try {
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    // Get the page
    const page = await pdf.getPage(pageIndex + 1); // +1 because PDF.js uses 1-based indices
    
    // Get the viewport
    const viewport = page.getViewport({ scale });
    
    // Set canvas dimensions to match the viewport
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    // Get the rendering context
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas context not available');
    
    // Render the page
    await page.render({
      canvasContext: context,
      viewport,
    }).promise;
    
  } catch (error) {
    console.error('Error rendering PDF page:', error);
    
    // Draw error message on canvas
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#f8f9fa';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#e11d48';
      context.font = '14px sans-serif';
      context.textAlign = 'center';
      context.fillText('Error rendering page', canvas.width / 2, canvas.height / 2);
    }
  }
}
