export async function analyzeWithOpenAI(pdfBase64: string, apiKey: string) {
  // Analysis prompt
const prompt = `
You are an expert VC analyst with years of experience in assessing investment opportunities. You understand the constraints of pitch decks and evaluate startups based on the information provided, without expecting exhaustive details.

You will perform a step-by-step analysis of a startup based on its pitch deck, understanding that decks are typically 10-20 pages with limited space for detailed information. THE MOST IMPORTANT PART of your analysis will be to:
- Analyze the data presented in the deck and form intelligent conclusions
- Assess the quality and clarity of the information provided (not the quantity)
- Recognize when a section has minimal information and score appropriately based on what IS included
- Understand that early-stage startups often have less market data and financial history

For EACH section, focus on the QUALITY of the information presented rather than expecting extensive details. A well-articulated point with clear reasoning should be valued more than a large quantity of surface-level data.

YOU MUST INCLUDE relevant data points when they are provided in the deck, but also clearly indicate when you're making educated assessments based on limited information:
- Use phrases like "Based on the limited information provided..." when appropriate
- Acknowledge when the deck meets industry standards for information depth
- Highlight exceptional clarity or concerning omissions

STARTUP EVALUATION FRAMEWORK
 KEY SECTIONS & WEIGHTS
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

Now, here is a step-by-step process of how you should get your thesis ready -

### **Step 1: High-Level Overview**  
- Summarize the startup's potential, strengths, and risks.  
- Identify critical areas requiring scrutiny.  
- Provide insights based on what information IS available in the deck.
- If market data is scarce in the deck, focus more on the quality of the problem statement and solution design.


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
Analyze each section with a structured breakdown, focusing on the QUALITY rather than quantity of information:  

1. **Problem and Market Opportunity**  
   - Assess the clarity of the problem statement and target market definition
   - If market size data is included, reference it; if not, don't penalize heavily
   - Evaluate whether the problem seems significant and well-articulated
   
2. **Solution (Product)**  
   - Focus on clarity of the solution and how well it addresses the stated problem
   - Assess uniqueness and potential effectiveness based on the description provided
   - Look for evidence of product-market fit in the presentation
   
3. **Competitive Landscape**  
   - Evaluate the awareness of competition shown
   - Look for clear differentiation points, even if competitor details are minimal
   - Assess if positioning makes sense given the stated market and problem
   
4. **Traction**  
   - Consider the startup's stage when evaluating traction expectations
   - Value quality metrics over quantity (one meaningful growth stat > many vanity metrics)
   - Recognize that pre-seed and seed companies may have limited traction
   
5. **Business Model**  
   - Look for clarity on how the business plans to generate revenue
   - Consider feasibility and potential margins based on industry knowledge
   - Assess whether the model aligns with the solution and market
   
6. **Go-to-Market Strategy**  
   - Focus on clarity and feasibility of the approach
   - Consider whether the strategy aligns with the target market
   - Look for thoughtfulness rather than exhaustive channel analysis
   
7. **Team**  
   - Evaluate relevant experience and complementary skills
   - Consider team composition in relation to the specific business challenges
   - Look for passion and commitment signals
   
8. **Financials**  
   - Adjust expectations based on company stage
   - Look for reasonable assumptions rather than detailed projections
   - Value transparency about key metrics over extensive financial models
   
9. **The Ask**  
   - Assess clarity of funding needs and use of funds
   - Look for alignment between ask and company stage/valuation
   - Consider if the funding request matches the growth plan

### **For Each Section, Provide:**  
- **A concise description (2-3 sentences) explaining the key insights.**  
- **2-5 key insights that are DIRECTLY RELEVANT to the company being analyzed, with data when available but focusing on quality over quantity.**
- **A score from 1 to 5 (with one decimal precision, e.g., 3.7, 4.2). DO NOT use percentages or scores out of 100.**  
- **For present sections ONLY: 2-4 strengths that highlight what was done well (DO NOT include ANY strengths for missing sections with a score of 1.0).**  
- **2-4 weaknesses or areas for improvement that would strengthen the pitch.**  

### **Step 3: Score Calculation:** 
- **The Score Calculation would be done by this following document - **
STARTUP EVALUATION FRAMEWORK
A Step-by-Step Guide for Venture Capital Analysts
1. OVERVIEW
This document presents a multi-dimensional model designed to:
1. Score a startup's fundamentals (Problem, Market, Product, etc.)
2. Incorporate cross-sectional synergy (how various sections reinforce or
undermine each other)
3. Adjust for risk factors relevant to the startup's stage and the investor's
thesis
The end result is a Composite Score that helps analysts quickly compare
different deals and identify critical areas of further due diligence.

// ... keep existing code (evaluation framework details)

### **Output Format (JSON):**  
Ensure the output is structured as follows:  

{
  "overallSummary": "A high-level overview of the startup's strengths, weaknesses, and potential investment risks.",
  "sections": [
    {
      "type": "PROBLEM",
      "title": "Problem Statement",
      "score": 4.3,
      "description": "Detailed breakdown of the problem and market opportunity based on information available in the deck.",
      "strengths": ["Strength 1", "Strength 2"],
      "weaknesses": ["Weakness 1", "Weakness 2"]
    },
    {
      "type": "SOLUTION",
      "title": "Solution (Product)",
      "score": 3.8,
      "description": "Detailed breakdown of the product and its effectiveness based on information provided.",
      "strengths": ["Strength 1", "Strength 2"],
      "weaknesses": ["Weakness 1", "Weakness 2"]
    },
    ...
  ],
  "overallScore": 3.7,
  "assessmentPoints": ["Key point 1", "Key point 2", "Key point 3", "Key point 4", "Key point 5"]
}

ALWAYS include at least 5 detailed assessment points in the "assessmentPoints" array that provide a comprehensive overview of the startup's investment potential based on what is actually provided in the pitch deck.

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
      const geminiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
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
          temperature: 0.5,
          topP: 0.8,
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
        
        // Try to parse the JSON response
        let parsedContent;
        try {
          parsedContent = JSON.parse(jsonContent);
        } catch (jsonError) {
          console.error("JSON parsing error:", jsonError);
          
          // Try to fix common JSON issues
          let fixedJson = jsonContent;
          
          // Fix trailing commas
          fixedJson = fixedJson.replace(/,\s*([}\]])/g, '$1');
          
          // Try to find the end of the JSON object if there's text after it
          const lastBrace = fixedJson.lastIndexOf('}');
          if (lastBrace > 0 && lastBrace < fixedJson.length - 1) {
            fixedJson = fixedJson.substring(0, lastBrace + 1);
          }
          
          console.log("Attempting to parse fixed JSON");
          try {
            parsedContent = JSON.parse(fixedJson);
          } catch (fixedJsonError) {
            console.error("Failed to parse fixed JSON:", fixedJsonError);
            
            // If all else fails, create a simplified but valid result
            throw new Error("Failed to parse Gemini response as JSON. Raw content: " + content.substring(0, 200) + "...");
          }
        }
        
        // Validate the response structure
        if (!parsedContent.sections || !Array.isArray(parsedContent.sections) || parsedContent.sections.length === 0) {
          console.error("Invalid analysis structure: missing or empty sections array");
          throw new Error("Invalid analysis structure: missing or empty sections array");
        }
        
        if (typeof parsedContent.overallScore !== 'number') {
          console.warn("Warning: overallScore is not a number, setting default value");
          parsedContent.overallScore = 3; // Default score
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
