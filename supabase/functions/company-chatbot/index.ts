
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

// Define CORS headers with additional allowed headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-version, referer, user-agent',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if Gemini API key is set
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set in environment variables");
    }

    // Parse request body
    const requestData = await req.json();
    const { 
      companyName, 
      companyIntroduction, 
      companyIndustry,
      companyStage,
      assessmentPoints,
      messages 
    } = requestData;

    if (!messages || !Array.isArray(messages)) {
      throw new Error("Messages array is required");
    }

    // Create system prompt with company information
    let systemPrompt = `You are InsightMaster, an AI assistant specialized in analyzing companies and providing business insights.
    
Current company information:
- Name: ${companyName || 'Unknown'}
- Industry: ${companyIndustry || 'Unknown'}
- Stage: ${companyStage || 'Unknown'}
- Description: ${companyIntroduction || 'No detailed description available.'}

${assessmentPoints && assessmentPoints.length > 0 ? 
`Assessment Points:
${assessmentPoints.map(point => `- ${point}`).join('\n')}` : 
'No assessment points available.'}

Your goal is to help users analyze this company, provide market insights, and answer questions related to the business. Be professional, concise, and insightful. When appropriate, mention specific details from the company description and assessment points.

Formatting instructions:
1. Use proper markdown formatting for your responses
2. For bullet points, use proper markdown (e.g., "- Point 1" not "* Point 1")
3. For emphasis, use bold (**text**) instead of asterisks
4. Make sure to include line breaks between paragraphs for readability

If you don't know something, say so honestly rather than making up information.`;

    // Prepare the conversation history for Gemini
    const conversationHistory = messages.map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }]
    }));

    // If this is the first message, add context about the company
    if (messages.length <= 2) {
      // Add some initial context to help the model
      conversationHistory.unshift({
        role: "user",
        parts: [{ text: `I want to analyze ${companyName}. Here's what I know about it: ${companyIntroduction}` }]
      });
      conversationHistory.unshift({
        role: "model",
        parts: [{ text: "I'll help you analyze this company based on the information available." }]
      });
    }

    // Prepare the request to Gemini API
    const apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

    // Make the API request to Gemini
    const response = await fetch(`${apiUrl}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: systemPrompt }]
          },
          ...conversationHistory
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 800,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      }),
    });

    // Process Gemini API response
    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API error:", errorData);
      throw new Error(`Gemini API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log("Gemini API response:", JSON.stringify(data));

    // Extract the generated text
    let generatedText = "I'm sorry, I couldn't generate a response at this time.";
    if (data.candidates && data.candidates.length > 0 && 
        data.candidates[0].content && 
        data.candidates[0].content.parts && 
        data.candidates[0].content.parts.length > 0) {
      generatedText = data.candidates[0].content.parts[0].text;
    }

    // Return the response
    return new Response(
      JSON.stringify({
        success: true,
        response: generatedText
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in company-chatbot function:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
