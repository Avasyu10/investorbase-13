import * as pdfjsLib from 'pdfjs-dist';
import { TextItem } from 'pdfjs-dist/types/src/display/api';
import nlp from 'compromise';

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

interface TextItemWithMetadata {
  text: string;
  fontSize: number;
  y: number;
  x: number;
  fontName: string;
  isBold: boolean;
}

interface TitleCandidate {
  text: string;
  score: number;
  method: string;
}

// Function to fix spacing issues in extracted text using NLP
function normalizeText(text: string): string {
  if (!text) return "Untitled Page";
  
  // Initial clean-up: trim and replace multiple spaces with a single space
  let normalized = text.replace(/\s+/g, ' ').trim();
  
  // STEP 1: Fix common spacing issues
  
  // Handle PascalCase and camelCase (e.g., "ThisIsATest" -> "This Is A Test")
  if (/[a-z][A-Z]/.test(normalized)) {
    normalized = normalized.replace(/([a-z])([A-Z])/g, '$1 $2');
  }
  
  // Handle ALL CAPS with no spaces (e.g., "THISISATEST" -> "THIS IS A TEST")
  if (/^[A-Z0-9]{10,}$/.test(normalized)) {
    normalized = normalized.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2'); // For patterns like "PRODUCTOverview"
    normalized = normalized.replace(/([0-9])([A-Z])/g, '$1 $2'); // For patterns like "SECTION2TITLE"
    normalized = normalized.replace(/([A-Z])([0-9])/g, '$1 $2'); // For patterns like "SECTION2"
  }
  
  // Handle lowercase with no spaces (e.g., "thisisatest" -> "this is a test")
  if (/^[a-z]{10,}$/.test(normalized)) {
    // First try to match common words
    const commonWords = [
      'and', 'the', 'for', 'with', 'from', 'this', 'that', 'these', 'those',
      'report', 'summary', 'analysis', 'section', 'page', 'overview', 'results',
      'introduction', 'conclusion', 'findings', 'recommendations', 'assessment',
      'appendix', 'executive', 'financial', 'operational', 'strategic'
    ];
    
    // Sort words by length (longest first) to avoid partial matches
    commonWords.sort((a, b) => b.length - a.length);
    
    let workingText = normalized.toLowerCase();
    let result = '';
    let lastMatchEnd = 0;
    
    // Search for common words and insert spaces
    for (let i = 0; i < workingText.length; i++) {
      for (const word of commonWords) {
        if (workingText.substring(i, i + word.length) === word) {
          if (i > lastMatchEnd) {
            // Add text between last match and this match
            result += workingText.substring(lastMatchEnd, i) + ' ';
          }
          result += word + ' ';
          i += word.length - 1;
          lastMatchEnd = i + 1;
          break;
        }
      }
    }
    
    // Add any remaining text
    if (lastMatchEnd < workingText.length) {
      result += workingText.substring(lastMatchEnd);
    }
    
    // If we found common words, use the result
    if (result && result !== normalized) {
      normalized = result.trim();
    } else {
      // Otherwise use a vowel-consonant pattern approach
      normalized = normalized.replace(/([aeiou][bcdfghjklmnpqrstvwxyz]{2,})/gi, '$1 ');
    }
  }
  
  // STEP 2: Use NLP for further improvements
  try {
    const doc = nlp(normalized);
    const terms = doc.terms().out('array');
    
    // If NLP found multiple terms, use them (only if we have reasonable segmentation)
    if (terms.length > 1 && terms.some(term => term.length > 1)) {
      normalized = terms.join(' ');
    }
  } catch (error) {
    console.error("Error in NLP processing:", error);
    // Continue with regex-based approaches if NLP fails
  }
  
  // STEP 3: Add spaces around numbers if they're run together with text
  normalized = normalized.replace(/([a-zA-Z])(\d)/g, '$1 $2'); // Text followed by number
  normalized = normalized.replace(/(\d)([a-zA-Z])/g, '$1 $2'); // Number followed by text
  
  // STEP 4: Make sure any excessive spacing is fixed
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  // STEP 5: Capitalize first letter of each word in the title (Title Case)
  normalized = normalized.split(' ')
    .map(word => {
      // Skip capitalization for common small words unless they're the first word
      const smallWords = ['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'the', 'to', 'with'];
      if (smallWords.includes(word.toLowerCase()) && normalized.indexOf(word) > 0) {
        return word.toLowerCase();
      }
      // Capitalize first letter if the word has letters
      if (word.length > 0 && /[a-z]/i.test(word[0])) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      return word;
    })
    .join(' ');
  
  return normalized;
}

// Function to extract title from page using multiple methods
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
      isBold: item.fontName?.toLowerCase().includes('bold') || false
    } as TextItemWithMetadata;
  }).filter(item => item.text.length > 0);
  
  if (items.length === 0) return "Untitled Page";
  
  // Group text items that appear to be in the same line
  const lineGroups = groupTextItemsByLine(items);
  
  // Get candidates from different methods
  const fontSizeCandidate = getFontSizeCandidate(items, lineGroups);
  const positionCandidate = getPositionCandidate(items, lineGroups, viewport);
  const styleCandidate = getStyleCandidate(items, lineGroups);
  const contentCandidate = getContentCandidate(lineGroups);
  
  // Score and select the best candidate
  const bestCandidate = selectBestCandidate([
    fontSizeCandidate,
    positionCandidate,
    styleCandidate,
    contentCandidate
  ]);
  
  // Normalize the title to fix spacing issues
  return normalizeText(bestCandidate || "Untitled Page");
}

