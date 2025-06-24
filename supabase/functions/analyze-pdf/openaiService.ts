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
  improvementSuggestions?: string[];
}

export async function analyzeWithOpenAI(pdfBase64: string, apiKey: string, usePublicAnalysisPrompt = false, scoringScale = 100, isIITBombayUser = false): Promise<any> {
  console.log("Starting Gemini analysis with PDF data");
  
  // Choose the appropriate prompt based on the analysis type and user type
  let basePrompt;
  if (usePublicAnalysisPrompt && !isIITBombayUser) {
    // Non-IIT Bombay users get slide-by-slide analysis only
    basePrompt = getSlideBySlideAnalysisPrompt(scoringScale);
    console.log("Using slide-by-slide analysis prompt for non-IIT Bombay user");
  } else if (usePublicAnalysisPrompt) {
    // IIT Bombay users get regular public analysis
    basePrompt = getPublicAnalysisPrompt(scoringScale);
    console.log("Using public analysis prompt for IIT Bombay user");
  } else {
    // Enhanced analysis for internal use - includes both section metrics AND slide-by-slide notes
    basePrompt = getEnhancedAnalysisPrompt(isIITBombayUser);
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

  // Ensure slideBySlideNotes field exists for all analyses
  if (!analysis.slideBySlideNotes) {
    console.warn("No slideBySlideNotes found in analysis result, initializing empty array");
    analysis.slideBySlideNotes = [];
  }
  console.log("Slide by slide notes count:", analysis.slideBySlideNotes?.length || 0);

  // Ensure improvementSuggestions field exists
  if (!analysis.improvementSuggestions) {
    console.warn("No improvementSuggestions found in analysis result, initializing empty array");
    analysis.improvementSuggestions = [];
  }
  console.log("Improvement suggestions count:", analysis.improvementSuggestions?.length || 0);

  console.log("Analysis sections count:", analysis.sections?.length || 0);
  console.log("Overall score:", analysis.overallScore);

  return analysis;
}

function getEnhancedAnalysisPrompt(isIITBombayUser = false): string {
  return `Analyze this PDF pitch deck and provide a comprehensive checklist assessment. You MUST examine each page/slide of the document and provide specific insights for every single slide in a slideBySlideNotes array. Each slide should have exactly 4 detailed notes with specific observations, content analysis, design feedback, business insights, and recommendations.

CRITICAL: You must also extract basic company information including stage (e.g., Pre-seed, Seed, Series A, etc.) and industry/sector from the pitch deck content and include it in your response.

Return your analysis in EXACTLY this JSON format:

{
  "companyInfo": {
    "stage": "<funding stage found in the deck or inferred from context>",
    "industry": "<industry/sector the company operates in>",
    "website": "<company website if mentioned>",
    "description": "<brief company description based on deck content>"
  },
  "sections": [
    {
      "type": "PROBLEM",
      "title": "Problem Statement",
      "description": "<brief description of what was found in this section>"
    },
    {
      "type": "MARKET",
      "title": "Market Opportunity",
      "description": "<brief description of what was found in this section>"
    },
    {
      "type": "SOLUTION",
      "title": "Solution (Product)",
      "description": "<brief description of what was found in this section>"
    },
    {
      "type": "COMPETITIVE_LANDSCAPE",
      "title": "Competitive Landscape",
      "description": "<brief description of what was found in this section>"
    },
    {
      "type": "TRACTION",
      "title": "Traction & Milestones",
      "description": "<brief description of what was found in this section>"
    },
    {
      "type": "BUSINESS_MODEL",
      "title": "Business Model",
      "description": "<brief description of what was found in this section>"
    },
    {
      "type": "GTM_STRATEGY",
      "title": "Go-to-Market Strategy",
      "description": "<brief description of what was found in this section>"
    },
    {
      "type": "TEAM",
      "title": "Founder & Team Background",
      "description": "<brief description of what was found in this section>"
    },
    {
      "type": "FINANCIALS",
      "title": "Financial Overview & Projections",
      "description": "<brief description of what was found in this section>"
    },
    {
      "type": "ASK",
      "title": "The Ask & Next Steps",
      "description": "<brief description of what was found in this section>"
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
  ],
  "improvementSuggestions": [
    "<actionable improvement suggestion 1 with specific implementation guidance>",
    "<actionable improvement suggestion 2 with specific implementation guidance>",
    "<actionable improvement suggestion 3 with specific implementation guidance>",
    "<actionable improvement suggestion 4 with specific implementation guidance>",
    "<actionable improvement suggestion 5 with specific implementation guidance>",
    "<actionable improvement suggestion 6 with specific implementation guidance>",
    "<actionable improvement suggestion 7 with specific implementation guidance>",
    "<actionable improvement suggestion 8 with specific implementation guidance>",
    "<actionable improvement suggestion 9 with specific implementation guidance>",
    "<actionable improvement suggestion 10 with specific implementation guidance>"
  ]
}

COMPANY INFORMATION EXTRACTION:
- Look for funding stage information (Pre-seed, Seed, Series A, B, C, etc.) in slides about funding, the ask, or company milestones
- If no explicit stage is mentioned, infer it from context (team size, revenue, funding amount requested, etc.)
- Identify the industry/sector from the problem statement, solution description, or market analysis
- Extract company website if mentioned anywhere in the deck
- Create a brief description based on the company's solution and value proposition

SECTION CHECKLIST REQUIREMENTS:
- For each section, provide only a brief description of what content was found (if any)
- Focus on identifying whether each section is present and what key information it contains
- Do not provide scores, ratings, strengths, weaknesses, or detailed assessments
- Keep descriptions concise and factual

SLIDE-BY-SLIDE ANALYSIS REQUIREMENTS:
- You MUST provide exactly 4 detailed notes for EACH slide in the deck
- Each note should be 2-3 sentences long with specific observations
- Include content analysis, design feedback, business insights, and recommendations
- Reference specific elements visible on each slide (text, charts, images, etc.)
- Provide both positive observations and constructive criticism
- Include market context and industry benchmarks where relevant

IMPROVEMENT SUGGESTIONS REQUIREMENTS:
- Provide EXACTLY 10 actionable improvement suggestions
- Each suggestion must be specific and implementable
- Focus on critical gaps and areas for enhancement
- MUST include at least 3-4 UI/design-related suggestions such as:
  * "Improve slide layout consistency by standardizing font sizes, heading styles, and content positioning across all slides"
  * "Enhance visual hierarchy by using consistent color coding for different types of information (headers, body text, highlights)"
  * "Redesign charts and graphs with better formatting, clearer legends, proper data labels, and consistent color schemes"
  * "Improve text readability by adjusting font sizes, line spacing, and ensuring adequate contrast between text and background"
  * "Optimize slide spacing and alignment by creating more white space, better margins, and consistent element positioning"
  * "Standardize the design system by using consistent button styles, icon usage, and visual elements throughout"
  * "Enhance slide transitions and flow by improving the logical sequence and visual connections between slides"
  * "Improve mobile and presentation readability by ensuring text is large enough and images are properly sized"
- Also include content-related suggestions like:
  * "Add a Market Sizing slide using TAM/SAM/SOM format with specific market data"
  * "Include a competitive analysis matrix showing direct and indirect competitors"
  * "Add customer testimonials or case studies to strengthen traction evidence"
  * "Create a detailed financial model showing unit economics and path to profitability"
  * "Include team member profiles with relevant experience and achievements"
  * "Add a product roadmap showing future development milestones"
- Each suggestion should include WHY it's important and HOW to implement it
- Consider industry best practices and investor expectations
- Balance content improvements with UI/design enhancements (aim for 40% UI/design, 60% content)

Count all pages in the PDF and analyze EVERY SINGLE ONE. Include title slides, content slides, appendix slides, etc. The slideBySlideNotes array MUST contain an entry for every slide in the PDF.

Only include sections in the checklist if they are actually present in the pitch deck. Provide a brief, factual description of what content was found for each section that exists.`;
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
