import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Get the Gemini API key from Deno environment variables (Supabase secrets)
const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  // Ensure the API key is available
  if (!geminiApiKey) {
    console.error('GEMINI_API_KEY is not set in environment variables.');
    return new Response(JSON.stringify({
      success: false,
      error: 'Server configuration error: GEMINI_API_KEY is missing.'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }

  try {
    const { companyName, companyIntroduction, companyIndustry, companyStage, userResponse, conversationHistory } = await req.json();

    // Build the system instruction for the Gemini API
    // This acts as the "system" role in OpenAI, guiding the bot's behavior.
    const systemInstruction = `You are a seasoned venture capitalist bot designed to evaluate startup ideas through systematic questioning. You are evaluating ${companyName}, a ${companyStage} company in the ${companyIndustry} industry.

Company Background: ${companyIntroduction}

Your role:
1. Ask structured questions that VCs typically ask during pitch evaluations
2. Provide constructive feedback on user responses 
3. Ask follow-up questions based on their answers
4. Cover key areas: problem-solution fit, market size, business model, competition, team, traction, financials, and scalability
5. Be encouraging but critical, like a real VC would be
6. Keep responses concise but insightful

Question flow should cover:
- Problem & Solution validation
- Market opportunity and size  
- Business model and revenue streams
- Competitive landscape and differentiation
- Team background and execution capability
- Current traction and metrics
- Financial projections and funding needs
- Scalability and growth strategy

Always provide specific feedback on their answer first, then ask the next logical question. Be conversational but professional. Do NOT use any markdown formatting (e.g., bold, italics, lists, code blocks). Respond in plain text only.`; // Added instruction to avoid markdown

    // Prepare messages for Gemini API
    // Gemini's 'contents' array expects roles 'user' or 'model' and 'parts' array
    const geminiContents = [
      // The system instruction is provided as the first 'user' turn
      {
        role: 'user',
        parts: [{ text: systemInstruction }]
      },
      // Map the existing conversation history to Gemini's format
      ...conversationHistory.map((msg: { role: string; content: string; }) => ({
        role: msg.role === 'assistant' ? 'model' : 'user', // Map 'assistant' to 'model' for Gemini
        parts: [{ text: msg.content }]
      })),
      // Add the current user's response
      {
        role: 'user',
        parts: [{ text: userResponse }]
      }
    ];

    console.log('Calling Gemini API with contents:', geminiContents);

    // Gemini API endpoint for text generation
    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

    const response = await fetch(geminiApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: geminiContents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800, // Corresponds to max_tokens
          responseMimeType: "text/plain" // Instruct Gemini to return plain text
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', errorData);
      throw new Error(`Gemini API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log('Gemini response:', data);

    // Extract the bot's response from Gemini's structure
    const botResponse = data.candidates && data.candidates.length > 0 &&
                        data.candidates[0].content && data.candidates[0].content.parts &&
                        data.candidates[0].content.parts.length > 0
                        ? data.candidates[0].content.parts[0].text
                        : "I'm sorry, I couldn't generate a response.";

    return new Response(JSON.stringify({
      success: true,
      response: botResponse
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error in VC evaluation bot function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