// Group text items that appear to be in the same line
function groupTextItemsByLine(items: TextItemWithMetadata[]): TextItemWithMetadata[][] {
  // Sort items by vertical position (top to bottom)
  items.sort((a, b) => a.y - b.y);
  
  const lineGroups: TextItemWithMetadata[][] = [];
  let currentGroup: TextItemWithMetadata[] = [items[0]];
  const LINE_THRESHOLD = 5; // Items within this many pixels vertically are considered same line
  
  for (let i = 1; i < items.length; i++) {
    const prevItem = items[i-1];
    const currItem = items[i];
    
    // If this item is roughly on the same line as previous
    if (Math.abs(currItem.y - prevItem.y) < LINE_THRESHOLD) {
      currentGroup.push(currItem);
    } else {
      // Start a new line group
      lineGroups.push([...currentGroup]);
      currentGroup = [currItem];
    }
  }
  
  if (currentGroup.length > 0) {
    lineGroups.push(currentGroup);
  }
  
  // Sort items within each line group by x-position (left to right)
  lineGroups.forEach(group => group.sort((a, b) => a.x - b.x));
  
  return lineGroups;
}

// Method 1: Find candidate with largest font size
function getFontSizeCandidate(items: TextItemWithMetadata[], lineGroups: TextItemWithMetadata[][]): TitleCandidate {
  // Calculate average font size for reference
  const avgFontSize = items.reduce((sum, item) => sum + item.fontSize, 0) / items.length;
  
  let bestGroup = null;
  let bestScore = 0;
  
  // Examine first 5 line groups (titles typically at the top)
  for (let i = 0; i < Math.min(lineGroups.length, 5); i++) {
    const group = lineGroups[i];
    const groupAvgFontSize = group.reduce((sum, item) => sum + item.fontSize, 0) / group.length;
    const text = group.map(item => item.text).join(" ").trim();
    
    // Skip if it looks like a page number or is too short
    if (text.match(/^\d+$/) || text.match(/^Page \d+$/) || text.length < 3) continue;
    
    // Score based on font size relative to average and position
    const fontSizeRatio = groupAvgFontSize / avgFontSize;
    const positionScore = 1 - (i / 5); // Higher score for earlier groups
    const score = fontSizeRatio * 0.7 + positionScore * 0.3;
    
    if (score > bestScore) {
      bestScore = score;
      bestGroup = group;
    }
  }
  
  if (bestGroup) {
    return {
      text: bestGroup.map(item => item.text).join(" ").trim(),
      score: bestScore * 0.9, // Font size is a strong indicator, but not perfect
      method: "fontSize"
    };
  }
  
  return { text: "", score: 0, method: "fontSize" };
}

// Method 2: Find candidate based on position (top of page)
function getPositionCandidate(items: TextItemWithMetadata[], lineGroups: TextItemWithMetadata[][], viewport: any): TitleCandidate {
  // Focus on first 3 line groups that aren't too long and have reasonable text
  for (let i = 0; i < Math.min(lineGroups.length, 3); i++) {
    const group = lineGroups[i];
    const text = group.map(item => item.text).join(" ").trim();
    
    // Skip if it looks like a header/footer, page number, or is too short/long
    if (text.match(/^\d+$/) || text.match(/^Page \d+$/) || text.length < 3 || text.length > 100) continue;
    
    // Calculate position score - higher for items at the top but not at the very edge
    const normalizedY = group[0].y / viewport.height;
    // Ideal position is in the top 30% but not at the very top (which might be headers)
    const positionScore = normalizedY < 0.3 ? (1 - Math.abs(0.15 - normalizedY) * 2) : 0;
    
    // Only consider it if it's reasonably positioned
    if (positionScore > 0.5) {
      return {
        text,
        score: 0.7 * positionScore, // Position is good but not as reliable as font size
        method: "position"
      };
    }
  }
  
  return { text: "", score: 0, method: "position" };
}

