import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      companyName, 
      companyIntroduction, 
      companyIndustry, 
      companyStage,
      userResponse,
      conversationHistory 
    } = await req.json();

    // Build the conversation context for the VC evaluation bot
    const systemPrompt = `You are a seasoned venture capitalist bot designed to evaluate startup ideas through systematic questioning. You are evaluating ${companyName}, a ${companyStage} company in the ${companyIndustry} industry.

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

Always provide specific feedback on their answer first, then ask the next logical question. Be conversational but professional.`;

    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userResponse }
    ];

    console.log('Calling OpenAI for VC evaluation with messages:', messages);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response:', data);

    const botResponse = data.choices[0].message.content;

    return new Response(JSON.stringify({ 
      success: true, 
      response: botResponse 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in VC evaluation bot function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});