
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
    description: string;
  }>;
  companyInfo?: {
    stage: string;
    industry: string;
    website: string;
    description: string;
  };
}

export async function analyzeWithOpenAI(
  pdfBase64: string, 
  apiKey: string, 
  usePublicAnalysisPrompt = false, 
  scoringScale = 100, 
  isIITBombayUser = false,
  isVCAnalysis = false
): Promise<any> {
  console.log("Starting Gemini VC analysis with PDF data");
  
  // Use VC-specific prompt
  const vcPrompt = getVCAnalysisPrompt();
  console.log("Using VC analysis prompt");
  
  const payload = {
    contents: [
      {
        parts: [
          {
            text: vcPrompt
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

  console.log("Sending request to Gemini API for VC analysis");
  
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
  console.log("Received response from Gemini API for VC analysis");

  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    throw new Error("Invalid response structure from Gemini API");
  }

  const rawResponse = data.candidates[0].content.parts[0].text;
  console.log("Raw Gemini VC response length:", rawResponse.length);

  // Extract JSON from the response
  const jsonMatch = rawResponse.match(/```json\n?(.*?)\n?```/s);
  if (!jsonMatch) {
    throw new Error("No JSON found in Gemini VC response");
  }

  const jsonText = jsonMatch[1];
  console.log("Extracted VC JSON text length:", jsonText.length);

  let analysis;
  try {
    analysis = JSON.parse(jsonText);
    console.log("Successfully parsed VC analysis result");
  } catch (error) {
    console.error("Error parsing VC JSON:", error);
    throw new Error(`Failed to parse JSON response: ${error.message}`);
  }

  // Validate scores for VC analysis (1-100 range)
  if (analysis.overallScore < 1 || analysis.overallScore > 100) {
    console.warn(`Overall score ${analysis.overallScore} out of range, clamping to 1-100`);
    analysis.overallScore = Math.max(1, Math.min(100, analysis.overallScore));
  }
  
  // Validate section scores
  if (analysis.sections) {
    analysis.sections.forEach((section: any) => {
      if (section.score < 1 || section.score > 100) {
        console.warn(`Section score ${section.score} out of range, clamping to 1-100`);
        section.score = Math.max(1, Math.min(100, section.score));
      }
    });
  }

  console.log("VC Analysis sections count:", analysis.sections?.length || 0);
  console.log("VC Overall score:", analysis.overallScore);

  return analysis;
}

function getVCAnalysisPrompt(): string {
  return `Analyze this PDF pitch deck and provide a comprehensive investment assessment from a venture capital perspective. Please return your analysis in the following JSON format:

{
  "overallScore": <number between 1-100>,
  "assessmentPoints": [
    "<comprehensive assessment point 1 with specific data/numbers>",
    "<comprehensive assessment point 2 with specific data/numbers>",
    "<comprehensive assessment point 3 with specific data/numbers>",
    "<comprehensive assessment point 4 with specific data/numbers>",
    "<comprehensive assessment point 5 with specific data/numbers>",
    "<comprehensive assessment point 6 with specific data/numbers>",
    "<comprehensive assessment point 7 with specific data/numbers>",
    "<comprehensive assessment point 8 with specific data/numbers>"
  ],
  "sections": [
    {
      "type": "PROBLEM",
      "title": "Problem Statement",
      "score": <number between 1-100>,
      "description": "<detailed analysis>",
      "strengths": ["<strength 1>", "<strength 2>"],
      "weaknesses": ["<weakness 1>", "<weakness 2>"]
    }
  ]
}

CRITICAL: The assessmentPoints array must contain exactly 7-8 comprehensive bullet points that include:
- Specific market size data, growth rates, and TAM/SAM numbers from the deck
- Financial metrics, revenue figures, projections, and unit economics mentioned
- Traction metrics including user numbers, growth rates, customer acquisition costs
- Competitive positioning with market share data and differentiation factors
- Team background with specific credentials, experience, and track record
- Business model viability with revenue streams and scalability potential
- Investment opportunity assessment including funding requirements and use of funds
- Risk factors and mitigation strategies with specific market or execution risks

Each assessment point should be substantive (2-3 sentences) and include specific numbers, percentages, or quantifiable data wherever possible from the pitch deck.

Please analyze these sections:
1. PROBLEM - Problem Statement & Market Need
2. MARKET - Market Opportunity & Size  
3. SOLUTION - Solution & Product Overview
4. COMPETITIVE_LANDSCAPE - Competitive Analysis & Positioning
5. TRACTION - Traction, Metrics & Milestones
6. BUSINESS_MODEL - Business Model & Revenue Streams
7. GTM_STRATEGY - Go-to-Market Strategy & Sales
8. TEAM - Founder & Team Background
9. FINANCIALS - Financial Overview & Projections
10. ASK - Investment Ask & Use of Funds

Score each section from 1-100 based on investment attractiveness:
- 1-20: Poor - Significant red flags or missing critical information
- 21-40: Below Average - Major concerns that impact investability
- 41-60: Average - Meets basic investment criteria with some concerns
- 61-80: Good - Strong investment potential with minor issues
- 81-100: Excellent - Outstanding investment opportunity

The overall score should reflect the comprehensive investment potential considering market opportunity, execution capability, scalability, and risk-adjusted returns.`;
}
