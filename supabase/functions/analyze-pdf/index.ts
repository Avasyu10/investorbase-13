import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "./cors.ts";
import { getReportData } from "./reportService.ts";
import { analyzeWithOpenAI } from "./openaiService.ts";
import { 
  storeAnalysisResult, 
  updateCompanyFromAnalysis, 
  createSectionsFromAnalysis,
  getExistingAnalysis 
} from "./databaseService.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportId, analysisType, companyName } = await req.json();
    
    if (!reportId) {
      throw new Error('Report ID is required');
    }

    console.log(`Processing request for report ${reportId}`, { analysisType, companyName });

    // Handle improvement suggestions analysis type
    if (analysisType === 'improvement_suggestions') {
      console.log('Generating improvement suggestions for:', companyName);
      
      const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
      if (!geminiApiKey) {
        throw new Error('GEMINI_API_KEY not configured');
      }

      // Get the report data and PDF
      const { supabase, report, pdfBase64 } = await getReportData(reportId);
      
      // Generate improvement suggestions using specialized prompt
      const improvementPrompt = `Analyze this pitch deck PDF and provide 8-12 specific, actionable improvement suggestions. Focus on what's missing or could be enhanced to make this a stronger investment pitch. Consider market data, industry benchmarks, and investor expectations.

Return your response in EXACTLY this JSON format:

{
  "suggestions": [
    "Add a comprehensive Market Sizing slide using TAM/SAM/SOM framework. Include specific market size figures (e.g., '$X billion TAM, $Y billion SAM, $Z million SOM by 2027') with credible sources like Gartner, McKinsey, or industry reports.",
    "Include competitive landscape matrix showing direct and indirect competitors with positioning based on key differentiators. Add market share data and competitive advantages.",
    "Strengthen financial projections with 3-5 year revenue forecasts, unit economics (CAC, LTV, gross margins), and key financial metrics benchmarked against industry standards.",
    "Add traction metrics with specific numbers: user growth rates, revenue growth (MoM/YoY), customer acquisition metrics, retention rates, and key partnerships.",
    "Include detailed go-to-market strategy with customer acquisition channels, sales funnel metrics, customer segments, and distribution strategy with cost estimates.",
    "Enhance team slide with specific relevant experience, previous exits, domain expertise, advisory board members, and key hires planned with their backgrounds.",
    "Add risk analysis section identifying key business risks, market risks, competitive threats, and mitigation strategies with contingency plans.",
    "Include use of funds breakdown with specific allocation percentages, timeline for deployment, expected milestones, and ROI projections for each funding category."
  ]
}

CRITICAL REQUIREMENTS:
- Analyze the actual content and identify what's genuinely missing or weak
- Each suggestion must be specific and actionable, not generic advice
- Include specific market data, percentages, timeframes, and industry benchmarks where applicable
- Reference real market sizing methodologies (TAM/SAM/SOM), financial metrics (CAC, LTV, burn rate), and growth benchmarks
- Tailor suggestions to the specific industry and business model shown in the deck
- Prioritize suggestions that address the most critical gaps for investor appeal
- Include quantitative targets and benchmarks (e.g., "aim for >40% gross margins", "achieve <6 month payback period")
- Reference industry-standard frameworks and methodologies (OKRs, unit economics, cohort analysis)

If the deck already covers certain areas well, focus suggestions on enhancement rather than addition. Ensure all suggestions are practical and implementable.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: improvementPrompt
                },
                {
                  inline_data: {
                    mime_type: "application/pdf",
                    data: pdfBase64
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096,
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("Received response from Gemini API for improvement suggestions");

      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error("Invalid response structure from Gemini API");
      }

      const rawResponse = data.candidates[0].content.parts[0].text;
      console.log("Raw Gemini response length:", rawResponse.length);

      // Extract JSON from the response
      const jsonMatch = rawResponse.match(/```json\n?(.*?)\n?```/s);
      if (!jsonMatch) {
        throw new Error("No JSON found in Gemini response");
      }

      const jsonText = jsonMatch[1];
      let suggestions;
      
      try {
        const parsed = JSON.parse(jsonText);
        suggestions = parsed.suggestions || [];
        console.log("Successfully parsed improvement suggestions:", suggestions.length);
      } catch (error) {
        console.error("Error parsing JSON:", error);
        throw new Error(`Failed to parse JSON response: ${error.message}`);
      }

      return new Response(JSON.stringify({ suggestions }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract API key from environment variables
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }
    
    // Determine analysis type and user type
    const usePublicAnalysisPrompt = !!Deno.env.get('USE_PUBLIC_ANALYSIS_PROMPT');
    const scoringScale = parseInt(Deno.env.get('SCORING_SCALE') || '100', 10);
    const isIITBombayUser = !!Deno.env.get('IS_IIT_BOMBAY_USER');

    // Get the report data and PDF
    const { supabase, report, pdfBase64 } = await getReportData(reportId);
    
    // Check if analysis already exists
    const existingAnalysis = await getExistingAnalysis(reportId);
    if (existingAnalysis) {
      console.log(`Analysis found in DB, returning existing analysis`);
      return new Response(JSON.stringify(existingAnalysis), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Analyze the PDF using OpenAI
    const analysisResult = await analyzeWithOpenAI(
      pdfBase64, 
      geminiApiKey, 
      usePublicAnalysisPrompt,
      scoringScale,
      isIITBombayUser
    );
    
    // Store the analysis result in the database
    await storeAnalysisResult(reportId, analysisResult);
    
    // Update the company with the overall score and assessment points
    if (report.company_id) {
      await updateCompanyFromAnalysis(report.company_id, analysisResult);
    } else {
      console.log('No company ID associated with this report.');
    }
    
    // Create sections from the analysis result
    await createSectionsFromAnalysis(reportId, analysisResult);

    // Return the analysis result
    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check the function logs for more information'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
