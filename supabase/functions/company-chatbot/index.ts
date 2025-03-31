
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");

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
    // Check if Perplexity API key is set
    if (!PERPLEXITY_API_KEY) {
      throw new Error("PERPLEXITY_API_KEY is not set in environment variables");
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

    // Prepare the conversation history for Perplexity
    // Format messages according to Perplexity API requirements
    const formattedMessages = messages.map(msg => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content
    }));
    
    // Add system message to the beginning of the array
    formattedMessages.unshift({
      role: "system",
      content: systemPrompt
    });

    // Prepare the request to Perplexity API
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "sonar",
        messages: formattedMessages,
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 800,
        frequency_penalty: 1,
        presence_penalty: 0,
        return_images: false,
        return_related_questions: false
      }),
    });

    // Process Perplexity API response
    if (!response.ok) {
      const errorData = await response.text();
      console.error("Perplexity API error:", errorData);
      throw new Error(`Perplexity API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log("Perplexity API response:", JSON.stringify(data));

    // Extract the generated text
    let generatedText = "I'm sorry, I couldn't generate a response at this time.";
    if (data.choices && data.choices.length > 0 && 
        data.choices[0].message && 
        data.choices[0].message.content) {
      generatedText = data.choices[0].message.content;
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