// Method 3: Find candidate based on styling (bold, etc.)
function getStyleCandidate(items: TextItemWithMetadata[], lineGroups: TextItemWithMetadata[][]): TitleCandidate {
  // Look for lines with bold text, especially in the first few lines
  for (let i = 0; i < Math.min(lineGroups.length, 5); i++) {
    const group = lineGroups[i];
    const boldItems = group.filter(item => item.isBold);
    
    if (boldItems.length > 0) {
      const text = group.map(item => item.text).join(" ").trim();
      
      // Skip if it looks like a page number or is too short/long
      if (text.match(/^\d+$/) || text.match(/^Page \d+$/) || text.length < 3 || text.length > 100) continue;
      
      // Score based on percentage of bold text and position
      const boldRatio = boldItems.length / group.length;
      const positionScore = 1 - (i / 5); // Higher score for earlier groups
      const score = boldRatio * 0.6 + positionScore * 0.4;
      
      if (score > 0.5) {
        return {
          text,
          score: score * 0.7, // Style is good but not as reliable as font size
          method: "style"
        };
      }
    }
  }
  
  return { text: "", score: 0, method: "style" };
}

// Method 4: Find candidate based on content patterns (looks like a title)
function getContentCandidate(lineGroups: TextItemWithMetadata[][]): TitleCandidate {
  // Title patterns: Not ending with period, between 3-100 chars, no common functional words at start
  const nonTitleStartWords = ['the', 'a', 'an', 'in', 'on', 'at', 'to', 'and', 'or', 'for', 'with'];
  
  for (let i = 0; i < Math.min(lineGroups.length, 6); i++) {
    const group = lineGroups[i];
    const text = group.map(item => item.text).join(" ").trim();
    
    // Skip if it looks like a page number, footer, or is too short/long
    if (text.match(/^\d+$/) || text.match(/^Page \d+$/) || text.length < 3 || text.length > 100) continue;
    
    let score = 0.5; // Base score
    
    // Title usually doesn't end with a period
    if (!text.endsWith('.')) score += 0.1;
    
    // Title usually doesn't start with common articles or prepositions
    const firstWord = text.split(' ')[0].toLowerCase();
    if (!nonTitleStartWords.includes(firstWord)) score += 0.1;
    
    // Title is often capitalized
    if (text.split(' ').filter(word => word.length > 0).every(word => 
      word[0] === word[0].toUpperCase() || ['of', 'the', 'in', 'on', 'at', 'to', 'and', 'or', 'for', 'with'].includes(word.toLowerCase())
    )) {
      score += 0.2;
    }
    
    // Title length is usually 2-7 words
    const wordCount = text.split(' ').filter(w => w.length > 0).length;
    if (wordCount >= 2 && wordCount <= 7) score += 0.1;
    
    // Early position bonus
    score += (1 - (i / 6)) * 0.1;
    
    if (score > 0.65) {
      return {
        text,
        score: score * 0.8, // Content patterns are good indicators but not perfect
        method: "content"
      };
    }
  }
  
  return { text: "", score: 0, method: "content" };
}

// Select the best candidate from all methods
function selectBestCandidate(candidates: TitleCandidate[]): string {
  // Filter out empty candidates
  candidates = candidates.filter(candidate => candidate.text.length > 0);
  
  if (candidates.length === 0) return "Untitled Page";
  
  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);
  
  // Return the highest scoring candidate
  return candidates[0].text;
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
      
      // Extract title using our multi-method approach
      let title = extractTitleFromPage(items, viewport);
      console.log(`Page ${pageNum} - Normalized title: ${title}`);
      
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
    // Check if blob is a valid PDF (at least a basic check)
    if (pdfBlob.size < 100) {
      throw new Error('PDF file is too small to be valid');
    }
    
    // Create a buffer array from the blob for PDF.js
    const arrayBuffer = await pdfBlob.arrayBuffer();
    
    // Create a loading task with error handling
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
    });
    
    // Set a timeout for PDF loading
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('PDF loading timeout')), 10000);
    });
    
    // Race between PDF loading and timeout
    const pdf = await Promise.race([
      loadingTask.promise,
      timeoutPromise
    ]) as pdfjsLib.PDFDocumentProxy;
    
    // Make sure pageIndex is within bounds
    if (pageIndex < 0 || pageIndex >= pdf.numPages) {
      throw new Error(`Page index ${pageIndex} out of bounds. Document has ${pdf.numPages} pages.`);
    }
    
    // Get the page (PDF.js uses 1-based indices)
    const page = await pdf.getPage(pageIndex + 1);
    
    // Get the viewport
    const viewport = page.getViewport({ scale });
    
    // Set canvas dimensions to match the viewport
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    // Get the rendering context
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas context not available');
    
    // Clear the canvas before rendering
    context.clearRect(0, 0, canvas.width, canvas.height);
    
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
      // Set canvas to a reasonable size if not already set
      if (canvas.width === 0) canvas.width = 200;
      if (canvas.height === 0) canvas.height = 280; // Typical aspect ratio
      
      context.fillStyle = '#f8f9fa';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#e11d48';
      context.font = '14px sans-serif';
      context.textAlign = 'center';
      context.fillText('Error rendering page', canvas.width / 2, canvas.height / 2);
    }
    
    // Re-throw the error to be handled by the calling component
    throw error;
  }
}
