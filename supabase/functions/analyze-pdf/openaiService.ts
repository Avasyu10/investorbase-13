
import { encode as base64encode } from "https://deno.land/std@0.208.0/encoding/base64.ts";

export async function analyzeWithOpenAI(pdfBase64: string, apiKey: string) {
  console.log("Starting analysis with Gemini API");
  
  // Define the Gemini API URL (using generative model)
  const apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent";
  
  try {
    // Prepare the prompt for analysis
    const systemPrompt = `
You are an expert pitch deck analyst. Analyze the attached pitch deck PDF and provide a comprehensive analysis following this EXACT format:

{
  "companyName": "Name of the company",
  "overallScore": score from 0-5 as an integer or decimal (e.g., 4.2),
  "website": "Company website URL if found in the pitch deck",
  "industry": "Company industry or sector",
  "stage": "Company stage (pre-seed, seed, series A, etc.)",
  "introduction": "One paragraph introduction about the company (max 500 characters)",
  "assessmentPoints": [
    "Key point 1 about the company or pitch deck",
    "Key point 2 about the company or pitch deck",
    ...
  ],
  "sections": [
    {
      "type": "PROBLEM",
      "title": "Problem",
      "score": score from 0-5,
      "description": "Analysis of the problem section",
      "strengths": ["Strength 1", "Strength 2", ...],
      "weaknesses": ["Weakness 1", "Weakness 2", ...]
    },
    {
      "type": "SOLUTION",
      "title": "Solution",
      "score": score from 0-5,
      "description": "Analysis of the solution section",
      "strengths": ["Strength 1", "Strength 2", ...],
      "weaknesses": ["Weakness 1", "Weakness 2", ...]
    },
    {
      "type": "MARKET",
      "title": "Market",
      "score": score from 0-5,
      "description": "Analysis of the market section",
      "strengths": ["Strength 1", "Strength 2", ...],
      "weaknesses": ["Weakness 1", "Weakness 2", ...]
    },
    {
      "type": "BUSINESS_MODEL",
      "title": "Business Model",
      "score": score from 0-5,
      "description": "Analysis of the business model section",
      "strengths": ["Strength 1", "Strength 2", ...],
      "weaknesses": ["Weakness 1", "Weakness 2", ...]
    },
    {
      "type": "GTM_STRATEGY",
      "title": "Go-to-Market Strategy",
      "score": score from 0-5,
      "description": "Analysis of the go-to-market strategy section",
      "strengths": ["Strength 1", "Strength 2", ...],
      "weaknesses": ["Weakness 1", "Weakness 2", ...]
    },
    {
      "type": "COMPETITIVE_LANDSCAPE",
      "title": "Competitive Landscape",
      "score": score from 0-5,
      "description": "Analysis of the competitive landscape section",
      "strengths": ["Strength 1", "Strength 2", ...],
      "weaknesses": ["Weakness 1", "Weakness 2", ...]
    },
    {
      "type": "TRACTION",
      "title": "Traction",
      "score": score from 0-5,
      "description": "Analysis of the traction section",
      "strengths": ["Strength 1", "Strength 2", ...],
      "weaknesses": ["Weakness 1", "Weakness 2", ...]
    },
    {
      "type": "TEAM",
      "title": "Team",
      "score": score from 0-5,
      "description": "Analysis of the team section",
      "strengths": ["Strength 1", "Strength 2", ...],
      "weaknesses": ["Weakness 1", "Weakness 2", ...]
    },
    {
      "type": "FINANCIALS",
      "title": "Financials",
      "score": score from 0-5,
      "description": "Analysis of the financials section",
      "strengths": ["Strength 1", "Strength 2", ...],
      "weaknesses": ["Weakness 1", "Weakness 2", ...]
    },
    {
      "type": "ASK",
      "title": "The Ask",
      "score": score from 0-5,
      "description": "Analysis of the ask section",
      "strengths": ["Strength 1", "Strength 2", ...],
      "weaknesses": ["Weakness 1", "Weakness 2", ...]
    }
  ]
}

Important guidelines:
1. Some sections might not be in the deck. If a section is missing, still include it but note in the description that it's missing, give it a low score, and list its absence as a weakness.
2. Format your response EXACTLY as the JSON above, with all fields filled appropriately.
3. For each section, provide at least 1-3 strengths and 1-3 weaknesses.
4. Ensure assessment points provide a high-level overview of the company and pitch deck.
5. Make sure the overall score and section scores reflect the quality of the content.
6. Extract company basic information like website, industry, and stage if found in the deck.
7. Keep the introduction concise but informative.
8. Focus on concrete observations and actionable feedback.
`;

    // Prepare the message content
    const messageContent = [
      {
        text: systemPrompt
      },
      {
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBase64
        }
      }
    ];
    
    // Prepare the request body for Gemini
    const requestBody = {
      contents: [
        {
          parts: messageContent
        }
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 8192, // Allow for a substantial response
        responseMimeType: "application/json",
      }
    };
    
    // Set up request headers with API key
    const headers = {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    };
    
    console.log("Sending request to Gemini...");
    
    // Make the API request
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }
    
    console.log("Received response from Gemini");
    
    // Parse the response
    const responseData = await response.json();
    
    // Extract the response text
    let responseText = "";
    if (responseData.candidates && 
        responseData.candidates.length > 0 && 
        responseData.candidates[0].content && 
        responseData.candidates[0].content.parts && 
        responseData.candidates[0].content.parts.length > 0) {
      responseText = responseData.candidates[0].content.parts[0].text;
    } else {
      throw new Error("Unexpected response format from Gemini API");
    }
    
    try {
      // Clean up the response text to ensure valid JSON
      const cleanedText = responseText.trim()
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      
      console.log("Parsing JSON response...");
      
      // Parse the JSON
      const analysis = JSON.parse(cleanedText);
      
      // Do basic validation of the JSON structure
      if (!analysis.sections || !Array.isArray(analysis.sections)) {
        throw new Error("Invalid response: missing sections array");
      }
      
      if (!analysis.overallScore) {
        throw new Error("Invalid response: missing overall score");
      }
      
      console.log("Successfully parsed analysis JSON");
      
      // Return the analysis result
      return analysis;
    } catch (jsonError) {
      console.error("Error parsing Gemini response as JSON:", jsonError);
      console.error("Raw response text:", responseText);
      throw new Error(`Failed to parse Gemini response as JSON: ${jsonError.message}`);
    }
  } catch (error) {
    console.error("Error in analyzeWithOpenAI:", error);
    throw error;
  }
}
