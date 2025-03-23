
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "./cors.ts";
import { getReportData } from "./reportService.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportId, authHeader } = await req.json();
    
    if (!reportId) {
      throw new Error('Report ID is required');
    }
    
    console.log(`Processing PDF analysis request for report: ${reportId}`);
    
    // Get report data with PDF base64
    const { supabase, report, pdfBase64 } = await getReportData(reportId, authHeader || '');
    
    if (!pdfBase64) {
      throw new Error('Failed to extract PDF content');
    }
    
    console.log(`Successfully retrieved PDF for report: ${reportId}`);
    
    // Check if this is from an email submission
    const adminApiKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const apiUrl = Deno.env.get('SUPABASE_URL') || '';
    let isEmailSubmission = false;
    
    if (adminApiKey && apiUrl) {
      // We'll check directly in the database using service role
      const { data: emailSubmission } = await supabase
        .from('email_submissions')
        .select('*')
        .eq('report_id', reportId)
        .maybeSingle();
        
      if (emailSubmission) {
        isEmailSubmission = true;
        console.log(`Identified report ${reportId} as an email submission`);
      }
    }
    
    // Set source based on submission type
    const source = isEmailSubmission ? 'email' : 'public_url';
    console.log(`Setting source type: ${source}`);
    
    // Create a new client for the function call
    const url = 'https://api.openai.com/v1/chat/completions';
    
    console.log('Calling OpenAI for analysis...');
    
    // Call OpenAI
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert venture capital analyst with deep expertise in pitch deck analysis. 
            You will be provided with a base64-encoded PDF of a pitch deck. 
            Extract all relevant information from the pitch deck and analyze it for investment potential.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this pitch deck PDF (base64 encoded) and provide a comprehensive assessment of its investment potential. 
                Be specific about strengths and weaknesses of the business model, team, market, and financials. 
                Score the deck from 1-5 on overall quality, with 5 being highest.
                Format your response as a JSON object with these fields:
                {
                  "companyName": "Name extracted from the deck",
                  "overallScore": 3.5,
                  "assessmentPoints": ["Key point 1", "Key point 2", "..."],
                  "sections": [
                    {
                      "type": "TEAM",
                      "title": "Team Analysis",
                      "score": 4,
                      "description": "Brief assessment",
                      "detailedContent": "Detailed analysis here",
                      "strengths": ["Strength 1", "Strength 2"],
                      "weaknesses": ["Weakness 1", "Weakness 2"]
                    },
                    ... additional sections for PRODUCT, MARKET, BUSINESS_MODEL, FINANCIALS, etc.
                  ]
                }
                
                This is a ${source} submission.
                `
              },
              {
                type: "text",
                text: `Here is the base64 encoded PDF: ${pdfBase64}`
              }
            ]
          }
        ],
        temperature: 0,
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API Error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    
    // Extract the analysis JSON from the response
    try {
      const analysisText = data.choices[0].message.content;
      console.log('Received analysis from OpenAI');
      
      // Try to parse the response as JSON
      const analysis = JSON.parse(analysisText);
      
      console.log('Successfully parsed analysis JSON');
      
      // Update the report with the analysis
      const { data: updatedReport, error: updateError } = await supabase
        .from('reports')
        .update({
          analysis_status: 'completed'
        })
        .eq('id', reportId)
        .select()
        .single();
        
      if (updateError) {
        throw updateError;
      }
      
      // Create company record for this analysis
      const adminSupabase = await supabase.auth.getSession();
      
      // Now insert the company record
      // Make sure to set source correctly
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert([{
          name: analysis.companyName || report.title,
          overall_score: analysis.overallScore || 0,
          assessment_points: analysis.assessmentPoints || [],
          source: source,
          report_id: reportId,
          user_id: report.user_id
        }])
        .select()
        .single();
        
      if (companyError) {
        throw companyError;
      }
      
      if (!company) {
        throw new Error('Failed to create company record');
      }
      
      console.log(`Created company: ${company.id} with source: ${source}`);
      
      // Update the report to link it to the company
      const { error: reportUpdateError } = await supabase
        .from('reports')
        .update({
          company_id: company.id
        })
        .eq('id', reportId);
        
      if (reportUpdateError) {
        throw reportUpdateError;
      }
      
      // Create sections for the company
      for (const section of analysis.sections) {
        // Create section record
        const { data: sectionRecord, error: sectionError } = await supabase
          .from('sections')
          .insert([{
            company_id: company.id,
            title: section.title,
            type: section.type,
            score: section.score || 0,
            description: section.detailedContent || section.description,
            section_type: section.type.toUpperCase()
          }])
          .select()
          .single();
          
        if (sectionError) {
          console.error(`Error creating section ${section.type}:`, sectionError);
          continue;
        }
        
        // Add strengths and weaknesses
        if (section.strengths && section.strengths.length > 0) {
          for (const strength of section.strengths) {
            await supabase
              .from('section_details')
              .insert([{
                section_id: sectionRecord.id,
                detail_type: 'strength',
                content: strength
              }]);
          }
        }
        
        if (section.weaknesses && section.weaknesses.length > 0) {
          for (const weakness of section.weaknesses) {
            await supabase
              .from('section_details')
              .insert([{
                section_id: sectionRecord.id,
                detail_type: 'weakness',
                content: weakness
              }]);
          }
        }
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          companyId: company.id,
          message: 'Analysis completed successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } catch (jsonError) {
      console.error('Error parsing analysis JSON:', jsonError);
      throw new Error('Failed to parse analysis response');
    }
    
  } catch (error) {
    console.error('Error processing request:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Unknown error occurred'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
