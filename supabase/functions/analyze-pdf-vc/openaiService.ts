
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
  "companyInfo": {
    "stage": "<extract funding stage from pitch deck content - look for mentions like 'seed', 'series A', 'pre-seed', 'growth stage', etc.>",
    "industry": "<extract industry/sector from pitch deck content - look for business domain, market category, technology sector>",
    "website": "<extract website URL if mentioned in the deck>",
    "description": "<create a comprehensive 3-4 sentence description of what the company does based on the pitch content, their value proposition, and target market>"
  },
  "sections": [
    {
      "type": "PROBLEM",
      "title": "Problem Statement",
      "score": <number between 1-100>,
      "description": "<detailed analysis>",
      "strengths": [
        "<detailed strength 1 with specific market data, numbers, percentages, or quantified insights from the deck - minimum 2 sentences with concrete examples and supporting evidence>", 
        "<detailed strength 2 with specific market data, numbers, percentages, or quantified insights from the deck - minimum 2 sentences with concrete examples and supporting evidence>", 
        "<detailed strength 3 with specific market data, numbers, percentages, or quantified insights from the deck - minimum 2 sentences with concrete examples and supporting evidence>",
        "<detailed strength 4 with specific market data, numbers, percentages, or quantified insights from the deck - minimum 2 sentences with concrete examples and supporting evidence>"
      ],
      "weaknesses": [
        "<detailed market-based challenge 1 with specific industry data, statistics, and quantified market conditions - minimum 2 sentences explaining the challenge with concrete market research, economic indicators, or sector-specific data>", 
        "<detailed market-based challenge 2 with specific industry data, statistics, and quantified market conditions - minimum 2 sentences explaining the challenge with concrete market research, economic indicators, or sector-specific data>", 
        "<detailed market-based challenge 3 with specific industry data, statistics, and quantified market conditions - minimum 2 sentences explaining the challenge with concrete market research, economic indicators, or sector-specific data>",
        "<detailed market-based challenge 4 with specific industry data, statistics, and quantified market conditions - minimum 2 sentences explaining the challenge with concrete market research, economic indicators, or sector-specific data>"
      ]
    },
    {
      "type": "MARKET",
      "title": "Market Opportunity & Size",
      "score": <number between 1-100>,
      "description": "<detailed analysis>",
      "strengths": [
        "<detailed strength 1 with specific market data, TAM/SAM figures, growth rates, market trends, and quantified opportunities from the deck - minimum 2 sentences with concrete market size data and growth projections>", 
        "<detailed strength 2 with specific market data, TAM/SAM figures, growth rates, market trends, and quantified opportunities from the deck - minimum 2 sentences with concrete market size data and growth projections>", 
        "<detailed strength 3 with specific market data, TAM/SAM figures, growth rates, market trends, and quantified opportunities from the deck - minimum 2 sentences with concrete market size data and growth projections>",
        "<detailed strength 4 with specific market data, TAM/SAM figures, growth rates, market trends, and quantified opportunities from the deck - minimum 2 sentences with concrete market size data and growth projections>"
      ],
      "weaknesses": [
        "<detailed market-based challenge 1 with specific market saturation data, competitive density metrics, and market contraction statistics - minimum 2 sentences with quantified market challenges and sector-specific headwinds>", 
        "<detailed market-based challenge 2 with specific market saturation data, competitive density metrics, and market contraction statistics - minimum 2 sentences with quantified market challenges and sector-specific headwinds>", 
        "<detailed market-based challenge 3 with specific market saturation data, competitive density metrics, and market contraction statistics - minimum 2 sentences with quantified market challenges and sector-specific headwinds>",
        "<detailed market-based challenge 4 with specific market saturation data, competitive density metrics, and market contraction statistics - minimum 2 sentences with quantified market challenges and sector-specific headwinds>"
      ]
    },
    {
      "type": "SOLUTION",
      "title": "Solution & Product Overview",
      "score": <number between 1-100>,
      "description": "<detailed analysis>",
      "strengths": [
        "<detailed strength 1 with specific product features, technical capabilities, user benefits, and competitive advantages mentioned in the deck - minimum 2 sentences with concrete product specifications and differentiation factors>", 
        "<detailed strength 2 with specific product features, technical capabilities, user benefits, and competitive advantages mentioned in the deck - minimum 2 sentences with concrete product specifications and differentiation factors>", 
        "<detailed strength 3 with specific product features, technical capabilities, user benefits, and competitive advantages mentioned in the deck - minimum 2 sentences with concrete product specifications and differentiation factors>",
        "<detailed strength 4 with specific product features, technical capabilities, user benefits, and competitive advantages mentioned in the deck - minimum 2 sentences with concrete product specifications and differentiation factors>"
      ],
      "weaknesses": [
        "<detailed market-based challenge 1 with specific technology adoption barriers, industry implementation costs, and market readiness data - minimum 2 sentences with quantified adoption challenges and market friction points>", 
        "<detailed market-based challenge 2 with specific technology adoption barriers, industry implementation costs, and market readiness data - minimum 2 sentences with quantified adoption challenges and market friction points>", 
        "<detailed market-based challenge 3 with specific technology adoption barriers, industry implementation costs, and market readiness data - minimum 2 sentences with quantified adoption challenges and market friction points>",
        "<detailed market-based challenge 4 with specific technology adoption barriers, industry implementation costs, and market readiness data - minimum 2 sentences with quantified adoption challenges and market friction points>"
      ]
    },
    {
      "type": "COMPETITIVE_LANDSCAPE",
      "title": "Competitive Analysis & Positioning",
      "score": <number between 1-100>,
      "description": "<detailed analysis>",
      "strengths": [
        "<detailed strength 1 with specific competitive advantages, market positioning data, differentiation metrics, and competitive moats from the deck - minimum 2 sentences with concrete competitive analysis and market share insights>", 
        "<detailed strength 2 with specific competitive advantages, market positioning data, differentiation metrics, and competitive moats from the deck - minimum 2 sentences with concrete competitive analysis and market share insights>", 
        "<detailed strength 3 with specific competitive advantages, market positioning data, differentiation metrics, and competitive moats from the deck - minimum 2 sentences with concrete competitive analysis and market share insights>",
        "<detailed strength 4 with specific competitive advantages, market positioning data, differentiation metrics, and competitive moats from the deck - minimum 2 sentences with concrete competitive analysis and market share insights>"
      ],
      "weaknesses": [
        "<detailed market-based challenge 1 with specific competitive pressure data, market consolidation trends, and competitor funding statistics - minimum 2 sentences with quantified competitive threats and market dynamics>", 
        "<detailed market-based challenge 2 with specific competitive pressure data, market consolidation trends, and competitor funding statistics - minimum 2 sentences with quantified competitive threats and market dynamics>", 
        "<detailed market-based challenge 3 with specific competitive pressure data, market consolidation trends, and competitor funding statistics - minimum 2 sentences with quantified competitive threats and market dynamics>",
        "<detailed market-based challenge 4 with specific competitive pressure data, market consolidation trends, and competitor funding statistics - minimum 2 sentences with quantified competitive threats and market dynamics>"
      ]
    },
    {
      "type": "TRACTION",
      "title": "Traction, Metrics & Milestones",
      "score": <number between 1-100>,
      "description": "<detailed analysis>",
      "strengths": [
        "<detailed strength 1 with specific traction metrics, user growth data, revenue figures, customer acquisition numbers, and milestone achievements from the deck - minimum 2 sentences with concrete performance metrics and growth trajectories>", 
        "<detailed strength 2 with specific traction metrics, user growth data, revenue figures, customer acquisition numbers, and milestone achievements from the deck - minimum 2 sentences with concrete performance metrics and growth trajectories>", 
        "<detailed strength 3 with specific traction metrics, user growth data, revenue figures, customer acquisition numbers, and milestone achievements from the deck - minimum 2 sentences with concrete performance metrics and growth trajectories>",
        "<detailed strength 4 with specific traction metrics, user growth data, revenue figures, customer acquisition numbers, and milestone achievements from the deck - minimum 2 sentences with concrete performance metrics and growth trajectories>"
      ],
      "weaknesses": [
        "<detailed market-based challenge 1 with specific customer acquisition cost trends, market churn rates, and industry benchmark comparisons - minimum 2 sentences with quantified traction challenges and market performance standards>", 
        "<detailed market-based challenge 2 with specific customer acquisition cost trends, market churn rates, and industry benchmark comparisons - minimum 2 sentences with quantified traction challenges and market performance standards>", 
        "<detailed market-based challenge 3 with specific customer acquisition cost trends, market churn rates, and industry benchmark comparisons - minimum 2 sentences with quantified traction challenges and market performance standards>",
        "<detailed market-based challenge 4 with specific customer acquisition cost trends, market churn rates, and industry benchmark comparisons - minimum 2 sentences with quantified traction challenges and market performance standards>"
      ]
    },
    {
      "type": "BUSINESS_MODEL",
      "title": "Business Model & Revenue Streams",
      "score": <number between 1-100>,
      "description": "<detailed analysis>",
      "strengths": [
        "<detailed strength 1 with specific revenue model data, pricing strategy, unit economics, profit margins, and scalability metrics from the deck - minimum 2 sentences with concrete financial model analysis and revenue potential>", 
        "<detailed strength 2 with specific revenue model data, pricing strategy, unit economics, profit margins, and scalability metrics from the deck - minimum 2 sentences with concrete financial model analysis and revenue potential>", 
        "<detailed strength 3 with specific revenue model data, pricing strategy, unit economics, profit margins, and scalability metrics from the deck - minimum 2 sentences with concrete financial model analysis and revenue potential>",
        "<detailed strength 4 with specific revenue model data, pricing strategy, unit economics, profit margins, and scalability metrics from the deck - minimum 2 sentences with concrete financial model analysis and revenue potential>"
      ],
      "weaknesses": [
        "<detailed market-based challenge 1 with specific pricing pressure data, market commoditization trends, and revenue model sustainability concerns - minimum 2 sentences with quantified business model risks and market economics>", 
        "<detailed market-based challenge 2 with specific pricing pressure data, market commoditization trends, and revenue model sustainability concerns - minimum 2 sentences with quantified business model risks and market economics>", 
        "<detailed market-based challenge 3 with specific pricing pressure data, market commoditization trends, and revenue model sustainability concerns - minimum 2 sentences with quantified business model risks and market economics>",
        "<detailed market-based challenge 4 with specific pricing pressure data, market commoditization trends, and revenue model sustainability concerns - minimum 2 sentences with quantified business model risks and market economics>"
      ]
    },
    {
      "type": "GTM_STRATEGY",
      "title": "Go-to-Market Strategy & Sales",
      "score": <number between 1-100>,
      "description": "<detailed analysis>",
      "strengths": [
        "<detailed strength 1 with specific go-to-market approach, sales strategy, channel partnerships, customer acquisition methods, and market penetration plans from the deck - minimum 2 sentences with concrete GTM execution details and market access strategies>", 
        "<detailed strength 2 with specific go-to-market approach, sales strategy, channel partnerships, customer acquisition methods, and market penetration plans from the deck - minimum 2 sentences with concrete GTM execution details and market access strategies>", 
        "<detailed strength 3 with specific go-to-market approach, sales strategy, channel partnerships, customer acquisition methods, and market penetration plans from the deck - minimum 2 sentences with concrete GTM execution details and market access strategies>",
        "<detailed strength 4 with specific go-to-market approach, sales strategy, channel partnerships, customer acquisition methods, and market penetration plans from the deck - minimum 2 sentences with concrete GTM execution details and market access strategies>"
      ],
      "weaknesses": [
        "<detailed market-based challenge 1 with specific customer acquisition cost inflation, sales cycle extension trends, and market access barriers - minimum 2 sentences with quantified GTM challenges and market penetration difficulties>", 
        "<detailed market-based challenge 2 with specific customer acquisition cost inflation, sales cycle extension trends, and market access barriers - minimum 2 sentences with quantified GTM challenges and market penetration difficulties>", 
        "<detailed market-based challenge 3 with specific customer acquisition cost inflation, sales cycle extension trends, and market access barriers - minimum 2 sentences with quantified GTM challenges and market penetration difficulties>",
        "<detailed market-based challenge 4 with specific customer acquisition cost inflation, sales cycle extension trends, and market access barriers - minimum 2 sentences with quantified GTM challenges and market penetration difficulties>"
      ]
    },
    {
      "type": "TEAM",
      "title": "Founder & Team Background",
      "score": <number between 1-100>,
      "description": "<detailed analysis>",
      "strengths": [
        "<detailed strength 1 with specific founder credentials, team experience, domain expertise, track record, and relevant accomplishments from the deck - minimum 2 sentences with concrete team qualifications and leadership capabilities>", 
        "<detailed strength 2 with specific founder credentials, team experience, domain expertise, track record, and relevant accomplishments from the deck - minimum 2 sentences with concrete team qualifications and leadership capabilities>", 
        "<detailed strength 3 with specific founder credentials, team experience, domain expertise, track record, and relevant accomplishments from the deck - minimum 2 sentences with concrete team qualifications and leadership capabilities>",
        "<detailed strength 4 with specific founder credentials, team experience, domain expertise, track record, and relevant accomplishments from the deck - minimum 2 sentences with concrete team qualifications and leadership capabilities>"
      ],
      "weaknesses": [
        "<detailed market-based challenge 1 with specific talent shortage data, skill gap analysis, and hiring market conditions in the industry - minimum 2 sentences with quantified talent acquisition challenges and competitive hiring pressures>", 
        "<detailed market-based challenge 2 with specific talent shortage data, skill gap analysis, and hiring market conditions in the industry - minimum 2 sentences with quantified talent acquisition challenges and competitive hiring pressures>", 
        "<detailed market-based challenge 3 with specific talent shortage data, skill gap analysis, and hiring market conditions in the industry - minimum 2 sentences with quantified talent acquisition challenges and competitive hiring pressures>",
        "<detailed market-based challenge 4 with specific talent shortage data, skill gap analysis, and hiring market conditions in the industry - minimum 2 sentences with quantified talent acquisition challenges and competitive hiring pressures>"
      ]
    },
    {
      "type": "FINANCIALS",
      "title": "Financial Overview & Projections",
      "score": <number between 1-100>,
      "description": "<detailed analysis>",
      "strengths": [
        "<detailed strength 1 with specific financial metrics, revenue projections, cost structure, burn rate, runway data, and profitability timeline from the deck - minimum 2 sentences with concrete financial performance indicators and growth trajectories>", 
        "<detailed strength 2 with specific financial metrics, revenue projections, cost structure, burn rate, runway data, and profitability timeline from the deck - minimum 2 sentences with concrete financial performance indicators and growth trajectories>", 
        "<detailed strength 3 with specific financial metrics, revenue projections, cost structure, burn rate, runway data, and profitability timeline from the deck - minimum 2 sentences with concrete financial performance indicators and growth trajectories>",
        "<detailed strength 4 with specific financial metrics, revenue projections, cost structure, burn rate, runway data, and profitability timeline from the deck - minimum 2 sentences with concrete financial performance indicators and growth trajectories>"
      ],
      "weaknesses": [
        "<detailed market-based challenge 1 with specific economic headwinds, interest rate impacts, inflation effects, and capital market conditions affecting the business - minimum 2 sentences with quantified financial market challenges and economic pressures>", 
        "<detailed market-based challenge 2 with specific economic headwinds, interest rate impacts, inflation effects, and capital market conditions affecting the business - minimum 2 sentences with quantified financial market challenges and economic pressures>", 
        "<detailed market-based challenge 3 with specific economic headwinds, interest rate impacts, inflation effects, and capital market conditions affecting the business - minimum 2 sentences with quantified financial market challenges and economic pressures>",
        "<detailed market-based challenge 4 with specific economic headwinds, interest rate impacts, inflation effects, and capital market conditions affecting the business - minimum 2 sentences with quantified financial market challenges and economic pressures>"
      ]
    },
    {
      "type": "ASK",
      "title": "Investment Ask & Use of Funds",
      "score": <number between 1-100>,
      "description": "<detailed analysis>",
      "strengths": [
        "<detailed strength 1 with specific funding requirements, use of funds allocation, milestone achievements planned, and investment rationale from the deck - minimum 2 sentences with concrete capital deployment strategy and expected returns>", 
        "<detailed strength 2 with specific funding requirements, use of funds allocation, milestone achievements planned, and investment rationale from the deck - minimum 2 sentences with concrete capital deployment strategy and expected returns>", 
        "<detailed strength 3 with specific funding requirements, use of funds allocation, milestone achievements planned, and investment rationale from the deck - minimum 2 sentences with concrete capital deployment strategy and expected returns>",
        "<detailed strength 4 with specific funding requirements, use of funds allocation, milestone achievements planned, and investment rationale from the deck - minimum 2 sentences with concrete capital deployment strategy and expected returns>"
      ],
      "weaknesses": [
        "<detailed market-based challenge 1 with specific funding market conditions, valuation compression data, and investor sentiment trends - minimum 2 sentences with quantified investment climate challenges and capital availability constraints>", 
        "<detailed market-based challenge 2 with specific funding market conditions, valuation compression data, and investor sentiment trends - minimum 2 sentences with quantified investment climate challenges and capital availability constraints>", 
        "<detailed market-based challenge 3 with specific funding market conditions, valuation compression data, and investor sentiment trends - minimum 2 sentences with quantified investment climate challenges and capital availability constraints>",
        "<detailed market-based challenge 4 with specific funding market conditions, valuation compression data, and investor sentiment trends - minimum 2 sentences with quantified investment climate challenges and capital availability constraints>"
      ]
    }
  ]
}

