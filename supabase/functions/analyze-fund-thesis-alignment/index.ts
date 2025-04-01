
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { corsHeaders } from "./cors.ts";

// Define CORS headers
serve(async (req) => {
  // Log the request details for debugging
  console.log(`Request method: ${req.method}`);
  console.log(`Request headers:`, JSON.stringify(Object.fromEntries(req.headers.entries())));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request with CORS headers');
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key is not configured');
    }

    // Parse the request body
    let requestData;
    try {
      requestData = await req.json();
      console.log('Received request data:', JSON.stringify(requestData));
    } catch (error) {
      console.error('Error parsing request JSON:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const { company_id, user_id } = requestData;

    // Validate input
    if (!company_id || !user_id) {
      console.error('Missing required parameters:', { company_id, user_id });
      return new Response(
        JSON.stringify({ error: 'Company ID and User ID are required' }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log(`Processing fund thesis alignment for company ${company_id} and user ${user_id}`);

    // First check if analysis already exists in the database
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Authorization header is required' }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }
    
    console.log('Checking for existing analysis in database');
    const existingAnalysisResponse = await fetch(`${SUPABASE_URL}/rest/v1/fund_thesis_analysis?company_id=eq.${company_id}&user_id=eq.${user_id}`, {
      headers: {
        'Authorization': authHeader,
        'apikey': SUPABASE_ANON_KEY as string,
      }
    });
    
    if (!existingAnalysisResponse.ok) {
      console.error('Error fetching existing analysis:', await existingAnalysisResponse.text());
      throw new Error(`Error checking for existing analysis: ${existingAnalysisResponse.status}`);
    }
    
    const existingAnalysis = await existingAnalysisResponse.json();
    
    if (existingAnalysis && existingAnalysis.length > 0) {
      // Return existing analysis
      console.log('Found existing analysis, returning it');
      return new Response(
        JSON.stringify({ 
          analysis: existingAnalysis[0].analysis_text,
          prompt_sent: existingAnalysis[0].prompt_sent,
          response_received: existingAnalysis[0].response_received
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    console.log('No existing analysis found, creating new one');

    // Fetch the fund thesis document
    console.log('Fetching fund thesis document');
    const fundThesisResponse = await fetch(`${SUPABASE_URL}/functions/v1/handle-vc-document-upload`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY as string,
        'x-app-version': '1.0.0'
      },
      body: JSON.stringify({ 
        action: 'download', 
        userId: user_id,
        documentType: 'fund_thesis' 
      })
    });

    if (!fundThesisResponse.ok) {
      const errorText = await fundThesisResponse.text();
      console.error('Failed to fetch fund thesis:', errorText);
      
      return new Response(
        JSON.stringify({ 
          error: 'Could not fetch fund thesis document',
          details: errorText
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      );
    }

    // Fetch the company information to get title or company name
    console.log('Fetching company information');
    const companyResponse = await fetch(`${SUPABASE_URL}/rest/v1/companies?id=eq.${company_id}&select=id,name,prompt_sent,response_received,report_id`, {
      headers: {
        'Authorization': authHeader,
        'apikey': SUPABASE_ANON_KEY as string,
      }
    });

    if (!companyResponse.ok) {
      const errorText = await companyResponse.text();
      console.error('Failed to fetch company information:', errorText);
    }
    
    let companyData = null;
    try {
      const companyResults = await companyResponse.json();
      if (companyResults && companyResults.length > 0) {
        companyData = companyResults[0];
        console.log('Found company data:', companyData);
      }
    } catch (error) {
      console.error('Error parsing company response:', error);
    }

    // If we have a report_id from company data, use that directly
    let pitchDeckBlob = null;
    let report_id = companyData?.report_id;
    
    if (report_id) {
      console.log(`Using report_id ${report_id} from company data`);
      
      // Fetch report details to get the PDF URL
      const reportResponse = await fetch(`${SUPABASE_URL}/rest/v1/reports?id=eq.${report_id}&select=id,pdf_url,user_id`, {
        headers: {
          'Authorization': authHeader,
          'apikey': SUPABASE_ANON_KEY as string,
        }
      });
      
      if (reportResponse.ok) {
        const reportData = await reportResponse.json();
        if (reportData && reportData.length > 0) {
          const report = reportData[0];
          console.log(`Found report with PDF: ${report.pdf_url}`);
          
          // Download the pitch deck using the report data
          try {
            const pitchDeckResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/report_pdfs/${report.user_id}/${report.pdf_url}`, {
              method: 'GET',
              headers: {
                'Authorization': authHeader,
                'apikey': SUPABASE_ANON_KEY as string,
              }
            });
            
            if (pitchDeckResponse.ok) {
              pitchDeckBlob = await pitchDeckResponse.blob();
              console.log(`Downloaded pitch deck successfully, size: ${pitchDeckBlob.size} bytes`);
            } else {
              console.error('Failed to download pitch deck from report_pdfs:', await pitchDeckResponse.text());
            }
          } catch (downloadError) {
            console.error('Error downloading pitch deck from report_pdfs:', downloadError);
          }
        }
      } else {
        console.error('Failed to fetch report details:', await reportResponse.text());
      }
    }
    
    // If we didn't get the pitch deck from the report_id approach, try the original methods
    if (!pitchDeckBlob) {
      // Try the original method first - fetch the pitch deck from reports table
      console.log('Fetching company report data to locate pitch deck');
      const reportsResponse = await fetch(`${SUPABASE_URL}/rest/v1/reports?company_id=eq.${company_id}&select=id,pdf_url,user_id`, {
        headers: {
          'Authorization': authHeader,
          'apikey': SUPABASE_ANON_KEY as string,
        }
      });

      if (!reportsResponse.ok) {
        const errorText = await reportsResponse.text();
        console.error('Failed to fetch company reports:', errorText);
        return new Response(
          JSON.stringify({ 
            error: 'Could not fetch company reports',
            details: errorText
          }), 
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404
          }
        );
      }

      const reports = await reportsResponse.json();
      if (!reports || reports.length === 0) {
        console.error('No reports found for company:', company_id);
        return new Response(
          JSON.stringify({ 
            error: 'No reports found for this company',
            details: 'Company does not have any associated reports'
          }), 
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404
          }
        );
      }

      console.log('Found reports for company:', reports);
      const report = reports[0]; // Use the first report
      
      // Now try to fetch the actual pitch deck PDF using the report data
      console.log('Fetching pitch deck document using report data');
      try {
        const pitchDeckResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/report_pdfs/${report.user_id}/${report.pdf_url}`, {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
            'apikey': SUPABASE_ANON_KEY as string,
          }
        });

        if (pitchDeckResponse.ok) {
          pitchDeckBlob = await pitchDeckResponse.blob();
          console.log(`Pitch deck fetched successfully, size: ${pitchDeckBlob.size} bytes`);
        } else {
          const errorText = await pitchDeckResponse.text();
          console.error('Failed to fetch pitch deck directly:', errorText);
          
          // Try the handle-vc-document-upload function as a fallback
          console.log('Trying alternative method to fetch pitch deck');
          const altPitchDeckResponse = await fetch(`${SUPABASE_URL}/functions/v1/handle-vc-document-upload`, {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY as string,
              'x-app-version': '1.0.0'
            },
            body: JSON.stringify({ 
              action: 'download', 
              companyId: company_id 
            })
          });
          
          if (altPitchDeckResponse.ok) {
            pitchDeckBlob = await altPitchDeckResponse.blob();
            console.log(`Alternative pitch deck fetched successfully, size: ${pitchDeckBlob.size} bytes`);
          } else {
            const altErrorText = await altPitchDeckResponse.text();
            console.error('Failed to fetch pitch deck with alternative method:', altErrorText);
            
            // One last attempt - try fetching from reports table with the report_id from company
            if (companyData?.report_id) {
              console.log(`Trying to fetch pitch deck using report_id ${companyData.report_id} from company data`);
              const finalReportResponse = await fetch(`${SUPABASE_URL}/rest/v1/reports?id=eq.${companyData.report_id}&select=id,pdf_url,user_id`, {
                headers: {
                  'Authorization': authHeader,
                  'apikey': SUPABASE_ANON_KEY as string,
                }
              });
              
              if (finalReportResponse.ok) {
                const finalReportData = await finalReportResponse.json();
                if (finalReportData && finalReportData.length > 0) {
                  const finalReport = finalReportData[0];
                  console.log(`Found report with PDF: ${finalReport.pdf_url}`);
                  
                  const finalPitchDeckResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/report_pdfs/${finalReport.user_id}/${finalReport.pdf_url}`, {
                    method: 'GET',
                    headers: {
                      'Authorization': authHeader,
                      'apikey': SUPABASE_ANON_KEY as string,
                    }
                  });
                  
                  if (finalPitchDeckResponse.ok) {
                    pitchDeckBlob = await finalPitchDeckResponse.blob();
                    console.log(`Final attempt pitch deck fetched successfully, size: ${pitchDeckBlob.size} bytes`);
                  } else {
                    console.error('Failed on final attempt to fetch pitch deck:', await finalPitchDeckResponse.text());
                  }
                }
              }
            }
            
            if (!pitchDeckBlob) {
              return new Response(
                JSON.stringify({ 
                  error: 'Could not fetch company pitch deck',
                  details: altErrorText
                }), 
                { 
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  status: 404
                }
              );
            }
          }
        }
      } catch (fetchError) {
        console.error('Error during pitch deck fetch:', fetchError);
        return new Response(
          JSON.stringify({ 
            error: 'Error fetching pitch deck',
            details: fetchError instanceof Error ? fetchError.message : String(fetchError)
          }), 
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          }
        );
      }
    }
    
    const fundThesisBlob = await fundThesisResponse.blob();
      
    console.log(`Fund thesis size: ${fundThesisBlob.size} bytes`);
    console.log(`Pitch deck size: ${pitchDeckBlob ? pitchDeckBlob.size : 0} bytes`);
    
    if (fundThesisBlob.size === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Fund thesis document is empty',
          details: 'Please upload a valid fund thesis document in your profile settings'
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }
    
    if (!pitchDeckBlob || pitchDeckBlob.size === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Pitch deck document is empty',
          details: 'The company pitch deck appears to be empty or inaccessible'
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }
    
    // Convert blobs to base64
    const fundThesisBase64 = await blobToBase64(fundThesisBlob);
    const pitchDeckBase64 = await blobToBase64(pitchDeckBlob);
    
    // Call Gemini and process the results
    return await processDocumentsWithGemini(
      GEMINI_API_KEY,
      fundThesisBase64,
      pitchDeckBase64,
      company_id,
      user_id,
      authHeader,
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    );

  } catch (error) {
    console.error('Error in fund thesis alignment analysis:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

// Utility function to convert blob to base64
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Function to process documents with Gemini API
async function processDocumentsWithGemini(
  GEMINI_API_KEY: string,
  fundThesisBase64: string,
  pitchDeckBase64: string,
  company_id: string,
  user_id: string,
  authHeader: string,
  SUPABASE_URL: string,
  SUPABASE_ANON_KEY: string
): Promise<Response> {
  // Prepare the prompt for Gemini
  const promptText = `You are an expert venture capital analyst. Analyze how well the pitch deck aligns with the fund thesis. 
              
              First, you need to calculate a Synergy Score using the following framework:
              
STARTUP EVALUATION FRAMEWORK
A Step-by-Step Guide for Venture Capital Analysts
1. OVERVIEW
This document presents a multi-dimensional model designed to:
1. Score a startup's fundamentals (Problem, Market, Product, etc.)
2. Incorporate cross-sectional synergy (how various sections reinforce or
undermine each other)
3. Adjust for risk factors relevant to the startup's stage and the investor's
thesis
thesis
The end result is a Composite Score that helps analysts quickly compare
different deals and identify critical areas of further due diligence.
Section Baseline Weight (W_i)
1. Problem 5–10%
2. Market 15–20%
3. Solution / Product 15–20%
4. Competitive Landscape 5–10%
5. Traction 10–15%
6. Business Model 10–15%
7. Go-to-Market Strategy 10–15%
8. Team 10–15%
2. KEY SECTIONS & WEIGHTS
Traditionally, a pitch deck is divided into 10 sections:
1. Problem
2. Market
3. Solution (Product)
4. Competitive Landscape
5. Traction
6. Business Model
7. Go-to-Market Strategy
8. Team
9. Financials
10. The Ask
10. The Ask
Fromaninvestor'sperspective, typicalbaseweights(beforeanyriskadjustment)
might look like this:
8. Team 10–15%
Section Baseline Weight (W_i)
9. Financials 5–10%
10. The Ask 5%
Note: Thesepercentagesareguidelines. DifferentVCsmightallocate
more or less weight depending on their investment stage, sector focus,
or strategic priorities.
3. BASELINE SECTION SCORING
Each section is further broken down into sub-criteria. For instance, Market
might have:
• Market Size (TAM / SAM / SOM)
• Market Growth / Trends
• Competitive Market Dynamics
Each sub-criterion is scored on a 1–5 scale (or 1–10 if more granularity is
desired). For example, on a 1–5 scale:
• 1 = Poor / Missing
• 2 = Weak / Unsatisfactory
• 3 = Adequate / Meets Minimum
• 4 = Good / Above Average
• 5 = Excellent / Best-in-Class
Each sub-criterion has a local weight such that all sub-criteria within a section
sum to 1.0 (100%).
3.1 Formula for Section Score
Scorei =
ni
j=1
wij ×Ratingij
Where:
• i is the section index (1 to 10).
• j runs over the sub-criteria in section i.
• wij is the weight of the j-th sub-criterion in section i.
• Ratingij is the 1–5 score assigned to that sub-criterion.
Each Scorei also ends up in the 1–5 range (assuming the sub-criteria weights
sum to 1).
4. CROSS-SECTIONAL SYNERGY
4.1 Why Synergy Matters
Astartupmightscorehighon"Product"butlowon"Go-to-Market."Inisolation,
those two sections might look acceptable, but if the startup cannot actually
acquire customers to use its otherwise excellent product, the overall opportunity
is weaker.
4.2 Defining the Synergy Index
We define a set of section pairsSthat we believe mustinteract well. Examples
include:
• (Market, Problem): Is there a real, large market for the stated problem?
• (Solution, Competitive Landscape): Is the product truly differentiated
or easily cloned?
• (Business Model, Financials): Does the revenue model match the
financial projections?
• (Traction, Go-to-Market): Can the traction so far be scaled using the
proposed strategy?
Each pair (i,k) in Shas a synergy weight Sik . Then we define a synergy
function f(·):
f(Scorei,Scorek ) = Scorei ×Scorek
5 (if using a 1–5 scale)
This means synergy is highest when both sections are rated high, and it's
lowest when either one is low (multiplicative effect).
SynergyIndex=
(Sik ×f(Scorei,Scorek ))
(i,k)∈S
4.3 Synergy Normalization & Weight (λ)
To incorporate synergy into the final score, we introduce a calibration factor
λ that determines how heavily synergy affects the overall rating:
Synergy Contribution= λ×SynergyIndex
If synergy is extremely important to your fund's thesis (e.g., you invest only in
startups that demonstrate a tightly integrated plan), set λ higher (e.g., 0.3). If
synergy is just a minor supplement, set it lower (e.g., 0.1).
5. RISK-ADJUSTED WEIGHTING
5.1 Rationale
Not all sections carry the same level of risk. If a startup's technology is
unproven, the "Product" or "Traction" sections might be inherently riskier.
Meanwhile, a strong, experienced team may reduce the risk associated with
execution.
5.2 Risk Factor (Ri)
For each section i, assign a risk factor Ri in a range (e.g., [−0.3,+0.3] or
[−1,+1]):
• Positive Ri: Above-average risk (we should weigh this section more).
• Negative Ri: Below-average risk (the item is less likely to derail the
company).
We use Ri to adjust the baseline weight Wi:
∼
Wi = Wi ×
1 + Ri
10
m=1 (Wm ×(1 + Rm))
This re-normalizes weights so they still sum to 1.0 across all 10 sections but
magnifies or diminishes each section proportionally to its risk.
6. FINAL COMPOSITE SCORE
6.1 Assembling All Components
We combine:
1. Baseline Section Scores (Scorei)
2. Risk-Adjusted Weights∼
Wi
3. Synergy Contribution (λ×SynergyIndex)
Composite Score=
10
i=1
∼
Wi ×Scorei + (λ×SynergyIndex)
6.2 Interpretation
• 4.5 – 5.0: High conviction. Likely candidate for deeper diligence or
immediate term sheet.
• 3.5 – 4.4: Promising but some concerns. Requires targeted due diligence
and possibly negotiation of protective terms.
• 2.5 – 3.4: Moderate to high risk or synergy gaps. Needs major improve-
ments or might not meet your fund's return threshold.
• < 2.5: Weak opportunity. High risk and minimal synergy—probably pass.
7. SCENARIO & SENSITIVITY ANALYSIS
7.1 Identifying Key Assumptions
Before finalizing an investment decision, identify critical assumptions that
drive the composite score:
1. Market Size (Is TAM validated or just founder optimism?)
2. Growth / Traction (Can they continue to grow at the stated rate?)
3. Valuation (Is the ask fair? Does the pricing still make sense if growth
slows?)
7.2 Best-, Base-, and Worst-Case Scenarios
Re-score key sections under different assumptions:
• Best-Case: The startup's claims hold up, synergy is high, minimal risk is
realized.
• Base-Case: More conservative growth or market size.
• Worst-Case: Competition intensifies, traction lags, synergy breaks down.
This reveals how sensitive the final composite score is to changes in a few key
variables—providing risk exposure insights.
8. EXAMPLE IMPLEMENTATION
Startup Alpha claims a large market and moderate traction. You score it as
follows (1–5 scale):
Section
Baseline
Weight (Wi)
Sub-Criteria
(Examples) Scores Section Score
1. Problem
(5%)
0.05 - Severity of
Pain (40%)-
Timeliness
(60%)
(4, 5) 4.6
Section
Baseline
Weight (Wi)
Sub-Criteria
(Examples) Scores Section Score
2. Market
(15%)
3. Product
(15%)
4.
Competitive
(10%)
5. Traction
(10%)
6. Business
Model (10%)
7. Go-to-
Market (10%)
8. Team
(10%)
9. Financials
(5%)
10. The Ask
(5%)
0.15 - TAM /
SAM (50%)-
Growth &
Trends (50%)
0.15 - USP (40%)-
Product
Readiness
(60%)
0.10 - Competitor
Mapping
(50%)- Differ-
entiation
(50%)
0.10 - Customer
Adoption
(50%)- Met-
rics/Revenue
(50%)
0.10 - Revenue
Streams
(50%)-
Scalability
(50%)
0.10 - Chan-
nels/Strategy
(50%)-
Milestones
(50%)
0.10 - Experience
(50%)- Com-
plementarity
(50%)
0.05 - Forecast
Accuracy
(50%)- Burn
Rate (50%)
0.05 - Valuation
Rationale
(50%)- Fund
Usage (50%)
(4, 4) 4.0
(3, 4) 3.4
(3, 3) 3.0
(3, 3) 3.0
(3, 4) 3.5
(2, 3) 2.5
(5, 4) 4.5
(3, 2) 2.5
(3, 3) 3.0
• Risk Factors (Ri):
– Product = +0.2 (new tech, not fully validated)
– Go-to-Market = +0.3 (untested approach)
– Financials = +0.1 (assumptions unclear)
– Team = -0.2 (strong track record, reducing risk)
• Synergy Pairs & Weights (Sik ):
– (Market, Problem) = 0.10
– (Product, Competitive) = 0.15
– (Traction, Go-to-Market) = 0.20
– (Business Model, Financials) = 0.10
• For synergy function:
f(Scorei,Scorek ) = Scorei ×Scorek
1. Calculate Risk-Adjusted Weights (∼
Wi)
• For example, if Go-to-Market has WGT M = 0.10 and RGT M = +0.3,
its effective weight is raised.
2. Calculate SynergyIndex
• E.g., (Traction = 3.0,Go-to-Market = 2.5) → f(3.0,2.5) = (3.0 ×
2.5)/5 = 1.5. Weighted by 0.20 → 0.30 synergy contribution from
that pair.
3. Combine them to get the Composite Score.
APPENDICES
Appendix A: Detailed Sub-Criteria Examples
1. Market
• Market Size Accuracy (50%)
• Market Growth Rate & Trends (30%)
• Adjacent Market Opportunities (20%)
2. Traction
• Monthly or Quarterly Growth Rate (40%)
• Paying Customers or Pilot Partnerships (30%)
• Churn / Retention / Engagement (30%)
3. Team
• Past Startup Experience (40%)
• Domain Expertise (30%)
• Commitment & Advisory Board (30%)
(. . . and so on for other sections.)
Appendix B: Example Risk Factor Scale
• -0.3: Extremely low risk (established moat, strong traction, proven team)
• -0.1: Below-average risk
• 0: Neutral risk
• +0.1: Some concerns
• +0.3: Significant risk (unproven assumptions, early technology, etc.)
Appendix C: Synergy Pairs (Common Examples)
• (Problem, Market)
• (Solution, Competitive Landscape)
• (Business Model, Financials)
• (Traction, Go-to-Market)
• (Team, All Other Sections) – sometimes scored if the team's skillset is
critical to overcoming certain market or product challenges.
              5. Calculate the final Synergy Score on a scale of 1-5(MOST IMPORTANT).
              
              Provide your analysis in exactly the following format with these three sections ONLY:
              
              1. Overall Summary - Start with "Synergy Score: X.X/5" followed by a concise evaluation of the overall alignment
              2. Key Similarities - The main points where the pitch deck aligns with the fund thesis
              3. Key Differences - The main areas where the pitch deck diverges from the fund thesis
              
              Fund Thesis PDF Content:
              ${fundThesisBase64}

              Pitch Deck PDF Content:
              ${pitchDeckBase64}`;

  console.log('Calling Gemini API to analyze alignment');
  // Call Gemini to analyze alignment
  const geminiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
  const urlWithApiKey = `${geminiEndpoint}?key=${GEMINI_API_KEY}`;

  const geminiResponse = await fetch(urlWithApiKey, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: promptText
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048
      }
    }),
  });

  if (!geminiResponse.ok) {
    const errorText = await geminiResponse.text();
    console.error('Gemini API error:', errorText);
    throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
  }

  const geminiData = await geminiResponse.json();
  console.log('Received response from Gemini API');
  
  let analysisText = '';
  let rawResponse = '';
  
  if (geminiData.candidates && geminiData.candidates.length > 0 && 
      geminiData.candidates[0].content && geminiData.candidates[0].content.parts && 
      geminiData.candidates[0].content.parts.length > 0) {
    analysisText = geminiData.candidates[0].content.parts[0].text;
    rawResponse = JSON.stringify(geminiData);
    console.log('Analysis text length:', analysisText.length);
    console.log('Analysis text sample:', analysisText.substring(0, 200));
  } else {
    console.error('Unexpected response format from Gemini API:', JSON.stringify(geminiData));
    throw new Error('Unexpected response format from Gemini API');
  }

  // Store analysis in Supabase
  console.log('Storing analysis in Supabase');
  const supabaseStoreResponse = await fetch(`${SUPABASE_URL}/rest/v1/fund_thesis_analysis`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'apikey': SUPABASE_ANON_KEY as string,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      company_id,
      user_id,
      analysis_text: analysisText,
      prompt_sent: promptText,
      response_received: rawResponse
    })
  });

  if (!supabaseStoreResponse.ok) {
    const errorText = await supabaseStoreResponse.text();
    console.error('Failed to store analysis:', errorText);
    throw new Error(`Failed to store analysis: ${supabaseStoreResponse.status} - ${errorText}`);
  }

  const storedAnalysis = await supabaseStoreResponse.json();
  console.log('Analysis stored successfully');

  return new Response(JSON.stringify({ 
    analysis: analysisText,
    prompt_sent: promptText,
    response_received: rawResponse,
    storedAnalysis 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  });
}
