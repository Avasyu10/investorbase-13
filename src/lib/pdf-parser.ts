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

// Function to fix spacing issues in extracted text using regex and NLP
function normalizeText(text: string): string {
  if (!text) return "Untitled Page";
  
  // Initial clean-up: trim and replace multiple spaces with a single space
  let normalized = text.replace(/\s+/g, ' ').trim();
  
  // Check if text appears to have spacing issues (no spaces, abnormal capitalization, etc.)
  const hasSpacingIssues = (
    // No spaces or very few spaces relative to length
    (normalized.length > 15 && normalized.split(' ').length < normalized.length / 8) || 
    // Alternating case patterns that suggest missing spaces
    /[a-z][A-Z]/.test(normalized) ||
    // Single letters separated by spaces (like "T h i s")
    /(\b\w\s\w\s\w\b|\b(\w\s){2,})/.test(normalized) ||
    // All lowercase with no spaces or very few spaces
    (/^[a-z]{15,}$/.test(normalized) && normalized.indexOf(' ') === -1)
  );
  
  // Always apply some basic text normalization
  // Fix camelCase and PascalCase patterns
  normalized = normalized
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase -> camel Case
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2'); // PascalCase -> Pascal Case
  
  if (hasSpacingIssues || normalized.length > 15) {
    console.log("Fixing text with spacing issues:", normalized);
    
    try {
      // STEP 1: Apply common word pattern detection
      // List of common words, prefixes, and suffixes to help with splitting
      const commonParts = [
        // Common short words
        'of', 'to', 'in', 'on', 'at', 'by', 'for', 'the', 'and', 'but', 'or', 'nor', 'yet', 'so',
        'from', 'with', 'this', 'that', 'some', 'what', 'when', 'then', 'than',
        // Common prefixes
        'pre', 'post', 'anti', 'auto', 'bi', 'co', 'counter', 'de', 'dis', 'down', 'extra', 
        'hyper', 'il', 'im', 'in', 'inter', 'intra', 'ir', 'mega', 'mid', 'mis', 'non', 
        'over', 're', 'semi', 'sub', 'super', 'trans', 'un', 'under', 'up',
        // Common suffixes
        'able', 'al', 'ance', 'ation', 'ative', 'ed', 'en', 'ence', 'ent', 'er', 'es', 
        'est', 'ful', 'ial', 'ible', 'ic', 'ical', 'ing', 'ion', 'ish', 'ism', 
        'ist', 'ity', 'ive', 'ize', 'less', 'ly', 'ment', 'ness', 's', 'tion', 'ward',
        // Business terms
        'market', 'business', 'company', 'industry', 'product', 'service', 'customer',
        'client', 'revenue', 'profit', 'cost', 'price', 'value', 'growth', 'trend', 'strategy',
        'plan', 'goal', 'objective', 'result', 'impact', 'effect', 'measure', 'quality', 'risk',
        'issue', 'problem', 'solution', 'approach', 'method', 'report', 'analysis', 'summary'
      ].sort((a, b) => b.length - a.length); // Sort by length descending for better matching
      
      // Create regex pattern to find these common words within a string without spaces
      const pattern = new RegExp(`(${commonParts.join('|')})`, 'gi');
      normalized = normalized.replace(pattern, ' $1 ');
      
      // STEP 2: Apply specific spacing rules for different patterns
      normalized = normalized
        // Break at capital letters (preserving acronyms)
        .replace(/([a-z])([A-Z]{2,})/g, '$1 $2') // theUSA -> the USA
        .replace(/([a-z])([A-Z][a-z])/g, '$1 $2') // theUSA -> the USA
        
        // Break at digit boundaries
        .replace(/([a-zA-Z])(\d)/g, '$1 $2')
        .replace(/(\d)([a-zA-Z])/g, '$1 $2')
        
        // Break at symbol boundaries
        .replace(/([.,;:!?])([a-zA-Z])/g, '$1 $2')
        
        // Special case for hyphenated words (preserve hyphen but ensure spaces around it)
        .replace(/([a-zA-Z])-([a-zA-Z])/g, '$1 - $2')
        
        // Fix joined lowercase words by splitting at vowel-consonant boundaries for words > 6 chars
        .replace(/([a-z]{6,})/g, (match) => {
          // Only process if it looks like it needs splitting (no spaces)
          if (!/\s/.test(match)) {
            return match
              // Split vowel-consonant pairs which often indicate word boundaries
              .replace(/([aeiou])([bcdfghjklmnpqrstvwxyz])/gi, '$1 $2')
              // Also try consonant-vowel pairs for rare cases
              .replace(/([bcdfghjklmnpqrstvwxyz])([aeiou])/gi, (m, c, v) => {
                // Only split if not at start of word and previous character isn't already a space
                return m.charAt(0) === match.charAt(0) ? m : `${c} ${v}`;
              });
          }
          return match;
        });
      
      // STEP 3: Apply NLP parsing for more intelligent text splitting
      if (normalized.includes(' ') && normalized.split(' ').some(word => word.length > 10)) {
        try {
          const doc = nlp(normalized);
          // If NLP can recognize more than one term, use its segmentation
          if (doc.terms().length > 1) {
            normalized = doc.terms().out('array').join(' ');
          }
        } catch (nlpError) {
          console.error("NLP processing error:", nlpError);
        }
      }
      
      // STEP 4: Final cleanup - merge multiple spaces and trim
      normalized = normalized
        .replace(/\s+/g, ' ')
        .trim();
      
      // STEP 5: Apply smart title case capitalization
      // Only capitalize if it looks like a title (not mostly uppercase already)
      if (normalized.toUpperCase() !== normalized) {
        const excludedWords = new Set(['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 
                                       'on', 'at', 'to', 'from', 'by', 'with', 'in', 'of']);
        normalized = normalized.split(' ').map((word, index) => {
          // Always capitalize first and last word
          if (index === 0 || index === normalized.split(' ').length - 1) {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          }
          // Don't capitalize certain words unless they're already capitalized
          if (excludedWords.has(word.toLowerCase()) && word !== word.toUpperCase()) {
            return word.toLowerCase();
          }
          // Capitalize other words
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(' ');
      }
      
      console.log("Fixed text:", normalized);
      
    } catch (error) {
      console.error("Error in text normalization:", error);
      // Fallback to basic fixes
      normalized = normalized
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
        .replace(/\s+/g, ' ')
        .trim();
    }
  }
  
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
      console.log(`Page ${pageNum} - Raw title: ${title}`);
      
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