CRITICAL REQUIREMENTS:

1. COMPANY INFORMATION EXTRACTION: You MUST extract and include company information from the pitch deck content:
   - Stage: Look for funding stage mentions (seed, pre-seed, series A/B/C, growth, bootstrap, etc.)
   - Industry: Identify the business sector/domain (fintech, healthcare, edtech, saas, marketplace, etc.)
   - Website: Extract any website URLs mentioned in the deck
   - Description: Create a comprehensive description of what the company does, their value proposition, target market, and key differentiators based on the pitch content

2. MANDATORY SECTION STRUCTURE: You MUST provide analysis for ALL 10 sections listed above. Each section MUST have exactly the structure shown with all required fields.

3. DETAILED STRENGTHS & WEAKNESSES REQUIREMENT: Every single section MUST have exactly 4 detailed strengths and exactly 4 detailed weaknesses. Each point MUST be:
   - MINIMUM 2 sentences long with detailed explanations
   - Include specific data, numbers, percentages, or quantifiable insights
   - For strengths: Focus on concrete advantages, metrics, and competitive positioning from the pitch deck
   - For weaknesses: Focus EXCLUSIVELY on external market conditions, industry challenges, and sector-specific headwinds with quantified data

4. ASSESSMENT POINTS: Must contain exactly 7-8 comprehensive detailed bullet points that include:
   - Specific market size data, growth rates, and TAM/SAM numbers from the deck
   - Financial metrics, revenue figures, projections, and unit economics mentioned
   - Traction metrics including user numbers, growth rates, customer acquisition costs
   - Competitive positioning with market share data and differentiation factors
   - Team background with specific credentials, experience, and track record
   - Business model viability with revenue streams and scalability potential
   - Investment opportunity assessment including funding requirements and use of funds
   - Risk factors and mitigation strategies with specific market or execution risks

   Each assessment point should be substantive (2-3 sentences) and include specific numbers, percentages, or quantifiable data wherever possible from the pitch deck.

