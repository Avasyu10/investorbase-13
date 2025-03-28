
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-version',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const requestData = await req.json();
    const { companyId, message, chatHistory } = requestData;

    if (!companyId) {
      throw new Error('Company ID is required');
    }

    // Fetch company details to include in the context
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, overall_score, assessment_points')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      throw new Error(`Error fetching company: ${companyError?.message || 'Company not found'}`);
    }

    // Fetch company sections for more context
    const { data: sections, error: sectionsError } = await supabase
      .from('sections')
      .select('type, title, description, score')
      .eq('company_id', companyId);

    if (sectionsError) {
      console.error("Error fetching sections:", sectionsError);
    }

    // Build initial system message with company context
    let systemMessage = `You are an AI assistant dedicated to providing information about the company "${company.name}". 
The company has an overall score of ${company.overall_score}/5.

Here's what we know about the company:
`;

    // Add sections information
    if (sections && sections.length > 0) {
      systemMessage += "\nCompany evaluation sections:\n";
      sections.forEach(section => {
        systemMessage += `- ${section.title} (${section.type}): Score ${section.score}/5\n`;
        if (section.description) {
          systemMessage += `  Summary: ${section.description.substring(0, 150)}${section.description.length > 150 ? '...' : ''}\n`;
        }
      });
    }

    // Add assessment points if available
    if (company.assessment_points && company.assessment_points.length > 0) {
      systemMessage += "\nKey assessment points:\n";
      company.assessment_points.forEach((point: string, index: number) => {
        systemMessage += `${index + 1}. ${point}\n`;
      });
    }

    systemMessage += `\nAnswer questions about this company based on the information provided. Be concise, professional, and helpful. If you don't know something, say so rather than making up information.`;

    // Build messages array with history
    const messages = [
      { role: "system", content: systemMessage },
    ];

    // Add chat history if available
    if (chatHistory && chatHistory.length > 0) {
      messages.push(...chatHistory);
    }

    // Add the current message
    if (message) {
      messages.push({ role: "user", content: message });
    }

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Return the AI response and updated chat history
    return new Response(
      JSON.stringify({
        response: aiResponse,
        updatedHistory: [
          ...chatHistory || [],
          { role: "user", content: message },
          { role: "assistant", content: aiResponse }
        ]
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error("Error in company chatbot function:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "An error occurred while processing your request",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
