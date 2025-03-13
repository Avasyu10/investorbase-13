
export async function analyzeWithOpenAI(pdfBase64: string, apiKey: string) {
  // Analysis prompt
  const prompt = `
    You have to act as an expert VC analyst. You have years of experience in analysing and assessing investment opportunities. You look past what's written in the deck and can call out the bullshit whenever you see it. You don't sugarcoat stuff and always provide sound reasoning for your judgement.

    You start by taking a high level overview of the startup and identifying areas you need to look at critically.

    Then in subsequent analysis you scrutinze the deck section wise. You surf the web each time to get relevant informationa and data. Your analysis is always based upon things that have occurred and patterns that emerge out of that.

    1. Problem and Market Opportunity

    2. Solution (Product)

    3. Competitive Landscape

    4. Traction

    5. Business Model

    6. Go-to-Market Strategy

    7. Теам

    8. Financials

    9. The Ask

    For each section, provide:
    - A brief description (1-2 sentences)
    - A score from 1-5 (where 5 is excellent)
    - 2-3 strengths
    - 2-3 weaknesses or areas for improvement
    
    Output in JSON format following this structure:
    {
      "sections": [
        {
          "type": "PROBLEM",
          "title": "Problem Statement",
          "score": 4,
          "description": "Brief description here",
          "strengths": ["Strength 1", "Strength 2"],
          "weaknesses": ["Weakness 1", "Weakness 2"]
        },
        ... (repeat for all sections)
      ],
      "overallScore": 3.5,
      "assessmentPoints": ["Key point 1", "Key point 2", "Key point 3"]
    }
  `;

  try {
    if (!apiKey) {
      console.error("OpenAI API key is missing");
      throw new Error("OpenAI API key is not configured");
    }

    if (!pdfBase64 || pdfBase64.length === 0) {
      console.error("PDF data is empty or invalid");
      throw new Error("Invalid PDF data for analysis");
    }

    // Call OpenAI API for analysis
    console.log("Calling OpenAI API for analysis");
    console.log(`PDF base64 length: ${pdfBase64.length}`);
    
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system", 
            content: prompt
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please analyze this pitch deck PDF"
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`
                }
              }
            ]
          }
        ],
        temperature: 0.5,
        response_format: { type: "json_object" }
      })
    });

    // Check for HTTP errors in the OpenAI response
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: { message: errorText } };
      }
      
      console.error("OpenAI API error:", errorData);
      
      // Provide more specific error messages based on status codes
      if (openaiResponse.status === 401) {
        throw new Error("OpenAI API key is invalid");
      } else if (openaiResponse.status === 429) {
        throw new Error("OpenAI API rate limit exceeded");
      } else if (openaiResponse.status === 413) {
        throw new Error("PDF is too large for OpenAI to process");
      } else {
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
      }
    }

    const openaiData = await openaiResponse.json();
    console.log("Received OpenAI response");

    // Parse the analysis result
    try {
      const content = openaiData.choices[0].message.content;
      if (!content) {
        throw new Error("Empty response from OpenAI");
      }
      
      // Try to parse the JSON response
      const parsedContent = JSON.parse(content);
      
      // Validate the response structure
      if (!parsedContent.sections || !Array.isArray(parsedContent.sections) || parsedContent.sections.length === 0) {
        throw new Error("Invalid analysis structure: missing or empty sections array");
      }
      
      if (typeof parsedContent.overallScore !== 'number') {
        console.warn("Warning: overallScore is not a number, setting default value");
        parsedContent.overallScore = 3; // Default score
      }
      
      return parsedContent;
    } catch (e) {
      console.error("Error parsing OpenAI response:", e);
      throw new Error("Failed to parse analysis result: " + (e instanceof Error ? e.message : "Invalid JSON"));
    }
  } catch (error) {
    console.error("Error in analyzeWithOpenAI:", error);
    throw error;
  }
}