5. DETAILED SECTION STRENGTHS & WEAKNESSES REQUIREMENTS:

   STRENGTHS MUST BE DETAILED AND INCLUDE:
   - Minimum 2 sentences per strength with comprehensive explanations
   - Specific market data, numbers, percentages, or metrics from the deck
   - Industry benchmarks or comparative data when available
   - Quantifiable insights (revenue figures, growth rates, market share, user metrics, etc.)
   - Financial projections, unit economics, or cost structures mentioned
   - Competitive analysis data and positioning metrics

   WEAKNESSES MUST FOCUS EXCLUSIVELY ON EXTERNAL MARKET CONDITIONS WITH DETAILED ANALYSIS:
   - Minimum 2 sentences per weakness with comprehensive market-based explanations
   - Market saturation data and competitive intensity metrics with specific percentages
   - Economic headwinds or market contraction data affecting the target industry
   - Regulatory challenges or compliance costs with quantified financial impacts
   - Market adoption barriers supported by industry research and data points
   - Customer acquisition challenges based on market dynamics and sector benchmarks
   - Pricing pressure from market conditions with actual cost/revenue impact data
   - Supply chain or operational cost pressures with quantified industry-wide impacts
   - Market timing risks supported by industry trend data and forecasts
   - Sector-specific challenges backed by market research and industry reports

   FORBIDDEN IN WEAKNESSES:
   - Do NOT mention what's missing from the deck or presentation
   - Do NOT suggest what could be improved in the pitch
   - Do NOT mention lack of information or data in the deck
   - Do NOT reference presentation quality or structure
   - Do NOT mention what should be added or clarified
   - Do NOT discuss gaps in the pitch deck content

   REQUIRED FORMAT FOR DETAILED WEAKNESSES:
   Each weakness must be minimum 2 sentences and start with market data. Examples:
   - "Industry reports indicate that 67% of startups in this sector experience significant market saturation challenges, with customer acquisition costs rising 45% year-over-year across the industry. This trend is particularly pronounced in the target demographic, where competition for user attention has intensified due to 23 major players entering the market in the past 18 months."
   - "Market research shows a 78% decline in venture funding for EdTech companies in Q3 2024, creating capital constraints with average deal sizes dropping from $4.2M to $1.8M. Economic forecasts suggest this funding winter may persist through 2025, as institutional investors have reduced their education technology allocations by 34% amid concerns about market oversaturation."

6. NEVER SKIP SECTIONS: You must analyze all 10 sections even if some information is not present in the pitch deck. If a section is not well-covered in the deck, still provide the analysis based on industry standards and market context.

Score each section from 1-100 based on investment attractiveness:
- 1-20: Poor - Significant red flags or missing critical information
- 21-40: Below Average - Major concerns that impact investability
- 41-60: Average - Meets basic investment criteria with some concerns
- 61-80: Good - Strong investment potential with minor issues
- 81-100: Excellent - Outstanding investment opportunity

The overall score should reflect the comprehensive investment potential considering market opportunity, execution capability, scalability, and risk-adjusted returns.

MANDATORY: Every strength and weakness MUST be detailed (minimum 2 sentences), include specific quantifiable data, and provide comprehensive analysis. This is non-negotiable for generating high-quality investment assessments.`;
}
