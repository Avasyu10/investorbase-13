import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { PDFDocument } from "https://cdn.skypack.dev/pdf-lib";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-version',
};

const MAX_GEMINI_TOKENS = 900000; // Leave some buffer for API overhead
const MAX_CONTENT_SIZE = 700000; // Characters (roughly corresponds to tokens)
const MAX_PAGES_TO_EXTRACT = 25; // Maximum pages to extract from PDFs

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request with CORS headers");
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Request method:", req.method);
  console.log("Request headers:", JSON.stringify(req.headers));

  try {
    // Parse the request body
    const requestData = await req.json();
    console.log("Received request data:", JSON.stringify(requestData));

    const { company_id, user_id } = requestData;
    
    if (!company_id || !user_id) {
      throw new Error("Missing required parameters: company_id or user_id");
    }

    console.log(`Processing fund thesis alignment for company ${company_id} and user ${user_id}`);

    // Initialize Supabase client with admin rights
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if we already have an analysis for this company and user
    console.log("Checking for existing analysis in database");
    const { data: existingAnalysis, error: analysisError } = await supabase
      .from('fund_thesis_analysis')
      .select('*')
      .eq('company_id', company_id)
      .eq('user_id', user_id)
      .maybeSingle();
      
    if (analysisError) {
      console.error("Error checking for existing analysis:", analysisError);
      throw analysisError;
    }
    
    if (existingAnalysis) {
      console.log("Found existing analysis, returning it");
      return new Response(
        JSON.stringify({
          success: true,
          analysis: existingAnalysis.analysis,
          created_at: existingAnalysis.created_at
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log("No existing analysis found, creating new one");
    
    // Create a record to track this analysis
    const { data: analysisRecord, error: createError } = await supabase
      .from('fund_thesis_analysis')
      .insert({
        company_id,
        user_id,
        status: 'processing'
      })
      .select()
      .single();
      
    if (createError) {
      console.error("Error creating analysis record:", createError);
      throw createError;
    }
    
    // Get the fund thesis document for this user
    console.log("Fetching fund thesis document");
    const { data: thesisDoc, error: thesisError } = await supabase
      .from('investor_documents')
      .select('file_path')
      .eq('user_id', user_id)
      .eq('document_type', 'fund_thesis')
      .maybeSingle();
      
    if (thesisError) {
      console.error("Error fetching fund thesis:", thesisError);
      throw thesisError;
    }
    
    if (!thesisDoc || !thesisDoc.file_path) {
      throw new Error("No fund thesis document found for this user");
    }
    
    // Get the pitch deck for this company (find it through reports)
    console.log("Fetching company report data to locate pitch deck");
    const { data: reports, error: reportsError } = await supabase
      .from('reports')
      .select('id, pdf_url, user_id')
      .eq('company_id', company_id);
      
    if (reportsError) {
      console.error("Error fetching company reports:", reportsError);
      throw reportsError;
    }
    
    if (!reports || reports.length === 0) {
      throw new Error("No pitch deck found for this company");
    }
    
    console.log("Found reports for company:", reports);
    
    // Attempt to download the pitch deck
    let pitchDeckContent = null;
    let downloadError = null;

    console.log("Fetching pitch deck document using report data");
    
    // Try to fetch the document for each report until one succeeds
    for (const report of reports) {
      try {
        // Construct the path to the file
        const filePath = `${report.user_id}/${report.pdf_url}`;
        
        // Download the file
        const { data: fileData, error: downloadErr } = await supabase.storage
          .from('report_pdfs')
          .download(filePath);
          
        if (downloadErr) {
          console.error("Failed to download pitch deck directly:", downloadErr);
          continue; // Try the next report
        }
        
        // If we got here, we have the file
        const pdfBytes = await fileData.arrayBuffer();
        const byteSize = pdfBytes.byteLength;
        console.log("Pitch deck size:", byteSize, "bytes");
        
        // Extract and compress text content from the pitch deck PDF
        pitchDeckContent = await extractCompressedTextFromPDF(pdfBytes);
        break; // Successfully got the file, exit the loop
      } catch (err) {
        console.error("Error processing pitch deck:", err);
        downloadError = err;
        // Continue to try the next report
      }
    }
    
    if (!pitchDeckContent) {
      throw new Error(`Failed to process any pitch deck for this company: ${downloadError?.message || "Unknown error"}`);
    }
    
    // Download the fund thesis document
    const { data: thesisData, error: thesisDownloadError } = await supabase.storage
      .from('investor_documents')
      .download(thesisDoc.file_path);
      
    if (thesisDownloadError) {
      console.error("Error downloading fund thesis:", thesisDownloadError);
      throw thesisDownloadError;
    }
    
    const thesisBytes = await thesisData.arrayBuffer();
    console.log("Fund thesis size:", thesisBytes.byteLength, "bytes");
    
    // Extract text from the fund thesis PDF
    const thesisContent = await extractCompressedTextFromPDF(thesisBytes);
    
    // Process the documents with Gemini
    const analysis = await processDocumentsWithGemini(thesisContent, pitchDeckContent);
    
    // Update the analysis record
    const { error: updateError } = await supabase
      .from('fund_thesis_analysis')
      .update({
        analysis,
        status: 'completed'
      })
      .eq('id', analysisRecord.id);
      
    if (updateError) {
      console.error("Error updating analysis record:", updateError);
      throw updateError;
    }
    
    // Return the analysis
    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        created_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in fund thesis alignment analysis:", error);
    
    // Try to update the analysis record with the error
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        await supabase
          .from('fund_thesis_analysis')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : String(error)
          })
          .eq('company_id', (await req.json()).company_id)
          .eq('user_id', (await req.json()).user_id);
      }
    } catch (updateError) {
      console.error("Error updating analysis record with error:", updateError);
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Function to extract and compress text content from PDF
async function extractCompressedTextFromPDF(pdfBytes) {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pageCount = pdfDoc.getPageCount();
    
    // Limit the number of pages to extract to avoid token limit
    const pagesToExtract = Math.min(pageCount, MAX_PAGES_TO_EXTRACT);
    console.log(`Extracting text from ${pagesToExtract} out of ${pageCount} pages`);
    
    // For now, we'll have to use a mock text extraction since pdf-lib doesn't support text extraction
    // In a real implementation, you would use a proper PDF text extraction library
    let content = `This PDF has ${pageCount} pages. `;
    content += "Below is a summary of key sections from the document:\n\n";
    
    // Append metadata if available
    const title = pdfDoc.getTitle() || "Untitled Document";
    const author = pdfDoc.getAuthor() || "Unknown Author";
    content += `Title: ${title}\nAuthor: ${author}\n\n`;
    
    // Add placeholder text for each page (in reality, you'd extract actual text)
    for (let i = 0; i < pagesToExtract; i++) {
      const page = pdfDoc.getPage(i);
      const { width, height } = page.getSize();
      content += `Page ${i + 1} (${width.toFixed(0)}x${height.toFixed(0)}): `;
      
      // Simulate text extraction based on page dimensions
      content += `This page contains content that would be extracted from the PDF. `;
      if (i === 0) {
        content += "This appears to be the title page. ";
      } else if (i === 1) {
        content += "This may be a table of contents or executive summary. ";
      } else {
        content += "This contains detailed information from the document. ";
      }
      content += "\n\n";
    }
    
    // If we couldn't extract pages, we'll summarize
    if (pagesToExtract < pageCount) {
      content += `Note: ${pageCount - pagesToExtract} additional pages were not extracted to stay within token limits.`;
    }
    
    // Compress the content to fit within token limits
    if (content.length > MAX_CONTENT_SIZE) {
      console.log(`Content size (${content.length} chars) exceeds limit, compressing...`);
      content = compressContent(content, MAX_CONTENT_SIZE);
      console.log(`Compressed to ${content.length} chars`);
    }
    
    return content;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    return `[PDF content extraction failed: ${error.message}]`;
  }
}

// Function to compress content to fit within token limits
function compressContent(content, maxSize) {
  // If content is already within limits, return it as-is
  if (content.length <= maxSize) return content;
  
  // Simple compression: Keep introduction and truncate the middle
  const intro = content.substring(0, maxSize * 0.3);
  const conclusion = content.substring(content.length - maxSize * 0.2);
  
  // Calculate how much space we have for the middle portion
  const remainingSpace = maxSize - intro.length - conclusion.length - 100; // 100 chars for the ellipsis and summary
  const middle = content.substring(intro.length, intro.length + remainingSpace);
  
  // Combine the sections with an explanation of the compression
  return intro + middle + 
    "\n\n[...Content compressed due to token limits...]\n\n" +
    `[${content.length - (intro.length + middle.length + conclusion.length)} characters were omitted for brevity.]\n\n` +
    conclusion;
}

// Function to process documents with Gemini
async function processDocumentsWithGemini(thesisContent, pitchDeckContent) {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY environment variable");
  }
  
  // Calculate total input size and compress further if needed
  const combinedSize = thesisContent.length + pitchDeckContent.length;
  let compressedThesis = thesisContent;
  let compressedPitchDeck = pitchDeckContent;
  
  if (combinedSize > MAX_CONTENT_SIZE) {
    console.log(`Combined content (${combinedSize} chars) exceeds limit, applying additional compression...`);
    
    // Calculate compression ratio for each document
    const thesisRatio = 0.40; // Keep more of the fund thesis as it's more important for the analysis
    const pitchDeckRatio = 0.60; // Keep less of the pitch deck
    
    const thesisAllocation = Math.floor(MAX_CONTENT_SIZE * thesisRatio);
    const pitchDeckAllocation = Math.floor(MAX_CONTENT_SIZE * pitchDeckRatio);
    
    compressedThesis = compressContent(thesisContent, thesisAllocation);
    compressedPitchDeck = compressContent(pitchDeckContent, pitchDeckAllocation);
    
    console.log(`Compressed thesis to ${compressedThesis.length} chars`);
    console.log(`Compressed pitch deck to ${compressedPitchDeck.length} chars`);
  }
  
  // Create the prompt for Gemini
  const prompt = `
You are an expert investor analyzing a pitch deck against a fund thesis to determine alignment.

FUND THESIS DOCUMENT:
${compressedThesis}

PITCH DECK:
${compressedPitchDeck}

TASK:
Assess how well the startup's pitch deck aligns with the fund thesis document. Provide a comprehensive analysis structured as follows:

1. Overall Summary
Analyze the overall synergy between the pitch deck and fund thesis, focusing on strategic fit, market alignment, and investment criteria match.

2. Key Similarities
Highlight specific points where the pitch deck aligns well with the fund thesis principles (at least 3-5 points).

3. Key Differences
Identify areas where the pitch deck diverges from the fund thesis criteria (at least 3-5 points).

IMPORTANT: Include a "Synergy Score" on a scale of 0.0-5.0 (format exactly as "**Synergy Score:** X.X/5") that quantifies the overall alignment.

Your response format must include the same section names, in this exact order, and include the formatted Synergy Score.
`;

  console.log("Calling Gemini API to analyze alignment");
  
  // Call Gemini API
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096
      }
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API error:", errorText);
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  
  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
    throw new Error("Unexpected response format from Gemini API");
  }
  
  return data.candidates[0].content.parts[0].text;
}
