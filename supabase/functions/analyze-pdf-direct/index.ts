
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../analyze-pdf/cors.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate OpenAI API key
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ 
          error: 'OPENAI_API_KEY is not configured',
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Parse request data
    let reqData;
    try {
      reqData = await req.json();
    } catch (e) {
      console.error("Error parsing request JSON:", e);
      return new Response(
        JSON.stringify({ 
          error: "Invalid request format. Expected JSON.",
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const { title, description, pdfBase64 } = reqData;
    
    if (!pdfBase64) {
      console.error("Missing PDF content in request");
      return new Response(
        JSON.stringify({ 
          error: "PDF content is required",
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Get authorization header from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("Missing Authorization header");
      return new Response(
        JSON.stringify({ 
          error: 'Authorization header is required',
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    console.log("Auth header present, proceeding with analysis");
    
    // Create Supabase client for this request
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Supabase credentials are not configured");
      return new Response(
        JSON.stringify({ 
          error: 'Supabase credentials are not configured',
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Import dynamically to avoid issues in edge function context
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.29.0");
    
    // Create auth client with user's token
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    // Get user details for verification
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ 
          error: userError?.message || 'User not authenticated',
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    // Analyze the PDF with OpenAI
    console.log("Starting OpenAI analysis");
    
    // Create system prompt for analyzing pitch decks
    const systemPrompt = `
      You are an expert in analyzing pitch decks for startups. Analyze the PDF content and provide a detailed assessment.
      Your analysis should cover the following aspects:
      1. Problem - Does the pitch deck clearly define the problem they're solving?
      2. Market - Is the target market well-defined and sizeable?
      3. Solution - Is the proposed solution compelling and feasible?
      4. Business Model - Is the business model viable and scalable?
      5. Team - Does the team have the necessary skills and experience?
      6. Financials - Are the financial projections reasonable?
      7. Traction - Is there evidence of traction or customer validation?
      8. Competitive Landscape - Is there awareness of competitors and differentiation?

      For each section, provide a score from 0-5 and list strengths and weaknesses.
      Provide an overall score from 0-5 for the entire pitch deck.
      Also include 2-5 key assessment points summarizing the entire pitch deck.

      Format your response as a valid JSON object with the following structure:
      {
        "overallScore": 3.5,
        "assessmentPoints": ["Point 1", "Point 2", "Point 3"],
        "sections": [
          {
            "type": "PROBLEM",
            "title": "Problem Statement",
            "score": 4.0,
            "description": "Summary of this section...",
            "strengths": ["Strength 1", "Strength 2"],
            "weaknesses": ["Weakness 1", "Weakness 2"]
          },
          ...
        ]
      }
    `;

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here's the content of the pitch deck: ${pdfBase64.substring(0, 100000)}` }
        ],
        temperature: 0.5,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      return new Response(
        JSON.stringify({ 
          error: `Failed to analyze PDF: ${error}`,
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    const openaiResponse = await response.json();
    
    if (!openaiResponse.choices || !openaiResponse.choices[0]?.message?.content) {
      console.error("Invalid response from OpenAI:", openaiResponse);
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse OpenAI response",
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Parse the OpenAI response content to get the analysis
    let analysis;
    try {
      const content = openaiResponse.choices[0].message.content;
      analysis = JSON.parse(content);
    } catch (e) {
      console.error("Error parsing OpenAI response:", e);
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse analysis result",
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Save the analysis results to the database
    console.log("Saving analysis results to database");

    // Create a company record
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: title || 'Unnamed Company',
        overall_score: analysis.overallScore,
        assessment_points: analysis.assessmentPoints || []
      })
      .select()
      .single();

    if (companyError) {
      console.error("Error creating company:", companyError);
      return new Response(
        JSON.stringify({ 
          error: `Failed to create company record: ${companyError.message}`,
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Create a report record
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert({
        title: title || 'Unnamed Report',
        description: description || '',
        user_id: user.id,
        company_id: company.id
      })
      .select()
      .single();

    if (reportError) {
      console.error("Error creating report:", reportError);
      return new Response(
        JSON.stringify({ 
          error: `Failed to create report record: ${reportError.message}`,
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Create sections and their details
    if (analysis.sections && Array.isArray(analysis.sections)) {
      for (const section of analysis.sections) {
        // Create section
        const { data: sectionRecord, error: sectionError } = await supabase
          .from('sections')
          .insert({
            company_id: company.id,
            type: section.type || 'UNKNOWN',
            title: section.title || 'Unnamed Section',
            description: section.description || '',
            score: section.score || 0
          })
          .select()
          .single();

        if (sectionError) {
          console.error("Error creating section:", sectionError);
          continue;
        }

        // Add strengths
        if (section.strengths && Array.isArray(section.strengths)) {
          for (const strength of section.strengths) {
            await supabase
              .from('section_details')
              .insert({
                section_id: sectionRecord.id,
                detail_type: 'strength',
                content: strength
              });
          }
        }

        // Add weaknesses
        if (section.weaknesses && Array.isArray(section.weaknesses)) {
          for (const weakness of section.weaknesses) {
            await supabase
              .from('section_details')
              .insert({
                section_id: sectionRecord.id,
                detail_type: 'weakness',
                content: weakness
              });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        companyId: company.id,
        message: "Pitch deck analyzed successfully" 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Unexpected error in analyze-pdf-direct function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An unexpected error occurred",
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
