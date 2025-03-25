import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.29.0';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { OpenAI } from 'https://esm.sh/openai@4.0.0';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY') || '',
});

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase credentials not configured");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Server configuration error" 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }
    
    // Create a supabase client with the service key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse the request body
    const { reportId } = await req.json();
    
    if (!reportId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing reportId parameter" 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    
    console.log(`Processing report ID: ${reportId}`);
    
    // Get the report from the database
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();
      
    if (reportError) {
      console.error("Error fetching report:", reportError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Report not found",
          details: reportError.message
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      );
    }
    
    console.log("Report found:", report.title);
    
    // Update the report status to 'processing'
    const { error: updateError } = await supabase
      .from('reports')
      .update({ analysis_status: 'processing' })
      .eq('id', reportId);
      
    if (updateError) {
      console.error("Error updating report status:", updateError);
      // Continue anyway
    }
    
    // Check if this is associated with an email submission
    const { data: emailSubmissionData, error: emailError } = await supabase
      .from('email_submissions')
      .select('*')
      .eq('report_id', reportId)
      .maybeSingle();
      
    // Determine if this is from an email source
    const isEmailSubmission = !emailError && emailSubmissionData;
    console.log('Is this an email submission?', isEmailSubmission ? 'Yes' : 'No');
    
    // Download the PDF file
    let pdfPath = report.pdf_url;
    
    // If the path doesn't include a user ID, we need to determine the correct path
    if (!pdfPath.includes('/')) {
      if (report.user_id) {
        pdfPath = `${report.user_id}/${pdfPath}`;
      } else {
        // For public submissions without a user ID
        pdfPath = `public-uploads/${pdfPath}`;
      }
    }
    
    console.log("Downloading PDF from path:", pdfPath);
    
    const { data: fileData, error: fileError } = await supabase.storage
      .from('report_pdfs')
      .download(pdfPath);
      
    if (fileError) {
      console.error("Error downloading PDF:", fileError);
      
      // Update report status to failed
      await supabase
        .from('reports')
        .update({ 
          analysis_status: 'failed',
          analysis_error: `Error downloading PDF: ${fileError.message}`
        })
        .eq('id', reportId);
        
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Error downloading PDF",
          details: fileError.message
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }
    
    console.log("PDF downloaded successfully, size:", fileData.size);
    
    // Convert the PDF to base64
    const pdfBase64 = await blobToBase64(fileData);
    
    // Get website content if available
    let websiteContent = '';
    if (report.description && report.description.includes('Website Content:')) {
      const websiteContentMatch = report.description.match(/Website Content:\s*([\s\S]*)/);
      if (websiteContentMatch && websiteContentMatch[1]) {
        websiteContent = websiteContentMatch[1].trim();
        console.log("Found website content in description");
      }
    }
    
    // Check for website scrapes
    const { data: websiteScrapes, error: scrapesError } = await supabase
      .from('website_scrapes')
      .select('content')
      .eq('report_id', reportId)
      .is('content', 'not.null')
      .maybeSingle();
      
    if (!scrapesError && websiteScrapes && websiteScrapes.content) {
      websiteContent = websiteScrapes.content;
      console.log("Found website content from scrapes table");
    }
    
    // Check for LinkedIn profile scrapes
    let linkedInContent = '';
    const { data: linkedInScrapes, error: linkedInError } = await supabase
      .from('linkedin_profile_scrapes')
      .select('content')
      .eq('report_id', reportId)
      .is('content', 'not.null')
      .maybeSingle();
      
    if (!linkedInError && linkedInScrapes && linkedInScrapes.content) {
      linkedInContent = linkedInScrapes.content;
      console.log("Found LinkedIn content from scrapes table");
    }
    
    // Prepare the prompt for OpenAI
    const systemPrompt = `You are an expert venture capital analyst. Your task is to analyze a startup pitch deck and provide a comprehensive assessment.
    
Focus on these key areas:
1. Problem & Solution: Clarity of problem statement and solution's effectiveness
2. Market Opportunity: Market size, growth potential, and addressable segments
3. Business Model: Revenue streams, pricing strategy, and path to profitability
4. Team: Founders' experience, domain expertise, and team completeness
5. Traction: Current metrics, growth rate, and customer validation
6. Competition: Competitive landscape analysis and differentiation
7. Go-to-Market Strategy: Customer acquisition approach and sales strategy
8. Financials: Revenue projections, unit economics, and funding requirements

For each section, identify strengths and weaknesses. Provide an overall assessment score from 1-10.
Format your response as structured JSON with these sections.`;

    const userPrompt = `I'm sending you a startup pitch deck to analyze. Please provide a comprehensive assessment.
    
Company Name: ${report.title}
Description: ${report.description || 'Not provided'}

${websiteContent ? `Website Content: ${websiteContent}` : ''}
${linkedInContent ? `LinkedIn Content: ${linkedInContent}` : ''}

The PDF content is attached as a base64 encoded file.`;

    console.log("Sending to OpenAI for analysis...");
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      max_tokens: 4000,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${pdfBase64}`,
                detail: "high"
              }
            }
          ]
        }
      ]
    });
    
    console.log("Received response from OpenAI");
    
    // Extract the response text
    const responseText = completion.choices[0]?.message?.content || '';
    
    // Try to parse the JSON response
    let analysisResult;
    try {
      // Find JSON in the response (it might be wrapped in markdown code blocks)
      const jsonMatch = responseText.match(/```(?:json)?([\s\S]*?)```/) || 
                        responseText.match(/{[\s\S]*}/);
                        
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : responseText;
      analysisResult = JSON.parse(jsonString.trim());
      
      console.log("Successfully parsed JSON response");
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError);
      console.log("Raw response:", responseText);
      
      // If we can't parse the JSON, use the raw text
      analysisResult = {
        companyName: report.title,
        overallScore: 5,
        sections: [
          {
            title: "Analysis",
            content: responseText
          }
        ],
        error: "Could not parse structured analysis"
      };
    }
    
    // Create a company record
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: analysisResult.companyName || report.title,
        overall_score: analysisResult.overallScore || 5,
        assessment_points: analysisResult.assessmentPoints || [],
        report_id: reportId,
        user_id: report.user_id,
        source: isEmailSubmission ? 'email' : 'pitch_deck',
        prompt_sent: systemPrompt + '\n\n' + userPrompt,
        response_received: responseText
      })
      .select()
      .single();
      
    if (companyError) {
      console.error("Error creating company record:", companyError);
      
      // Update report status to failed
      await supabase
        .from('reports')
        .update({ 
          analysis_status: 'failed',
          analysis_error: `Error creating company record: ${companyError.message}`
        })
        .eq('id', reportId);
        
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Error creating company record",
          details: companyError.message
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }
    
    console.log("Company record created:", company.id);
    
    // Create section records
    if (analysisResult.sections && Array.isArray(analysisResult.sections)) {
      for (const section of analysisResult.sections) {
        // Skip if no title or content
        if (!section.title || !section.content) continue;
        
        const { data: sectionRecord, error: sectionError } = await supabase
          .from('sections')
          .insert({
            company_id: company.id,
            title: section.title,
            description: section.content,
            type: 'analysis',
            score: section.score || 5
          })
          .select()
          .single();
          
        if (sectionError) {
          console.error(`Error creating section record for ${section.title}:`, sectionError);
          continue;
        }
        
        console.log(`Section record created for ${section.title}:`, sectionRecord.id);
        
        // Create section details for strengths and weaknesses
        if (section.strengths && Array.isArray(section.strengths)) {
          for (const strength of section.strengths) {
            await supabase
              .from('section_details')
              .insert({
                section_id: sectionRecord.id,
                content: strength,
                detail_type: 'strength'
              });
          }
        }
        
        if (section.weaknesses && Array.isArray(section.weaknesses)) {
          for (const weakness of section.weaknesses) {
            await supabase
              .from('section_details')
              .insert({
                section_id: sectionRecord.id,
                content: weakness,
                detail_type: 'weakness'
              });
          }
        }
      }
    }
    
    // Update the report with the company ID
    await supabase
      .from('reports')
      .update({ 
        company_id: company.id,
        analysis_status: 'completed'
      })
      .eq('id', reportId);
      
    // If this was from an email submission, update the email_submissions table
    if (isEmailSubmission) {
      await supabase
        .from('email_submissions')
        .update({ report_id: reportId })
        .eq('id', emailSubmissionData.id);
    }
    
    console.log("Analysis completed successfully");
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        companyId: company.id,
        companyName: company.name,
        overallScore: company.overall_score
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Fatal error:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Server error", 
        details: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

// Helper function to convert Blob to base64
async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
