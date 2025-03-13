
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

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
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { reportId } = await req.json();
    if (!reportId) {
      throw new Error("Report ID is required");
    }

    console.log(`Processing report ${reportId}`);

    // Get authorization header from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get report details from database
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .eq('user_id', user.id)
      .single();

    if (reportError || !report) {
      throw new Error('Report not found or access denied');
    }

    // Download the PDF from storage
    const { data: pdfData, error: pdfError } = await supabase
      .storage
      .from('report_pdfs')
      .download(`${user.id}/${report.pdf_url}`);

    if (pdfError || !pdfData) {
      throw new Error('Error downloading PDF');
    }

    // Convert PDF to base64
    const pdfBase64 = await pdfData.arrayBuffer()
      .then(buffer => btoa(String.fromCharCode(...new Uint8Array(buffer))));

    // Updated analysis prompt
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
          ... (repeat for all 11 sections)
        ],
        "overallScore": 3.5,
        "assessmentPoints": ["Key point 1", "Key point 2", "Key point 3"]
      }
    `;

    // Call OpenAI API for analysis
    console.log("Calling OpenAI API for analysis");
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
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

    const openaiData = await openaiResponse.json();
    console.log("Received OpenAI response");

    if (!openaiResponse.ok) {
      console.error("OpenAI API error:", openaiData);
      throw new Error(`OpenAI API error: ${openaiData.error?.message || 'Unknown error'}`);
    }

    // Parse the analysis result
    let analysis;
    try {
      analysis = JSON.parse(openaiData.choices[0].message.content);
    } catch (e) {
      console.error("Error parsing OpenAI response:", e);
      analysis = { error: "Failed to parse analysis result" };
    }

    // Create a company entry for the report
    const companyName = report.title;
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: companyName,
        total_score: Math.round(analysis.overallScore * 20) // Convert 0-5 scale to 0-100
      })
      .select()
      .single();

    if (companyError) {
      console.error("Error creating company:", companyError);
      throw new Error('Failed to create company record');
    }

    // Insert sections
    const sectionInserts = analysis.sections.map(section => ({
      company_id: company.id,
      name: section.title,
      description: section.description,
      score: Math.round(section.score * 20), // Convert 0-5 scale to 0-100
    }));

    const { error: sectionsError } = await supabase
      .from('sections')
      .insert(sectionInserts);

    if (sectionsError) {
      console.error("Error creating sections:", sectionsError);
      throw new Error('Failed to create section records');
    }

    // Get all inserted sections to get their IDs
    const { data: insertedSections, error: getSectionsError } = await supabase
      .from('sections')
      .select('*')
      .eq('company_id', company.id);

    if (getSectionsError) {
      console.error("Error getting sections:", getSectionsError);
      throw new Error('Failed to retrieve section records');
    }

    // Insert section details (strengths and weaknesses)
    const sectionDetails = [];
    for (let i = 0; i < insertedSections.length; i++) {
      const section = insertedSections[i];
      const analysisSection = analysis.sections[i];

      if (analysisSection.strengths) {
        analysisSection.strengths.forEach(strength => {
          sectionDetails.push({
            section_id: section.id,
            title: "Strength",
            content: strength,
            score_impact: "positive"
          });
        });
      }

      if (analysisSection.weaknesses) {
        analysisSection.weaknesses.forEach(weakness => {
          sectionDetails.push({
            section_id: section.id,
            title: "Weakness",
            content: weakness,
            score_impact: "negative"
          });
        });
      }
    }

    if (sectionDetails.length > 0) {
      const { error: detailsError } = await supabase
        .from('section_details')
        .insert(sectionDetails);

      if (detailsError) {
        console.error("Error creating section details:", detailsError);
        throw new Error('Failed to create section detail records');
      }
    }

    // Update report with analysis results
    const { error: updateError } = await supabase
      .from('reports')
      .update({ 
        sections: analysis.sections.map(s => s.type)
      })
      .eq('id', reportId);

    if (updateError) {
      console.error("Error updating report:", updateError);
      throw new Error('Failed to update report');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        companyId: company.id,
        message: "Report analyzed successfully" 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error in analyze-pdf function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
