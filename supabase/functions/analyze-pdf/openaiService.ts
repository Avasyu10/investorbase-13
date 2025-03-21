import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

export async function analyzeWithOpenAI(
  pdfBase64: string,
  apiKey: string
): Promise<any> {
  try {
    console.log("Initiating Gemini analysis...");

    // Create the prompt for the AI model
    const prompt = `
    You are a specialized investment analyst with expertise in evaluating startup pitch decks.
    I'll provide you with a startup's pitch deck. Your task is to analyze it thoroughly and provide a detailed assessment.

    FORMAT YOUR RESPONSE IN JSON WITH THESE FIELDS:
    {
      "companyName": "Name of the startup extracted from the deck",
      "companyDescription": "A brief 2-3 sentence description of what the company does",
      "overallScore": A number from 0.0 to 5.0 representing your overall assessment,
      "assessmentPoints": [Array of 3-6 bullet points highlighting key strengths or concerns],
      "website": "The company's website URL if mentioned in the deck",
      "industry": "The industry or sector the startup operates in",
      "stage": "The funding stage or development stage of the company",
      "sections": [
        {
          "type": One of: "PROBLEM", "MARKET", "SOLUTION", "PRODUCT", "COMPETITIVE_LANDSCAPE", "TRACTION", "BUSINESS_MODEL", "GTM_STRATEGY", "TEAM", "FINANCIALS", or "ASK",
          "title": "A relevant title for this section as it appears in the deck",
          "score": A number from 0.0 to 5.0 for this specific section,
          "description": "1-2 paragraph summary of this aspect of the business",
          "detailedContent": "3-5 paragraph detailed analysis with specific information from the deck",
          "strengths": ["Array of 2-4 specific strengths in this area"],
          "weaknesses": ["Array of 2-4 specific weaknesses or concerns in this area"]
        },
        // More sections...
      ]
    }

    IMPORTANT GUIDELINES:
    - Keep all fields structured and concise to match a typical investment memo
    - Include all 11 section types when possible, but only if the deck has relevant content
    - Be highly critical and realistic in your scoring
    - Focus on actionable assessment points
    - Extract company information like website, industry and stage if available in the deck
    - For the company description, provide a clear explanation of what the company actually does
    - Your JSON must be valid with the correct fields and without trailing commas

    SCORING GUIDE:
    0-1: Critical flaws, unlikely to succeed
    1-2: Major concerns requiring significant changes
    2-3: Average, with some notable issues to address
    3-4: Strong, with minor improvements needed
    4-5: Exceptional, investment-ready

    Now, analyze the following pitch deck and provide your assessment in the exact JSON format requested.
    `;

    // Call the Gemini API
    if (!apiKey) {
      console.error("Gemini API key is missing");
      throw new Error("Gemini API key is not configured");
    }

    if (!pdfBase64 || pdfBase64.length === 0) {
      console.error("PDF data is empty or invalid");
      throw new Error("Invalid PDF data for analysis");
    }

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
        
        // Define the expected section types
        const expectedSectionTypes = [
          "PROBLEM", "MARKET", "SOLUTION", "COMPETITIVE_LANDSCAPE", 
          "TRACTION", "BUSINESS_MODEL", "GTM_STRATEGY", 
          "TEAM", "FINANCIALS", "ASK"
        ];
        
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
          processedSections.push(section);
        }
        
        // Add any missing sections from the expected list
        for (const expectedType of expectedSectionTypes) {
          if (!seenTypes.has(expectedType)) {
            console.warn(`Missing section of type "${expectedType}", adding a placeholder`);
            
            // Convert type to title
            let title;
            switch (expectedType) {
              case "PROBLEM": title = "Problem Statement"; break;
              case "MARKET": title = "Market Opportunity"; break;
              case "SOLUTION": title = "Solution (Product)"; break;
              case "COMPETITIVE_LANDSCAPE": title = "Competitive Landscape"; break;
              case "TRACTION": title = "Traction & Milestones"; break;
              case "BUSINESS_MODEL": title = "Business Model"; break;
              case "GTM_STRATEGY": title = "Go-to-Market Strategy"; break;
              case "TEAM": title = "Founder & Team Background"; break;
              case "FINANCIALS": title = "Financial Overview & Projections"; break;
              case "ASK": title = "The Ask & Next Steps"; break;
              default: title = expectedType.charAt(0) + expectedType.slice(1).toLowerCase().replace(/_/g, ' ');
            }
            
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
