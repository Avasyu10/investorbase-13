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
      temperature: 0.3,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192
    }
  };
  console.log("Sending request to Gemini API");
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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
      "description": "<brief description of what was found in this section with 4-5 detailed points with market data and numbers>"
    },
    {
      "type": "MARKET",
      "title": "Market Opportunity",
      "description": "<brief description of what was found in this section with 4-5 detailed points with market data and numbers>"
    },
    {
      "type": "SOLUTION",
      "title": "Solution (Product)",
      "description": "<brief description of what was found in this section with 4-5 detailed points with market data and numbers>"
    },
    {
      "type": "COMPETITIVE_LANDSCAPE",
      "title": "Competitive Landscape",
      "description": "<brief description of what was found in this section with 4-5 detailed points with market data and numbers>"
    },
    {
      "type": "TRACTION",
      "title": "Traction & Milestones",
      "description": "<brief description of what was found in this section with 4-5 detailed points with market data and numbers>"
    },
    {
      "type": "BUSINESS_MODEL",
      "title": "Business Model",
      "description": "<brief description of what was found in this section with 4-5 detailed points with market data and numbers>"
    },
    {
      "type": "GTM_STRATEGY",
      "title": "Go-to-Market Strategy",
      "description": "<brief description of what was found in this section with 4-5 detailed points with market data and numbers>"
    },
    {
      "type": "TEAM",
      "title": "Founder & Team Background",
      "description": "<brief description of what was found in this section with 4-5 detailed points with market data and numbers>"
    },
    {
      "type": "FINANCIALS",
      "title": "Financial Overview & Projections",
      "description": "<brief description of what was found in this section with 4-5 detailed points with market data and numbers>"
    },
    {
      "type": "ASK",
      "title": "The Ask & Next Steps",
      "description": "<brief description of what was found in this section with 4-5 detailed points with market data and numbers>"
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
    "<actionable improvement suggestion 1, focusing on UI/Design or Content, explaining why it's important and how to implement it. Example: 'Improve slide layout consistency and visual hierarchy by using uniform header styles and consistent spacing between elements, as this enhances readability and professionalism.'>",
    "<actionable improvement suggestion 2, focusing on UI/Design or Content, explaining why it's important and how to implement it. Example: 'Enhance chart readability by adding proper legends, data labels, and using a consistent color scheme throughout all visualizations, which helps investors quickly grasp key data points.'>",
    "<actionable improvement suggestion 3, focusing on UI/Design or Content, explaining why it's important and how to implement it. Example: 'Reduce visual clutter by increasing white space, improving text alignment, and using bullet points more effectively, which makes complex information easier to digest.'>",
    "<actionable improvement suggestion 4, focusing on UI/Design or Content, explaining why it's important and how to implement it. Example: 'Standardize typography by using consistent font sizes, weights, and colors across all slides for better professional appearance and brand consistency.'>",
    "<actionable improvement suggestion 5, focusing on UI/Design or Content, explaining why it's important and how to implement it. Example: 'Ensure all images and graphics are high-resolution and relevant to the content, avoiding pixelation or low-quality visuals, as this reflects poorly on the company’s attention to detail.'>",
    "<actionable improvement suggestion 6, focusing on UI/Design or Content, explaining why it's important and how to implement it. Example: 'Incorporate compelling visuals (e.g., product screenshots, mockups, user interfaces) to clearly illustrate the solution, as visual aids are more impactful than pure text.'>",
    "<actionable improvement suggestion 7, focusing on UI/Design or Content, explaining why it's important and how to implement it. Example: 'Refine the overall color palette to be professional and aligned with the company’s brand, ensuring it does not distract from the content but enhances engagement.'>",
    "<actionable improvement suggestion 8, focusing on Content, explaining why it's important and how to implement it. **(Conditional: ONLY include if Market Sizing is absent or poor)** Add a dedicated Market Sizing slide using TAM/SAM/SOM format with specific market data, credible sources, and clear growth projections, as this provides investors with a clear understanding of the opportunity scale and the company's potential reach.'>",
    "<actionable improvement suggestion 9, focusing on Content, explaining why it's important and how to implement it. **(Conditional: ONLY include if Competitive Analysis is absent or weak)** Include a competitive analysis matrix showing direct and indirect competitors, highlighting key differentiators and competitive advantages, as this demonstrates a clear understanding of the market landscape and unique selling propositions.'>",
    "<actionable improvement suggestion 10, focusing on Content, explaining why it's important and how to implement it. **(Conditional: ONLY include if Traction/Social Proof is absent or weak)** Integrate compelling customer testimonials, success stories, or case studies to strengthen traction evidence and build credibility, showing real-world impact and validation.'>",
    "<actionable improvement suggestion 11, focusing on Content, explaining why it's important and how to implement it. **(Conditional: ONLY include if Financials are absent or unclear)** Develop a clear financial model outlining key assumptions, unit economics, revenue projections for the next 3-5 years, and a realistic path to profitability, as this is crucial for investor evaluation of viability.'>",
    "<actionable improvement suggestion 12, focusing on Content, explaining why it's important and how to implement it. **(Conditional: ONLY include if Team Background is absent, superficial, or irrelevant to product/industry)** If the team background exists but lacks depth, suggest: 'Strengthen the team section by detailing relevant entrepreneurial or industry-specific achievements, highlighting how their diverse expertise directly contributes to the company's success and addresses potential challenges.' Else, if completely missing, suggest: 'Add comprehensive team member profiles with relevant experience, roles, key achievements, and any notable advisors or board members, as investor confidence is heavily influenced by the strength of the founding team.'>",
    "<actionable improvement suggestion 13, focusing on Content, explaining why it's important and how to implement it. **(Conditional: ONLY include if Product Roadmap is absent)** Incorporate a clear product roadmap illustrating future development milestones, key feature releases, and technological advancements, which helps investors visualize the product's evolution and strategic direction.'>",
    "<actionable improvement suggestion 14, focusing on Content, explaining why it's important and how to implement it. 'Clearly define the "Ask" (funding amount) and how the funds will be specifically utilized to achieve key milestones, providing a clear breakdown of allocation and expected outcomes, as this demonstrates financial prudence and a strategic use of capital.'>",
    "<actionable improvement suggestion 15, focusing on overall message/clarity, explaining why it's important and how to implement it. 'Refine the core narrative to be concise and impactful, ensuring a compelling story flows logically across all slides from problem to solution to market opportunity and financial projections, as a clear story is easier to remember and advocate for.'>"
  ]
}

