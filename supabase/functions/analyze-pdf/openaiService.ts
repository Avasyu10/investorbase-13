export async function analyzeWithOpenAI(pdfBase64, apiKey, usePublicAnalysisPrompt = false, scoringScale = 100, isIITBombayUser = false) {
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
      temperature: 0.2,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192
    }
  };
  console.log("Sending request to Gemini API");
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
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
      analysis.sections.forEach((section)=>{
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
  // Log extracted company info for debugging
  if (analysis.companyInfo) {
    console.log("Extracted company info:", analysis.companyInfo);
  }
  console.log("Analysis sections count:", analysis.sections?.length || 0);
  console.log("Overall score:", analysis.overallScore);
  return analysis;
}

function getEnhancedAnalysisPrompt(isIITBombayUser = false) {
  return `Analyze this PDF pitch deck and provide a comprehensive checklist assessment with company information extraction. You MUST examine each page/slide of the document and provide specific insights for every single slide in a slideBySlideNotes array. Each slide should have exactly 4 detailed notes with specific observations, content analysis, design feedback, business insights, and recommendations.

CRITICAL: Extract company information from the pitch deck content and include it in the response.

Return your analysis in EXACTLY this JSON format:

{
  "companyInfo": {
    "stage": "<extract funding stage from pitch deck content - look for mentions like 'seed', 'series A', 'pre-seed', 'growth stage', etc.>",
    "industry": "<extract industry/sector from pitch deck content - look for business domain, market category, technology sector>",
    "website": "<extract website URL if mentioned in the deck>",
    "description": "<create a concise 2-3 sentence description of what the company does based on the pitch content>"
  },
  "sections": [
    {
      "type": "PROBLEM",
      "title": "Problem Statement",
      "description": "<brief description of what was found in this section with 4-5 detailed points with market data and numbers>",
      "status": "<one of: 'Addressed', 'Needs Improvement', 'Not Addressed'>"
    },
    {
      "type": "MARKET",
      "title": "Market Opportunity",
      "description": "<brief description of what was found in this section with 4-5 detailed points with market data and numbers>",
      "status": "<one of: 'Addressed', 'Needs Improvement', 'Not Addressed'>"
    },
    {
      "type": "SOLUTION",
      "title": "Solution (Product)",
      "description": "<brief description of what was found in this section with 4-5 detailed points with market data and numbers>",
      "status": "<one of: 'Addressed', 'Needs Improvement', 'Not Addressed'>"
    },
    {
      "type": "COMPETITIVE_LANDSCAPE",
      "title": "Competitive Landscape",
      "description": "<brief description of what was found in this section with 4-5 detailed points with market data and numbers>",
      "status": "<one of: 'Addressed', 'Needs Improvement', 'Not Addressed'>"
    },
    {
      "type": "TRACTION",
      "title": "Traction & Milestones",
      "description": "<brief description of what was found in this section with 4-5 detailed points with market data and numbers>",
      "status": "<one of: 'Addressed', 'Needs Improvement', 'Not Addressed'>"
    },
    {
      "type": "BUSINESS_MODEL",
      "title": "Business Model",
      "description": "<brief description of what was found in this section with 4-5 detailed points with market data and numbers>",
      "status": "<one of: 'Addressed', 'Needs Improvement', 'Not Addressed'>"
    },
    {
      "type": "GTM_STRATEGY",
      "title": "Go-to-Market Strategy",
      "description": "<brief description of what was found in this section with 4-5 detailed points with market data and numbers>",
      "status": "<one of: 'Addressed', 'Needs Improvement', 'Not Addressed'>"
    },
    {
      "type": "TEAM",
      "title": "Founder & Team Background",
      "description": "<brief description of what was found in this section with 4-5 detailed points with market data and numbers>",
      "status": "<one of: 'Addressed', 'Needs Improvement', 'Not Addressed'>"
    },
    {
      "type": "FINANCIALS",
      "title": "Financial Overview & Projections",
      "description": "<brief description of what was found in this section with 4-5 detailed points with market data and numbers>",
      "status": "<one of: 'Addressed', 'Needs Improvement', 'Not Addressed'>"
    },
    {
      "type": "ASK",
      "title": "The Ask & Next Steps",
      "description": "<brief description of what was found in this section with 4-5 detailed points with market data and numbers>",
      "status": "<one of: 'Addressed', 'Needs Improvement', 'Not Addressed'>"
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
"<actionable improvement suggestion 10 with specific implementation guidance>",
"<actionable improvement suggestion 11 with specific implementation guidance>",
"<actionable improvement suggestion 12 with specific implementation guidance>",
"<actionable improvement suggestion 13 with specific implementation guidance>",
"<actionable improvement suggestion 14 with specific implementation guidance>",
"<actionable improvement suggestion 15 with specific implementation guidance>"
]
}

**Important**: IN SECTIONS, in the description of each section make sure to give 4-5 detailed points including market data and numbers and also don't mention words pitch deck or deck as it is about the company and deck is just for extracting info about company.

COMPANY INFORMATION EXTRACTION REQUIREMENTS:
- Stage: Look for funding stage mentions (seed, pre-seed, series A/B/C, growth, bootstrap, etc.)
- Industry: Identify the business sector/domain (fintech, healthcare, edtech, saas, marketplace, etc.)
- Website: Extract any website URLs mentioned in the deck
- Description: Create a brief company description based on the pitch content

SECTION CHECKLIST REQUIREMENTS:
- For each section, provide a brief description of what content was found (if any)
- **CRITICAL**: Assign a status based on the quality and completeness of the section:
  * "Addressed": Section is well-covered with comprehensive information, data, and clear explanations
  * "Needs Improvement": Section is present but lacks depth, specific data, or has gaps in information
  * "Not Addressed": Section is completely missing or has minimal/irrelevant content
- Focus on identifying whether each section is present and what key information it contains
- Keep descriptions concise and factual

SLIDE-BY-SLIDE ANALYSIS REQUIREMENTS:
- You MUST provide exactly 4 detailed notes for EACH slide in the deck
- Each note should be 2-3 sentences long with specific observations
- Include content analysis, design feedback, business insights, and recommendations
- Reference specific elements visible on each slide (text, charts, images, etc.)
- Provide both positive observations and constructive criticism
- Include market context and industry benchmarks where relevant

IMPROVEMENT SUGGESTIONS REQUIREMENTS:
- Provide EXACTLY 15 actionable improvement suggestions.
- Each suggestion must be specific and implementable, clearly stating the 'WHY' (importance) and 'HOW' (implementation guidance).
- MUST include at least 5 UI/Design-specific suggestions. Examples:
    * "Improve slide layout consistency and visual hierarchy by using uniform header styles, consistent font sizing, and deliberate spacing between content elements (e.g., increased line height, margin-bottom on paragraphs) to enhance readability and professional appearance."
    * "Enhance chart and graph readability by ensuring clear labels, proper legends, distinct data point markers, and a consistent, high-contrast color scheme throughout all visualizations, enabling rapid data interpretation for investors."
    * "Reduce visual clutter and improve scannability by strategically increasing white space around text blocks and images, refining text alignment (e.g., left-aligned body text), and transforming dense paragraphs into concise, impactful bullet points where appropriate."
    * "Standardize typography across the entire presentation by selecting a maximum of two complementary fonts, applying consistent font sizes for headings and body text, and maintaining a unified color palette to reinforce brand identity and visual coherence."
    * "Optimize image and graphic quality by ensuring all visual assets are high-resolution, relevant to the content, and professionally integrated (e.g., proper cropping, consistent styling), avoiding pixelation or generic stock photos that detract from credibility."
    * "Incorporate compelling product visuals, such as high-fidelity screenshots, intuitive mockups, or brief animated GIFs (if web-based), to visually demonstrate the solution's functionality and user experience more effectively than text descriptions alone."
    * "Ensure a clean, uncluttered overall design aesthetic by minimizing excessive borders, unnecessary icons, or overly complex backgrounds, allowing the core content to stand out."
- Content improvement suggestions should cover key business areas. Examples:
    * **(Conditional: ONLY if Market Sizing is absent or lacks depth)** "Add a dedicated Market Sizing slide that clearly outlines the Total Addressable Market (TAM), Serviceable Available Market (SAM), and Serviceable Obtainable Market (SOM, or target market share), backed by recent data from credible industry reports, to provide investors with a precise understanding of the market scale and the company's growth potential."
    * **(Conditional: ONLY if Competitive Analysis is absent or superficial)** "Include a comprehensive competitive analysis slide, ideally structured as a matrix or quadrant, that identifies both direct and indirect competitors, highlights key differentiators (e.g., features, pricing, unique technology), and clearly articulates the company's sustainable competitive advantages to demonstrate market awareness and strategic positioning."
    * **(Conditional: ONLY if Traction/Social Proof is absent or weak)** "Integrate stronger evidence of traction by including customer testimonials, verifiable case studies showcasing user success and impact, or key logos of partners/clients, as these provide crucial social proof and validate market acceptance."
    * **(Conditional: ONLY if Financials are absent or highly ambiguous)** "Develop a clear and defensible financial overview, including high-level revenue projections (e.g., 3-5 years), key unit economics (e.g., LTV, CAC), burn rate, runway, and a plausible path to profitability, which are essential for investors to assess financial viability and return potential."
    * **(Conditional: ONLY if Team Background is missing, too brief, or irrelevant to product/industry)** "Strengthen the 'Team' section by providing concise yet impactful profiles for each key team member, emphasizing their relevant industry experience, previous successes, specific roles, and how their unique skills (e.g., technical, sales, operational) directly contribute to the company's ability to execute its vision. Also, highlight any notable advisors or board members."
    * **(Conditional: ONLY if Product Roadmap is absent or vague)** "Present a forward-looking product roadmap that outlines key development milestones (e.g., MVP launch, next major features), future technological integrations, and strategic priorities for the next 12-24 months, allowing investors to understand the product's evolution and future growth drivers."
    * **(Conditional: ALWAYS include)** "Clearly define 'The Ask' (specific funding amount) and provide a detailed allocation breakdown of how the capital will be utilized (e.g., % for product development, % for marketing, % for team expansion), linking fund usage directly to achieving specific, measurable milestones."
    * **(Conditional: ALWAYS include)** "Refine the overall narrative flow of the presentation to tell a compelling and logical story, ensuring a seamless transition from problem to solution, market opportunity, business model, and financial projections, as a cohesive narrative significantly enhances investor understanding and recall."
    * **(Conditional: Consider if deck has too much text)** "Condense verbose slides into concise, impactful statements and use clear headings with supporting bullet points to convey information efficiently, respecting investor time and improving memorability."

Count all pages in the PDF and analyze EVERY SINGLE ONE. Include title slides, content slides, appendix slides, etc. The slideBySlideNotes array MUST contain an entry for every slide in the PDF.`;
}

function getPublicAnalysisPrompt(scoringScale) {
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

function getSlideBySlideAnalysisPrompt(scoringScale) {
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
