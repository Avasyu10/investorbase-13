
import { encode } from "https://deno.land/std@0.177.0/encoding/base64.ts";

export interface AnalysisResult {
  overallScore: number;
  assessmentPoints: string[];
  sections: Array<{
    title: string;
    type: string;
    score: number;
    strengths: string[];
    weaknesses: string[];
    detailedContent: string;
  }>;
  slideBySlideNotes?: Array<{
    slideNumber: number;
    notes: string[];
  }>;
}

export async function analyzeWithOpenAI(pdfBase64: string, apiKey: string, usePublicAnalysisPrompt = false, scoringScale = 100, isIITBombayUser = false): Promise<any> {
  console.log("Starting Gemini analysis with PDF data");
  
  // Choose the appropriate prompt based on the analysis type and user type
  let basePrompt;
  if (usePublicAnalysisPrompt && !isIITBombayUser) {
    // Non-IIT Bombay users get slide-by-slide analysis
    basePrompt = getSlideBySlideAnalysisPrompt(scoringScale);
    console.log("Using slide-by-slide analysis prompt for non-IIT Bombay user");
  } else if (usePublicAnalysisPrompt) {
    // IIT Bombay users get regular public analysis
    basePrompt = getPublicAnalysisPrompt(scoringScale);
    console.log("Using public analysis prompt for IIT Bombay user");
  } else {
    // Enhanced analysis for internal use
    basePrompt = getEnhancedAnalysisPrompt();
    console.log("Using enhanced analysis prompt");
  }
  
  const payload = {
    contents: [
      {
        parts: [
          {
            text: basePrompt
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
      maxOutputTokens: 8192,
    }
  };

  console.log("Sending request to Gemini API");
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log("Received response from Gemini API");

  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    throw new Error("Invalid response structure from Gemini API");
  }

  const rawResponse = data.candidates[0].content.parts[0].text;
  console.log("Raw Gemini response length:", rawResponse.length);
  console.log("Raw Gemini response preview:", rawResponse.substring(0, 500));

  // Extract JSON from the response
  const jsonMatch = rawResponse.match(/```json\n?(.*?)\n?```/s);
  if (!jsonMatch) {
    throw new Error("No JSON found in Gemini response");
  }

  const jsonText = jsonMatch[1];
  console.log("Extracted JSON text length:", jsonText.length);
  console.log("JSON preview:", jsonText.substring(0, 500));

  let analysis;
  try {
    analysis = JSON.parse(jsonText);
    console.log("Successfully parsed analysis result");
  } catch (error) {
    console.error("Error parsing JSON:", error);
    throw new Error(`Failed to parse JSON response: ${error.message}`);
  }

  // Validate and normalize the analysis based on scoring scale and user type
  if (usePublicAnalysisPrompt && scoringScale === 100) {
    // Ensure scores are within 0-100 range for public analysis
    if (analysis.overallScore < 0 || analysis.overallScore > 100) {
      console.warn(`Overall score ${analysis.overallScore} out of range, clamping to 0-100`);
      analysis.overallScore = Math.max(0, Math.min(100, analysis.overallScore));
    }
    
    // Validate section scores
    if (analysis.sections) {
      analysis.sections.forEach((section: any) => {
        if (section.score < 0 || section.score > 100) {
          console.warn(`Section score ${section.score} out of range, clamping to 0-100`);
          section.score = Math.max(0, Math.min(100, section.score));
        }
      });
    }
  }

  // Ensure slideBySlideNotes field exists for non-IIT Bombay users
  if (usePublicAnalysisPrompt && !isIITBombayUser) {
    if (!analysis.slideBySlideNotes) {
      console.warn("No slideBySlideNotes found in analysis result, initializing empty array");
      analysis.slideBySlideNotes = [];
    }
    console.log("Slide by slide notes count:", analysis.slideBySlideNotes?.length || 0);
  }

  console.log("Analysis sections count:", analysis.sections?.length || 0);
  console.log("Overall score:", analysis.overallScore);
  console.log("Slide by slide notes count:", analysis.slideBySlideNotes?.length || 0);

  return analysis;
}

function getEnhancedAnalysisPrompt(): string {
  return `Analyze this PDF document and provide a comprehensive investment assessment. Please return your analysis in the following JSON format:

{
  "overallScore": <number between 1-100>,
  "assessmentPoints": [
    "<key insight 1>",
    "<key insight 2>",
    "<key insight 3>",
    "<key insight 4>",
    "<key insight 5>"
  ],
  "sections": [
    {
      "type": "PROBLEM",
      "title": "Problem Statement",
      "score": <number between 1-100>,
      "description": "<detailed analysis>",
      "strengths": [
        "<detailed strength 1 with market data and specific metrics>",
        "<detailed strength 2 with market data and specific metrics>",
        "<detailed strength 3 with market data and specific metrics>",
        "<detailed strength 4 with market data and specific metrics>",
        "<detailed strength 5 with market data and specific metrics>"
      ],
      "weaknesses": [
        "<detailed weakness 1 with market context and specific concerns>",
        "<detailed weakness 2 with market context and specific concerns>",
        "<detailed weakness 3 with market context and specific concerns>",
        "<detailed weakness 4 with market context and specific concerns>",
        "<detailed weakness 5 with market context and specific concerns>"
      ]
    },
    ... (continue for all sections)
  ]
}

CRITICAL REQUIREMENTS FOR STRENGTHS AND WEAKNESSES:
- Each strength and weakness MUST be 4-5 detailed points
- Each point MUST include specific market data, metrics, or industry benchmarks where applicable
- Include relevant market size figures, growth rates, competitive positioning data
- Reference industry standards, adoption rates, or market trends
- Provide specific numbers, percentages, or comparative data points
- Each point should be substantial and analytical, not just surface-level observations

Please analyze these sections:
1. PROBLEM - Problem Statement
2. MARKET - Market Opportunity  
3. SOLUTION - Solution (Product)
4. COMPETITIVE_LANDSCAPE - Competitive Landscape
5. TRACTION - Traction & Milestones
6. BUSINESS_MODEL - Business Model
7. GTM_STRATEGY - Go-to-Market Strategy
8. TEAM - Founder & Team Background
9. FINANCIALS - Financial Overview & Projections
10. ASK - The Ask & Next Steps

Score each section from 1-100 based on quality, completeness, and investment potential. Ensure all strengths and weaknesses are comprehensive, data-driven, and include relevant market context.`;
}

function getPublicAnalysisPrompt(scoringScale: number): string {
  return `Analyze this PDF document and provide a comprehensive investment assessment. Please return your analysis in the following JSON format:

{
  "overallScore": <number between 0-${scoringScale}>,
  "assessmentPoints": [
    "<key insight 1>",
    "<key insight 2>",
    "<key insight 3>",
    "<key insight 4>",
    "<key insight 5>"
  ],
  "sections": [
    {
      "type": "PROBLEM",
      "title": "Problem Statement",
      "score": <number between 0-${scoringScale}>,
      "description": "<detailed analysis>",
      "strengths": ["<strength 1>", "<strength 2>"],
      "weaknesses": ["<weakness 1>", "<weakness 2>"]
    },
    ... (continue for all sections)
  ]
}

Please analyze these sections:
1. PROBLEM - Problem Statement
2. MARKET - Market Opportunity  
3. SOLUTION - Solution (Product)
4. COMPETITIVE_LANDSCAPE - Competitive Landscape
5. TRACTION - Traction & Milestones
6. BUSINESS_MODEL - Business Model
7. GTM_STRATEGY - Go-to-Market Strategy
8. TEAM - Founder & Team Background
9. FINANCIALS - Financial Overview & Projections
10. ASK - The Ask & Next Steps

Score each section from 0-${scoringScale} based on quality, completeness, and investment potential. Use the full range of the ${scoringScale}-point scale:
- 0-${Math.floor(scoringScale * 0.2)}: Poor/Missing - Significant issues or missing information
- ${Math.floor(scoringScale * 0.2) + 1}-${Math.floor(scoringScale * 0.4)}: Below Average - Some issues present
- ${Math.floor(scoringScale * 0.4) + 1}-${Math.floor(scoringScale * 0.6)}: Average - Meets basic expectations
- ${Math.floor(scoringScale * 0.6) + 1}-${Math.floor(scoringScale * 0.8)}: Good - Above average quality
- ${Math.floor(scoringScale * 0.8) + 1}-${scoringScale}: Excellent - Outstanding quality and potential

The overall score should reflect the weighted average of all sections, considering the investment potential and business viability.`;
}

function getSlideBySlideAnalysisPrompt(scoringScale: number): string {
  return `Analyze this PDF pitch deck and provide a comprehensive assessment with detailed slide-by-slide notes. You MUST examine each page/slide of the document and provide specific insights for every single slide.

Return your analysis in EXACTLY this JSON format (no extra text before or after):

{
  "overallScore": <number between 0-${scoringScale}>,
  "assessmentPoints": [
    "<key business insight 1>",
    "<key business insight 2>",
    "<key business insight 3>",
    "<key business insight 4>",
    "<key business insight 5>"
  ],
  "sections": [
    {
      "type": "SLIDE_NOTES",
      "title": "Slide by Slide Analysis",
      "score": <number between 0-${scoringScale}>,
      "description": "Comprehensive slide-by-slide analysis of the pitch deck with detailed insights for each page.",
      "strengths": [
        "<overall presentation strength 1>",
        "<overall presentation strength 2>",
        "<overall presentation strength 3>"
      ],
      "weaknesses": [
        "<overall presentation weakness 1>",
        "<overall presentation weakness 2>",
        "<overall presentation weakness 3>"
      ]
    }
  ],
  "slideBySlideNotes": [
    {
      "slideNumber": 1,
      "notes": [
        "<detailed analysis point 1 for slide 1>",
        "<detailed analysis point 2 for slide 1>",
        "<detailed analysis point 3 for slide 1>",
        "<detailed analysis point 4 for slide 1>"
      ]
    },
    {
      "slideNumber": 2,
      "notes": [
        "<detailed analysis point 1 for slide 2>",
        "<detailed analysis point 2 for slide 2>",
        "<detailed analysis point 3 for slide 2>",
        "<detailed analysis point 4 for slide 2>"
      ]
    }
  ]
}

CRITICAL REQUIREMENTS:

1. EXAMINE EVERY PAGE: Count all pages in the PDF and analyze EVERY SINGLE ONE. Include title slides, content slides, appendix slides, etc.

2. SLIDE-BY-SLIDE NOTES REQUIREMENTS:
   - You MUST provide exactly 4 detailed notes for EACH slide in the deck
   - Each note should be 2-3 sentences long with specific observations
   - Include content analysis, design feedback, business insights, and recommendations
   - Reference specific elements visible on each slide (text, charts, images, etc.)
   - Provide both positive observations and constructive criticism
   - Include market context and industry benchmarks where relevant

3. CONTENT ANALYSIS FOR EACH SLIDE:
   - What key message is the slide trying to convey?
   - How effectively does it communicate that message?
   - What specific data, metrics, or claims are presented?
   - Are there any gaps or missing information?
   - How does this slide contribute to the overall narrative?

4. BUSINESS INSIGHTS:
   - Market opportunity assessment based on slide content
   - Competitive positioning analysis
   - Business model validation
   - Team credibility evaluation
   - Financial projections assessment
   - Risk identification and mitigation

The slideBySlideNotes array MUST contain an entry for every slide in the PDF. Count the total pages carefully and ensure you analyze each one.

Score the overall analysis from 0-${scoringScale} based on deck quality, business viability, and investment potential.`;
}

function getEnhancedAnalysisPrompt(): string {
  return `Analyze this PDF document and provide a comprehensive investment assessment. Please return your analysis in the following JSON format:

{
  "overallScore": <number between 1-100>,
  "assessmentPoints": [
    "<key insight 1>",
    "<key insight 2>",
    "<key insight 3>",
    "<key insight 4>",
    "<key insight 5>"
  ],
  "sections": [
    {
      "type": "PROBLEM",
      "title": "Problem Statement",
      "score": <number between 1-100>,
      "description": "<detailed analysis>",
      "strengths": [
        "<detailed strength 1 with market data and specific metrics>",
        "<detailed strength 2 with market data and specific metrics>",
        "<detailed strength 3 with market data and specific metrics>",
        "<detailed strength 4 with market data and specific metrics>",
        "<detailed strength 5 with market data and specific metrics>"
      ],
      "weaknesses": [
        "<detailed weakness 1 with market context and specific concerns>",
        "<detailed weakness 2 with market context and specific concerns>",
        "<detailed weakness 3 with market context and specific concerns>",
        "<detailed weakness 4 with market context and specific concerns>",
        "<detailed weakness 5 with market context and specific concerns>"
      ]
    }
  ]
}

CRITICAL REQUIREMENTS FOR STRENGTHS AND WEAKNESSES:
- Each strength and weakness MUST be 4-5 detailed points
- Each point MUST include specific market data, metrics, or industry benchmarks where applicable
- Include relevant market size figures, growth rates, competitive positioning data
- Reference industry standards, adoption rates, or market trends
- Provide specific numbers, percentages, or comparative data points
- Each point should be substantial and analytical, not just surface-level observations

Please analyze these sections:
1. PROBLEM - Problem Statement
2. MARKET - Market Opportunity  
3. SOLUTION - Solution (Product)
4. COMPETITIVE_LANDSCAPE - Competitive Landscape
5. TRACTION - Traction & Milestones
6. BUSINESS_MODEL - Business Model
7. GTM_STRATEGY - Go-to-Market Strategy
8. TEAM - Founder & Team Background
9. FINANCIALS - Financial Overview & Projections
10. ASK - The Ask & Next Steps

Score each section from 1-100 based on quality, completeness, and investment potential. Ensure all strengths and weaknesses are comprehensive, data-driven, and include relevant market context.`;
}

function getPublicAnalysisPrompt(scoringScale: number): string {
  return `Analyze this PDF document and provide a comprehensive investment assessment. Please return your analysis in the following JSON format:

{
  "overallScore": <number between 0-${scoringScale}>,
  "assessmentPoints": [
    "<key insight 1>",
    "<key insight 2>",
    "<key insight 3>",
    "<key insight 4>",
    "<key insight 5>"
  ],
  "sections": [
    {
      "type": "PROBLEM",
      "title": "Problem Statement",
      "score": <number between 0-${scoringScale}>,
      "description": "<detailed analysis>",
      "strengths": ["<strength 1>", "<strength 2>"],
      "weaknesses": ["<weakness 1>", "<weakness 2>"]
    }
  ]
}

Please analyze these sections:
1. PROBLEM - Problem Statement
2. MARKET - Market Opportunity  
3. SOLUTION - Solution (Product)
4. COMPETITIVE_LANDSCAPE - Competitive Landscape
5. TRACTION - Traction & Milestones
6. BUSINESS_MODEL - Business Model
7. GTM_STRATEGY - Go-to-Market Strategy
8. TEAM - Founder & Team Background
9. FINANCIALS - Financial Overview & Projections
10. ASK - The Ask & Next Steps

Score each section from 0-${scoringScale} based on quality, completeness, and investment potential. Use the full range of the ${scoringScale}-point scale:
- 0-${Math.floor(scoringScale * 0.2)}: Poor/Missing - Significant issues or missing information
- ${Math.floor(scoringScale * 0.2) + 1}-${Math.floor(scoringScale * 0.4)}: Below Average - Some issues present
- ${Math.floor(scoringScale * 0.4) + 1}-${Math.floor(scoringScale * 0.6)}: Average - Meets basic expectations
- ${Math.floor(scoringScale * 0.6) + 1}-${Math.floor(scoringScale * 0.8)}: Good - Above average quality
- ${Math.floor(scoringScale * 0.8) + 1}-${scoringScale}: Excellent - Outstanding quality and potential

The overall score should reflect the weighted average of all sections, considering the investment potential and business viability.`;
}