IN SECTIONS, in the description of each section don't mention words pitch deck or deck as it is about the company and deck is just for extracting info about company.

COMPANY INFORMATION EXTRACTION REQUIREMENTS:
- Stage: Look for funding stage mentions (seed, pre-seed, series A/B/C, growth, bootstrap, etc.)
- Industry: Identify the business sector/domain (fintech, healthcare, edtech, saas, marketplace, etc.)
- Website: Extract any website URLs mentioned in the deck
- Description: Create a brief company description based on the pitch content

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
- Provide EXACTLY 15 actionable improvement suggestions
- Each suggestion must be specific and implementable
- MUST include 3-4 UI/Design-specific suggestions such as:
  * "Improve slide layout consistency and visual hierarchy by using uniform header styles and consistent spacing between elements"
  * "Enhance chart readability by adding proper legends, data labels, and using a consistent color scheme throughout all visualizations"
  * "Reduce visual clutter by increasing white space, improving text alignment, and using bullet points more effectively"
  * "Standardize typography by using consistent font sizes, weights, and colors across all slides for better professional appearance"
- Content improvement suggestions chould include:
  * "Add a Market Sizing slide using TAM/SAM/SOM format with specific market data and growth projections"
  * "Include a competitive analysis matrix showing direct and indirect competitors with feature comparisons"
  * "Add customer testimonials or case studies to strengthen traction evidence and build credibility"
  * "Create a detailed financial model showing unit economics, revenue projections, and path to profitability"
  * "Include team member profiles with relevant experience, achievements, and advisory board information"
  * "Add a product roadmap showing future development milestones and feature releases"
- Each suggestion should include WHY it's important and HOW to implement it
- Don't be very strict and if there is a slide of their team members or a slide of their market size and information then don't explicitly give those improvement suggestions.
- Consider industry best practices and investor expectations
- Balance content gaps and presentation improvements
-**Important:** In the team part of improvement suggestions make sure if a slide or page having details of founders or team members are mentioned then don't give suggestion that its not there instead you can see if team background is bad related to the company or product. Don't necessarily put this part if not needed. Same goes for market part and if market size and everything is mentioned don't give suggestion for it.

Count all pages in the PDF and analyze EVERY SINGLE ONE. Include title slides, content slides, appendix slides, etc. The slideBySlideNotes array MUST contain an entry for every slide in the PDF.

Only include sections in the checklist if they are actually present in the pitch deck. Provide a brief, factual description of what content was found for each section that exists.`;
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
