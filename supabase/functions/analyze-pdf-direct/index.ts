
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    // Get authorization header from request for authenticated Supabase client
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header is required");
    }

    // Parse request
    const { title, description, pdfBase64 } = await req.json();
    
    if (!title || !pdfBase64) {
      throw new Error("Title and PDF data are required");
    }

    // Create authenticated Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error("Authentication failed: " + (userError?.message || "User not found"));
    }

    // Analyze the PDF with OpenAI
    console.log("Analyzing PDF with OpenAI...");
    const analysisResult = await analyzeWithOpenAI(pdfBase64);
    
    // Create a unique filename for storage
    const fileName = `${Date.now()}.pdf`;
    const filePath = `${user.id}/${fileName}`;
    
    // Upload the PDF to storage
    console.log("Uploading PDF to storage...");
    const { error: uploadError } = await uploadPdfToStorage(supabase, pdfBase64, filePath);
    
    if (uploadError) {
      throw new Error("Failed to upload PDF: " + uploadError.message);
    }
    
    // Save report and analysis data to the database
    console.log("Saving analysis results to database...");
    const { companyId, error: saveError } = await saveAnalysisResults(
      supabase, 
      analysisResult,
      {
        title,
        description,
        pdfUrl: fileName,
        userId: user.id,
      }
    );
    
    if (saveError) {
      throw new Error("Failed to save analysis results: " + saveError.message);
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        companyId,
        message: "PDF analyzed and saved successfully" 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error in analyze-pdf-direct function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An unexpected error occurred",
        success: false
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});

// Helper function to analyze PDF with OpenAI
async function analyzeWithOpenAI(pdfBase64: string) {
  // Analysis prompt for pitch deck evaluation
  const prompt = `
    You have to act as an expert VC analyst. You have years of experience in analysing and assessing investment opportunities. You look past what's written in the deck and can call out the bullshit whenever you see it. You don't sugarcoat stuff and always provide sound reasoning for your judgement.

    Analyze the following pitch deck sections:

    1. Problem and Market Opportunity
    2. Solution (Product)
    3. Competitive Landscape
    4. Traction
    5. Business Model
    6. Go-to-Market Strategy
    7. Team
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
    // Call OpenAI API for analysis
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

    // Check for HTTP errors
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: { message: errorText } };
      }
      
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices[0].message.content;
    
    // Parse the JSON response
    return JSON.parse(content);
  } catch (error) {
    console.error("Error analyzing with OpenAI:", error);
    throw error;
  }
}

// Upload PDF to Supabase Storage
async function uploadPdfToStorage(supabase: any, pdfBase64: string, filePath: string) {
  try {
    // Convert base64 to Uint8Array
    const binaryString = atob(pdfBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Upload to storage
    const { error } = await supabase.storage
      .from('report_pdfs')
      .upload(filePath, bytes, {
        contentType: 'application/pdf',
        upsert: false
      });
    
    return { error };
  } catch (error) {
    console.error("Error uploading PDF to storage:", error);
    return { error };
  }
}

// Save analysis results to database
async function saveAnalysisResults(
  supabase: any, 
  analysis: any, 
  reportData: { title: string; description?: string; pdfUrl: string; userId: string }
) {
  try {
    // Insert report first
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert({
        title: reportData.title,
        description: reportData.description || '',
        pdf_url: reportData.pdfUrl,
        user_id: reportData.userId,
        analysis_status: 'completed'
      })
      .select()
      .single();
    
    if (reportError) {
      throw reportError;
    }
    
    // Insert company with reference to report
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: reportData.title,
        overall_score: analysis.overallScore || 0,
        assessment_points: analysis.assessmentPoints || [],
        report_id: report.id
      })
      .select()
      .single();
    
    if (companyError) {
      throw companyError;
    }
    
    // Update report with company_id
    const { error: updateReportError } = await supabase
      .from('reports')
      .update({ company_id: company.id })
      .eq('id', report.id);
    
    if (updateReportError) {
      throw updateReportError;
    }
    
    // Insert sections
    for (const section of analysis.sections) {
      const { data: savedSection, error: sectionError } = await supabase
        .from('sections')
        .insert({
          company_id: company.id,
          title: section.title,
          type: section.type,
          score: section.score || 0,
          description: section.description || ''
        })
        .select()
        .single();
      
      if (sectionError) {
        throw sectionError;
      }
      
      // Insert section details (strengths and weaknesses)
      const detailsToInsert = [];
      
      if (section.strengths && Array.isArray(section.strengths)) {
        for (const strength of section.strengths) {
          detailsToInsert.push({
            section_id: savedSection.id,
            detail_type: 'strength',
            content: strength
          });
        }
      }
      
      if (section.weaknesses && Array.isArray(section.weaknesses)) {
        for (const weakness of section.weaknesses) {
          detailsToInsert.push({
            section_id: savedSection.id,
            detail_type: 'weakness',
            content: weakness
          });
        }
      }
      
      if (detailsToInsert.length > 0) {
        const { error: detailsError } = await supabase
          .from('section_details')
          .insert(detailsToInsert);
        
        if (detailsError) {
          throw detailsError;
        }
      }
    }
    
    return { companyId: company.id, error: null };
  } catch (error) {
    console.error("Error saving analysis results:", error);
    return { companyId: null, error };
  }
}
