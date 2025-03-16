
export async function analyzeWithOpenAI(pdfBase64: string, apiKey: string) {
  // Analysis prompt
const prompt = `
You are an expert VC analyst with years of experience in assessing investment opportunities. You look past what's written in the deck, call out inconsistencies, and provide objective reasoning for your judgments.  

You will perform a step-by-step deep-dive analysis of a startup based on its pitch deck, research industry data where needed, search through the internet, and provide an unbiased assessment.  

### **Step 1: High-Level Overview**  
- Summarize the startup's potential, strengths, and risks.  
- Identify critical areas requiring scrutiny.  

### **Step 2: Section-Wise Deep Dive**  
Analyze each section with a structured breakdown:  

1. **Problem and Market Opportunity**  
2. **Solution (Product)**  
3. **Competitive Landscape**  
4. **Traction**  
5. **Business Model**  
6. **Go-to-Market Strategy**  
7. **Team**  
8. **Financials**  
9. **The Ask**  

### **For Each Section, Provide:**  
- **A detailed description (at least 3-4 sentences) explaining key insights.**  
- **A score from 1 to 5 (with one decimal precision, e.g., 3.7, 4.2). DO NOT use percentages or scores out of 100.**  
- **5-7 strengths.**  
- **5-7 weaknesses or areas for improvement.**  

### **Output Format (JSON):**  
Ensure the output is structured as follows:  

{
  "overallSummary": "A high-level overview of the startup's strengths, weaknesses, and potential investment risks.",
  "sections": [
    {
      "type": "PROBLEM",
      "title": "Problem Statement",
      "score": 4.3,
      "description": "Detailed breakdown of the problem and market opportunity.",
      "strengths": ["Strength 1", "Strength 2"],
      "weaknesses": ["Weakness 1", "Weakness 2"]
    },
    {
      "type": "SOLUTION",
      "title": "Solution (Product)",
      "score": 3.8,
      "description": "Detailed breakdown of the product and its effectiveness.",
      "strengths": ["Strength 1", "Strength 2"],
      "weaknesses": ["Weakness 1", "Weakness 2"]
    },
    ...
  ],
  "overallScore": 3.7,
  "assessmentPoints": ["Key point 1", "Key point 2", "Key point 3", "Key point 4", "Key point 5"]
}

ALWAYS include at least 5 detailed assessment points in the "assessmentPoints" array that provide a comprehensive overview of the startup's investment potential.
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
      const geminiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
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
          topK: 40
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
        // Gemini returns a different structure than OpenAI
        if (!geminiData.candidates || !geminiData.candidates[0] || !geminiData.candidates[0].content) {
          throw new Error("Empty response from Gemini");
        }
        
        const content = geminiData.candidates[0].content.parts[0].text;
        
        if (!content) {
          throw new Error("Empty response from Gemini");
        }
        
        // Extract JSON from the response (Gemini might include markdown code blocks)
        let jsonContent = content;
        
        // If the response contains a JSON code block, extract it
        const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          jsonContent = jsonMatch[1];
        }
        
        // Try to parse the JSON response
        const parsedContent = JSON.parse(jsonContent);
        
        // Validate the response structure
        if (!parsedContent.sections || !Array.isArray(parsedContent.sections) || parsedContent.sections.length === 0) {
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
