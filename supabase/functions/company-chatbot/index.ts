
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-app-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request data
    const { companyId, message, chatHistory = [] } = await req.json();
    console.log(`Received request for company ${companyId}`, { message, historyLength: chatHistory.length });

    if (!companyId || !message) {
      throw new Error("Missing required fields: companyId and message");
    }

    // Create Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch company details
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("*, sections(*)")
      .eq("id", companyId)
      .single();

    if (companyError) {
      console.error("Error fetching company:", companyError);
      throw new Error(`Failed to fetch company details: ${companyError.message}`);
    }

    // Get company name, description, and extract section data
    const companyName = company.name;
    const companyDescription = company.description || "No description available";
    
    // Extract key information from sections
    let sectionsInfo = "";
    if (company.sections && company.sections.length > 0) {
      sectionsInfo = company.sections.map((section) => 
        `Section: ${section.title}\nScore: ${section.score || 'N/A'}\nDescription: ${section.description || 'No description'}\n`
      ).join("\n");
    }

    // Get perplexity research if available
    let researchInfo = "";
    if (company.perplexityResponse) {
      researchInfo = `Recent Research:\n${company.perplexityResponse.substring(0, 1000)}...\n`;
    }

    // Build the system prompt with company information
    const systemPrompt = `You are CompanyGPT, an AI assistant specializing in providing information about "${companyName}".
Here's what you know about this company:

COMPANY INFORMATION:
${companyDescription}

${sectionsInfo}

${researchInfo}

Your role is to act as a knowledgeable assistant that can answer questions about this company based on the information above.
If asked about information not present in the company details, acknowledge that you don't have that specific information.
Be conversational, helpful, and concise. Provide factual responses based only on the data provided.`;

    // Build the messages array for OpenAI
    const messages = [
      { role: "system", content: systemPrompt },
    ];

    // Add chat history to maintain context
    chatHistory.forEach((entry) => {
      messages.push({ role: entry.role, content: entry.content });
    });

    // Add the current message
    messages.push({ role: "user", content: message });

    console.log("Sending request to OpenAI with messages:", messages.length);

    // Call OpenAI API
    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.json().catch(() => ({}));
      console.error("OpenAI API error:", errorData);
      throw new Error(`OpenAI API returned error: ${openAIResponse.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await openAIResponse.json();
    const aiResponse = data.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
    
    console.log("Response generated successfully");

    // Store the chat message in the database
    try {
      const { error: chatInsertError } = await supabase
        .from("company_chat_messages")
        .insert([
          {
            company_id: companyId, 
            user_message: message,
            ai_response: aiResponse,
            timestamp: new Date().toISOString()
          }
        ]);
      
      if (chatInsertError) {
        console.error("Error storing chat message:", chatInsertError);
      }
    } catch (dbError) {
      console.error("Database error when storing chat message:", dbError);
    }

    // Return the response
    return new Response(JSON.stringify({
      response: aiResponse
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error in company-chatbot:", error);
    
    return new Response(JSON.stringify({
      error: error.message || "Unknown error in company chatbot"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
