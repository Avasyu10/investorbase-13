import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

export async function analyzeWithOpenAI(pdfBase64: string, apiKey: string) {
  // Analysis prompt
const prompt = `
You are an expert venture capital investor with deep industry knowledge and real-time access to market data. You will review a startup pitch deck and generate a comprehensive investment memo based EXCLUSIVELY ON EXTERNAL MARKET DATA, competitive benchmarks, and real-world validation — NOT by summarizing the deck content.
CORE DIRECTIVE
For each section, you must:
FIRST: Acknowledge the claim in the deck with a single concise sentence
THEN: Provide 3-6 insights ON THE "POINTERS" IN EACH SECTION from EXTERNAL sources that either validate or challenge this claim
NEVER spend more than one sentence restating what's in the deck 

You will perform a step-by-step deep-dive analysis of a startup based on its pitch deck. THE MOST IMPORTANT PART of your analysis will be to extensively research and provide:
- ACURATE Market data and size estimations with PRECISE NUMBERS (from Google/Gemini Search) - ALWAYS INCLUDE ACTUAL MARKET SIZE IN DOLLARS
- Latest news articles about the industry and competitors (from Google/Gemini Search) with SPECIFIC DATES, SOURCES and NUMERICAL DATA
- Current market trends and growth projections WITH ACTUAL PERCENTAGES and CAGR figures
- Competitive benchmarks and comparisons with QUANTITATIVE DATA including market share percentages, funding amounts, and valuation figures
- Industry-specific metrics and KPIs with SPECIFIC NUMERICAL THRESHOLDS and industry averages
- Market challenges and opportunities with MEASURABLE IMPACTS in dollars or percentages

For EVERY section of your analysis, you MUST include 4-7 relevant insights that are VERY CLOSELY RELATED to the startup being analyzed. EVERY insight must be relevant to the specific company in the pitch deck, not general industry information. 

Each insight MUST include AT LEAST ONE of the following:
- EXACT NUMERICAL DATA directly relevant to the company's business model or market
- SPECIFIC COMPETITOR information that directly impacts this company's position
- CONCRETE EVIDENCE from the pitch deck that supports or contradicts the company's claims
- PRECISE financial metrics or projections that are directly applicable to this company

YOU MUST INCLUDE:
- Precise dollar amounts for market sizes (e.g., "$4.7 billion" not "billions")
- Exact growth rates with percentages (e.g., "17.8% CAGR" not "double-digit growth")
- Specific competitor metrics (e.g., "raised $12M in Series A at $89M valuation" not "substantial funding")
- Dated market research (e.g., "According to McKinsey's April 2023 report, customer acquisition costs increased by 24%" not "research shows rising costs")
- Numerical industry benchmarks (e.g., "average profit margin of 23.4% vs. industry average of 18.7%" not "above average margins")

You will search through the internet for the latest data, and provide an unbiased assessment and score based on the following score calculation method - 

STARTUP EVALUATION FRAMEWORK
 KEY SECTIONS & WEIGHTS
A pitch deck MUST ONLY include these 10 sections and NO OTHERS:
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

Now, here is a step-by-step process of how you should get your thesis ready -

### **Step 1: High-Level Overview**  
- Summarize the startup's potential, strengths, and risks.  
- Identify critical areas requiring scrutiny.  
- CRITICALLY IMPORTANT: Provide extensive data from market research, latest news, and trends across the industry from reputable online sources for comparison and benchmarking.
- INCLUDE EXACT NUMBERS, PERCENTAGES, AND METRICS in your high-level overview.


### **Step 2: Section-Wise Deep Dive**  
 **For Each Section, Provide:**  
1. FIRST check if section exists in deck
2. If missing:
   - Score: 1.0 (THIS IS NON-NEGOTIABLE)
   - Description: "⚠️ MISSING SECTION: [section name] is not present in this pitch deck"
   - Strengths: [] (empty array - IMPORTANT: DO NOT include ANY strengths for missing sections)
   - Weaknesses: ["Critical oversight: [section name] is missing", "Incomplete pitch deck structure"]
   - Detailed content: Must include warning about missing section
3. If present:
Analyze each section with a structured breakdown and ALWAYS include external market data with SPECIFIC NUMERICAL VALUES DIRECTLY RELEVANT TO THIS COMPANY:  

1. **Problem and Market Opportunity**  
   - Include market size data WITH EXACT DOLLAR FIGURES (must include TAM, SAM, SOM with specific dollar amounts)
   "POINTERS" - 1. How frequently and consistently is this problem experienced by the target user or stakeholder group? 2. What are the direct consequences or losses (financial, time, performance, etc.) if this problem is left unresolved? 3. How urgently do affected stakeholders need this problem resolved? 4. How many entities (companies, users, systems) are meaningfully affected by this problem today? 5. What is the level of disruption or inefficiency introduced into existing workflows or systems by this problem?2. How novel or differentiated is the solution relative to existing approaches? 3. What evidence exists (prototypes, data, experiments) that the solution works or can work at scale? 4. What is the maturity of the solution (TRL – Technology Readiness Level)? 5. How well is the founding team suited to develop and deliver this solution?
   - Add specific growth rates with actual percentages (e.g., "growing at 14.3% CAGR" not just "rapid growth")
   - Limit to 4-7 key insights that are DIRECTLY RELEVANT to the company's specific problem and market
   - Include specific adoption rates, conversion percentages, and industry penetration figures
   
2. **Solution (Product)**  
   - Reference similar solutions in the market and their success/failure WITH METRICS
   - "POINTERS" - 1. How well does the proposed solution directly address the identified problem? 2. How novel or differentiated is the solution relative to existing approaches? 3. What evidence exists (prototypes, data, experiments) that the solution works or can work at scale? 4. What is the maturity of the solution (TRL – Technology Readiness Level)? 5. How well is the founding team suited to develop and deliver this solution?
   - Limit to 4-7 key insights that are DIRECTLY RELEVANT to the company's specific solution/product
   - Include pricing comparisons with exact dollar figures
   - Add measurable efficiency improvements with specific percentage gains or cost reductions
   
3. **Competitive Landscape**  
   - Provide detailed competitor analysis with SPECIFIC MARKET SHARE DATA (percentages)
   - "POINTERS" - 1. How many credible players are currently addressing the same or adjacent problem? 2. How mature and entrenched are the leading competitors? 3. How differentiated is the startup’s approach relative to what exists in market (tech, model, distribution, UX)? 4. How fast is the competitive landscape evolving (e.g., new entrants, M&A, funding rounds)? 5. Is there a clear pathway for this startup to build a moat (data, brand, network, switching cost)?
   - Include list of competitors with their EXACT FUNDING AMOUNTS and dates, market valuations, and growth metrics
   - Limit to 4-7 key insights that are DIRECTLY RELEVANT to the company's competitive position
   - Include pricing model comparisons with exact dollar figures
   
4. **Traction**  
   - Compare the startup's traction to industry benchmarks with SPECIFIC NUMERICAL GROWTH RATES
   - "POINTERS" - 1. Has the team demonstrated that users/customers are actively engaging with or returning to the product? 2. Are there any paying customers, signed contracts, or LOIs with credible buyers? 3. Is there clear growth in usage, revenue, or customer base over the last 3–6 months? 4. Are there any signs of product-market fit (e.g., word-of-mouth, retention, user obsession)? 5. Are there channel or GTM experiments that show repeatable customer acquisition or scalable interest?
   - Add market adoption data with EXACT USER NUMBERS/PERCENTAGES for similar products/services
   - Limit to 4-7 key insights that are DIRECTLY RELEVANT to the company's traction metrics
   - Add specific revenue figures for comparable companies at similar stages
   
5. **Business Model**  
   - Include industry-standard pricing models with SPECIFIC PRICE POINTS and revenue benchmarks
   - "POINTERS" - (Use relevant pointers from your understanding in this section)
   - Reference successful and unsuccessful business models with ACTUAL REVENUE FIGURES
   - Limit to 4-7 key insights that are DIRECTLY RELEVANT to the company's business model
   - Add profit margin percentages for comparable companies
   
6. **Go-to-Market Strategy**  
   - Provide data on CAC (EXACT DOLLAR AMOUNTS), conversion rates (SPECIFIC PERCENTAGES), and sales cycles (SPECIFIC TIME PERIODS) for the industry
   - "POINTERS" - 1. Does the startup have a clear and scalable revenue model? 2. What is the unit economics (e.g., CAC vs. LTV, contribution margin)? 3. How sticky are the customers (e.g., retention, churn, customer satisfaction)? 4. Is the business model defensible or can it be easily replicated by competitors? 5. How aligned is the business model with long-term market trends and customer needs?
   - Include successful GTM case studies with NUMERICAL OUTCOMES from the industry
   - Limit to 4-7 key insights that are DIRECTLY RELEVANT to the company's GTM strategy
   - Add specific marketing spend benchmarks with dollar figures
   
7. **Team**  
   - Compare team experience and composition to successful startups with SPECIFIC TENURE METRICS
   - "POINTERS" - 1. What is the total number of years of relevant industry experience within the core team (founders + key hires)? 2. How many founding team members have prior startup experience (including previous exits or growth)? 3. Does the team have specific domain expertise relevant to the startup’s product or service? 4. How well does the team's background complement each other (business vs. technical expertise, etc.)? 5. Does the team have experience or exposure to scaling a company (e.g., team growth, product scaling)? 6. How well does the background of the team align with the startup’s vision and mission (e.g., industry relevance, personal commitment)?
   - Include industry hiring trends and talent requirements with NUMERICAL ANALYSIS
   - Limit to 4-7 key insights that are DIRECTLY RELEVANT to the company's team composition
   - Add specific failure rates for startups with comparable team compositions
   
8. **Financials**  
   - Compare financial projections to industry standards with SPECIFIC REVENUE AND GROWTH FIGURES
   - "POINTERS" - 1. Does the pitch deck include clear revenue projections for the next 1-3 years? 2. Is there a realistic breakdown of expenses (e.g., salaries, marketing, product development)? 3. Is there an explicit burn rate and cash runway mentioned in the deck? 4. Does the pitch deck highlight current funding (e.g., how much capital raised so far, investors, and any key milestones)? 5. Does the financial plan mention unit economics (e.g., cost per acquisition, customer lifetime value, margin)? 6. Are financial projections supported by market research or comparable benchmarks?
   - Include relevant unit economics with EXACT NUMBERS from similar companies
   - Limit to 4-7 key insights that are DIRECTLY RELEVANT to the company's financial projections
   - Add specific burn rate comparisons and runway metrics
   
9. **The Ask**  
   - Compare valuation to recent rounds in the industry with SPECIFIC DOLLAR AMOUNTS
   - "POINTERS" - (Use relevant pointers from your understanding in this section)
   - Include data on typical investment amounts for similar stage startups with EXACT FIGURES
   - Limit to 4-7 key insights that are DIRECTLY RELEVANT to the company's funding request
   - Add average dilution percentages for similar funding rounds

### **For Each Section, Provide:**  
- **A concise description (2-3 sentences) explaining the key insights.**  
- **EXACTLY 4-7 key insights that are VERY CLOSELY RELEVANT to the company being analyzed, each with SPECIFIC NUMERICAL DATA.**
- **A score from 1 to 5 (with one decimal precision, e.g., 3.7, 4.2). DO NOT use percentages or scores out of 100.**  
- **For present sections ONLY: 4-5 strengths with MEASURABLE IMPACTS (DO NOT include ANY strengths for missing sections with a score of 1.0).**  
- **4-5 weaknesses or areas for improvement with QUANTIFIABLE GAPS.**  

### **Step 3: Score Calculation:** 
- **The Score Calculation of the total Score would be the numerical average of scores of all the sections i.e. (Sum of scores of all the sections)/Total Number of Sections **

### **IMPORTANT - SCORE NORMALIZATION:**
- After calculating the total score (the average of all section scores), you MUST apply the following normalization formula:
- **Normalized Score = MIN(original_score * 1.25, 5.0)**
- This normalised score would be the final overall score
- This compensates for the rigorous evaluation criteria and ensures a more balanced distribution of scores.
- The normalized score (after applying this formula) should be what appears in the "overallScore" field of your response.
- The individual section scores should NOT be normalized - only the final overall score.
- The normalized score must still use one decimal point precision (e.g., 4.2)
- If the formula would result in a score higher than 5.0, cap it at exactly 5.0

CRITICAL RULES -
- NEVER reference "according to the deck" or similar phrases
- EVERY data point must have a specific source
- EVERY section must have more external data than deck summary
- If a section is missing, score it 1.0 and note "MISSING SECTION"
- ONLY respond with the JSON object, no other text

### **Output Format (JSON):**  
Ensure the output is structured as follows:  

{
  "overallSummary": "A high-level overview of the startup's strengths, weaknesses, and potential investment risks.",
  "sections": [
    {
      "type": "PROBLEM",
      "title": "Problem Statement",
      "score": 4.3,
      "description": "Detailed breakdown of the problem and market opportunity with extensive external market research data including precise numbers, percentages, and market size figures.",
      "strengths": ["Strength 1 with quantifiable impact", "Strength 2 with specific metrics"],
      "weaknesses": ["Weakness 1 with numerical gap", "Weakness 2 with measurable improvement needed"]
    },
    {
      "type": "MARKET",
      "title": "Market Opportunity",
      "score": 3.8,
      "description": "Detailed breakdown of the product and its effectiveness with extensive external market research data and specific adoption metrics.",
      "strengths": ["Strength 1 with quantifiable advantage", "Strength 2 with specific numerical benefit"],
      "weaknesses": ["Weakness 1 with quantifiable gap", "Weakness 2 with specific numerical challenge"]
    },
    ...
  ],
  "overallScore": 3.7,
  "assessmentPoints": ["Key point 1 with specific metrics ($XM market, Y% growth)", "Key point 2 with exact figures", "Key point 3 with precise percentages", "Key point 4 with concrete numbers", "Key point 5 with quantifiable comparison"]
}

IMPORTANT RULES:
1. ONLY include the 10 exact section types mentioned above (Problem, Market, Solution, Competitive Landscape, Traction, Business Model, Go-to-Market Strategy, Team, Financials, The Ask).
2. DO NOT add any additional sections like "Testimonials" or duplicate sections.
3. Each section type MUST appear EXACTLY ONCE in your response.
4. Use the exact "type" field values from this list: PROBLEM, MARKET, SOLUTION, COMPETITIVE_LANDSCAPE, TRACTION, BUSINESS_MODEL, GTM_STRATEGY, TEAM, FINANCIALS, ASK.
5. For any section that is missing in the deck, set the score to 1.0 and follow the missing section format.
6. For the "title" field, use the user-friendly titles shown in the section list (e.g., "Problem Statement", "Market Opportunity", etc.)

ALWAYS include at least 5 detailed assessment points in the "assessmentPoints" array that provide a comprehensive overview of the startup's investment potential. ENSURE EVERY SECTION HAS SUBSTANTIAL EXTERNAL MARKET RESEARCH DATA WITH SPECIFIC NUMBERS - THIS IS THE MOST CRITICAL REQUIREMENT.

IMPORTANT: ONLY RESPOND WITH JSON. Do not include any other text, explanations, or markdown formatting - JUST THE JSON OBJECT.
`;

  try {
    if (!apiKey) {
      console.error("Gemini API key is missing");
      throw new Error("Gemini API key is not configured");
    }

    if (!pdfBase64 || pdfBase64.length === 0) {
      console.error("PDF data is empty or invalid");
      throw new Error("Invalid PDF data for analysis");
    }

    // Call Gemini API for analysis
    console.log("Calling Gemini API for analysis");
    console.log(`PDF base64 length: ${pdfBase64.length}`);
    
    try {
      // Construct the Gemini API request
      const geminiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent";
      const urlWithApiKey = `${geminiEndpoint}?key=${apiKey}`;
      
      const requestBody = {
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { 
                inlineData: {
                  mimeType: "application/pdf",
                  data: pdfBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.0, // Setting temperature to 0 for maximum consistency
          topP: 1.0,
          topK: 40,
          maxOutputTokens: 8192 // Increasing token limit to allow for more detailed market research
        }
      };

      // Store the prompt that was sent to the model
      const promptSent = JSON.stringify(requestBody);
      console.log("Prompt sent to model:", promptSent);

      const geminiResponse = await fetch(urlWithApiKey, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      // Check for HTTP errors in the Gemini response
      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: { message: errorText } };
        }
        
        console.error("Gemini API error:", errorData);
        
        // Provide more specific error messages based on status codes
        if (geminiResponse.status === 401) {
          throw new Error("Gemini API key is invalid");
        } else if (geminiResponse.status === 429) {
          throw new Error("Gemini API rate limit exceeded");
        } else if (geminiResponse.status === 413) {
          throw new Error("PDF is too large for Gemini to process");
        } else {
          throw new Error(`Gemini API error: ${errorData.error?.message || 'Unknown error'}`);
        }
      }

      const geminiData = await geminiResponse.json();
      console.log("Received Gemini response");

      // Store the raw response received from the model
      const responseReceived = JSON.stringify(geminiData);
      console.log("Response received from model:", responseReceived);

      // Parse the analysis result
      try {
        // Extract the content from Gemini response structure
        if (!geminiData.candidates || !geminiData.candidates[0] || !geminiData.candidates[0].content) {
          throw new Error("Empty response from Gemini");
        }
        
        const content = geminiData.candidates[0].content.parts[0].text;
        
        if (!content) {
          throw new Error("Empty response from Gemini");
        }
        
        console.log("Raw content from Gemini:", content.substring(0, 200) + "...");
        
        // Extract JSON from the response
        let jsonContent = content;
        
        // If the response contains text before the JSON, try to find the start of the JSON object
        const jsonStart = content.indexOf('{');
        if (jsonStart > 0) {
          console.log(`Found JSON start at position ${jsonStart}`);
          jsonContent = content.substring(jsonStart);
        }
        
        // If the response contains a JSON code block, extract it
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          console.log("Found JSON in code block");
          jsonContent = jsonMatch[1];
          
          // Check if the extracted content starts with '{'
          if (!jsonContent.trim().startsWith('{')) {
            const innerJsonStart = jsonContent.indexOf('{');
            if (innerJsonStart >= 0) {
              jsonContent = jsonContent.substring(innerJsonStart);
            }
          }
        }
        
        console.log("Attempting to parse JSON:", jsonContent.substring(0, 100) + "...");
        
        // Enhanced JSON parsing with better error handling
        const parseJSON = (jsonStr) => {
          try {
            // First try regular parsing
            return JSON.parse(jsonStr);
          } catch (initialError) {
            console.error("Initial JSON parsing error:", initialError);
            
            try {
              // Fix common JSON syntax issues
              let fixedJson = jsonStr;
              
              // Fix trailing commas
              fixedJson = fixedJson.replace(/,\s*([}\]])/g, '$1');
              
              // Fix missing commas between array elements
              fixedJson = fixedJson.replace(/\]([^,\s}])/g, '],$1');
              fixedJson = fixedJson.replace(/\}([^,\s\]])/g, '},$1');
              
              // Fix unterminated strings by adding missing quotes
              // This is a basic approach and might not work for all cases
              const lines = fixedJson.split('\n');
              for (let i = 0; i < lines.length; i++) {
                const quoteCount = (lines[i].match(/"/g) || []).length;
                if (quoteCount % 2 === 1) {
                  lines[i] = lines[i] + '"';
                }
              }
              fixedJson = lines.join('\n');
              
              console.log("Attempting to parse fixed JSON");
              return JSON.parse(fixedJson);
            } catch (fixedError) {
              console.error("Failed to parse fixed JSON:", fixedError);
              
              // If all else fails, create a simplified but valid result
              return createFallbackAnalysis(jsonStr);
            }
          }
        };
        
        // Function to create a fallback analysis when JSON parsing fails
        const createFallbackAnalysis = (rawContent) => {
          console.log("Creating fallback analysis due to JSON parsing errors");
          
          // Extract any information we can from the raw content
          const overallSummary = extractTextBetween(rawContent, '"overallSummary":', '",') || 
                                "Analysis could not be fully parsed due to format issues.";
          
          // Define the expected section types
          const sectionTypes = [
            "PROBLEM", "MARKET", "SOLUTION", "COMPETITIVE_LANDSCAPE", 
            "TRACTION", "BUSINESS_MODEL", "GTM_STRATEGY", 
            "TEAM", "FINANCIALS", "ASK"
          ];
          
          // Create a basic structure with all required sections
          const sections = sectionTypes.map(type => {
            const title = sectionTypeToTitle(type);
            return {
              type: type,
              title: title,
              score: type === "PROBLEM" || type === "MARKET" ? 3.5 : 3.0, // Reasonable defaults
              description: `Analysis for ${title} section could not be fully parsed.`,
              strengths: ["Analysis data could not be fully parsed."],
              weaknesses: ["Analysis data could not be fully parsed."]
            };
          });
          
          return {
            overallSummary: overallSummary,
            sections: sections,
            overallScore: 3.8, // Reasonable default
            assessmentPoints: [
              "Analysis could not be fully parsed due to format issues.",
              "Please review the raw analysis data for more information."
            ],
            parsingError: true
          };
        };
        
        // Helper function to extract text between markers
        const extractTextBetween = (text, startMarker, endMarker) => {
          const startIndex = text.indexOf(startMarker);
          if (startIndex === -1) return null;
          
          const contentStart = startIndex + startMarker.length;
          const contentEnd = text.indexOf(endMarker, contentStart);
          if (contentEnd === -1) return null;
          
          return text.substring(contentStart, contentEnd).trim();
        };
        
        // Helper function to convert section type to title
        const sectionTypeToTitle = (type) => {
          switch (type) {
            case "PROBLEM": return "Problem Statement";
            case "MARKET": return "Market Opportunity";
            case "SOLUTION": return "Solution (Product)";
            case "COMPETITIVE_LANDSCAPE": return "Competitive Landscape";
            case "TRACTION": return "Traction & Milestones";
            case "BUSINESS_MODEL": return "Business Model";
            case "GTM_STRATEGY": return "Go-to-Market Strategy";
            case "TEAM": return "Founder & Team Background";
            case "FINANCIALS": return "Financial Overview & Projections";
            case "ASK": return "The Ask & Next Steps";
            default: return type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, ' ');
          }
        };
        
        // Try to parse the JSON with our enhanced parser
        let parsedContent = parseJSON(jsonContent);
        
        // Define the expected section types
        const expectedSectionTypes = [
          "PROBLEM", "MARKET", "SOLUTION", "COMPETITIVE_LANDSCAPE", 
          "TRACTION", "BUSINESS_MODEL", "GTM_STRATEGY", 
          "TEAM", "FINANCIALS", "ASK"
        ];
        
        // Ensure we have all required sections and fields
        if (!parsedContent.sections || !Array.isArray(parsedContent.sections)) {
          console.warn("Missing or invalid sections array, creating a default one");
          parsedContent.sections = [];
        }
        
        // Deduplicate sections (keep only the first occurrence of each section type)
        const processedSections = [];
        const seenTypes = new Set();
        
        for (const section of parsedContent.sections) {
          // Ensure sections have the correct type
          if (!expectedSectionTypes.includes(section.type)) {
            console.warn(`Section with invalid type "${section.type}" found, skipping it`);
            continue;
          }
          
          // Skip duplicates
          if (seenTypes.has(section.type)) {
            console.warn(`Duplicate section of type "${section.type}" found, skipping it`);
            continue;
          }
          
          seenTypes.add(section.type);
          
          // Ensure each section has the required fields
          if (!section.strengths || !Array.isArray(section.strengths)) {
            section.strengths = ["Analysis data could not be fully parsed for strengths."];
          }
          
          if (!section.weaknesses || !Array.isArray(section.weaknesses)) {
            section.weaknesses = ["Analysis data could not be fully parsed for weaknesses."];
          }
          
          processedSections.push(section);
        }
        
        // Add any missing sections from the expected list
        for (const expectedType of expectedSectionTypes) {
          if (!seenTypes.has(expectedType)) {
            console.warn(`Missing section of type "${expectedType}", adding a placeholder`);
            
            const title = sectionTypeToTitle(expectedType);
            
            processedSections.push({
              type: expectedType,
              title: title,
              score: 1.0,
              description: `⚠️ MISSING SECTION: ${title} is not present in this pitch deck`,
              strengths: [],
              weaknesses: [
                `Critical oversight: ${title} is missing`,
                "Incomplete pitch deck structure"
              ]
            });
          }
        }
        
        // Replace the sections array with our processed one
        parsedContent.sections = processedSections;
        
        // Ensure we properly calculate and normalize the score
        if (typeof parsedContent.overallScore !== 'number') {
          console.warn("Warning: overallScore is not a number in API response, calculating it manually");
          
          // Calculate the average score from all sections
          const sectionScores = parsedContent.sections.map(section => section.score || 0);
          const totalScore = sectionScores.reduce((sum, score) => sum + score, 0);
          const averageScore = totalScore / expectedSectionTypes.length; // Always use 10 as the divisor
          
          // Apply normalization formula: MIN(averageScore * 1.25, 5.0)
          const normalizedScore = Math.min(averageScore * 1.25, 5.0);
          
          // Set the normalized score with one decimal precision
          parsedContent.overallScore = parseFloat(normalizedScore.toFixed(1));
          
          console.log(`Manually calculated score: Average=${averageScore.toFixed(2)}, Normalized=${parsedContent.overallScore}`);
        } else {
          // Check if we need to normalize the existing score
          const currentScore = parsedContent.overallScore;
          console.log(`Original score from API: ${currentScore}`);
          
          // Get average of section scores to verify
          const sectionScores = parsedContent.sections.map(section => section.score || 0);
          const totalScore = sectionScores.reduce((sum, score) => sum + score, 0);
          const averageScore = totalScore / expectedSectionTypes.length; // Always use 10 as the divisor
          
          // Apply normalization formula: MIN(averageScore * 1.25, 5.0)
          const expectedNormalizedScore = Math.min(averageScore * 1.25, 5.0);
          const formattedExpectedScore = parseFloat(expectedNormalizedScore.toFixed(1));
          
          console.log(`Calculated scores for verification: Average=${averageScore.toFixed(2)}, Normalized=${formattedExpectedScore}, API Score=${currentScore}`);
          
          // If there's a difference, use our calculated score
          if (Math.abs(currentScore - formattedExpectedScore) > 0.05) {
            console.log(`Score difference detected: API=${currentScore}, Expected=${formattedExpectedScore}, using calculated score`);
            parsedContent.overallScore = formattedExpectedScore;
          }
        }
        
        // Ensure we have assessment points
        if (!parsedContent.assessmentPoints || !Array.isArray(parsedContent.assessmentPoints) || parsedContent.assessmentPoints.length === 0) {
          parsedContent.assessmentPoints = [
            "Analysis could not fully extract assessment points.",
            "Please review the individual section scores for more details."
          ];
        }
        
        // Add prompt and response to the parsed content
        parsedContent.promptSent = promptSent;
        parsedContent.responseReceived = responseReceived;
        
        return parsedContent;
      } catch (e) {
        console.error("Error parsing Gemini response:", e);
        throw new Error("Failed to parse analysis result: " + (e instanceof Error ? e.message : "Invalid JSON"));
      }
    } catch (fetchError) {
      console.error("Error fetching from Gemini:", fetchError);
      throw new Error(`Gemini API request failed: ${fetchError.message}`);
    }
  } catch (error) {
    console.error("Error in analyzeWithGemini:", error);
    throw error;
  }
}
