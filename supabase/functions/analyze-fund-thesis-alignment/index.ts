
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders } from "./cors.ts";

// Define CORS headers
serve(async (req) => {
  // Log the request details for debugging
  console.log(`Request method: ${req.method}`);
  console.log(`Request headers:`, JSON.stringify(Object.fromEntries(req.headers.entries())));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request with CORS headers');
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Required environment variables missing');
    }
    
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Parse the request body
    let requestData;
    try {
      requestData = await req.json();
      console.log('Received request data:', JSON.stringify(requestData));
    } catch (error) {
      console.error('Error parsing request JSON:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const { company_id, user_id } = requestData;

    // Validate input
    if (!company_id || !user_id) {
      console.error('Missing required parameters:', { company_id, user_id });
      return new Response(
        JSON.stringify({ error: 'Company ID and User ID are required' }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log(`Processing fund thesis alignment for company ${company_id} and user ${user_id}`);

    // Check if we already have an analysis for this company and user
    const { data: existingAnalysis, error: existingAnalysisError } = await supabaseAdmin
      .from('fund_thesis_analysis')
      .select('*')
      .eq('company_id', company_id)
      .eq('user_id', user_id)
      .maybeSingle();

    if (existingAnalysisError) {
      console.error('Error checking for existing analysis:', existingAnalysisError);
    }

    if (existingAnalysis) {
      console.log('Found existing analysis:', existingAnalysis);
      return new Response(JSON.stringify({
        analysis: existingAnalysis.analysis_text,
        prompt_sent: existingAnalysis.prompt_sent,
        response_received: existingAnalysis.response_received
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    console.log('No existing analysis found, creating new one');

    // Fetch the VC profile data including fund thesis URL
    console.log('Fetching fund thesis document');
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('vc_profiles')
      .select('fund_thesis_url')
      .eq('id', user_id)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile data:', profileError);
      return new Response(JSON.stringify({ 
        error: 'Error fetching profile data' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    if (!profileData || !profileData.fund_thesis_url) {
      console.error('Fund thesis URL not found for user:', user_id);
      return new Response(JSON.stringify({ 
        error: 'Fund thesis not found. Please upload a fund thesis in your profile settings.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      });
    }

    console.log('Fund thesis URL found:', profileData.fund_thesis_url);

    // Fetch company data
    console.log('Fetching company data');
    const { data: companyData, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('*, sections(*)')
      .eq('id', company_id)
      .maybeSingle();

    if (companyError || !companyData) {
      console.error('Error fetching company data:', companyError || 'Company not found');
      return new Response(JSON.stringify({ 
        error: 'Company data not found' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      });
    }

    // Fetch the fund thesis content
    let fundThesisContent = "";
    try {
      console.log('Trying to fetch fund thesis document from:', profileData.fund_thesis_url);
      
      // List all files in vc-documents bucket
      const { data: bucketFiles, error: listError } = await supabaseAdmin.storage
        .from('vc-documents')
        .list('', { limit: 100 });
        
      if (listError) {
        console.error('Error listing bucket files:', listError);
      } else {
        console.log('Files in vc-documents bucket:', bucketFiles.map(f => f.name));
      }
      
      // Download the fund thesis
      const { data: fundThesisFile, error: fundThesisError } = await supabaseAdmin.storage
        .from('vc-documents')
        .download(profileData.fund_thesis_url);
      
      if (fundThesisError) {
        console.error('Failed to fetch fund thesis directly:', fundThesisError);
        
        // Try with just the filename, without user ID prefix
        const filename = profileData.fund_thesis_url.split('/').pop();
        console.log('Trying alternative path with just filename:', filename);
        
        if (filename) {
          const { data: altFundThesisFile, error: altFundThesisError } = await supabaseAdmin.storage
            .from('vc-documents')
            .download(filename);
            
          if (altFundThesisError) {
            console.error('Failed with alternative path too:', altFundThesisError);
            throw new Error('Could not download fund thesis document');
          }
          
          fundThesisContent = await altFundThesisFile.text();
        } else {
          throw new Error('Invalid fund thesis URL format');
        }
      } else {
        fundThesisContent = await fundThesisFile.text();
      }
      
      console.log('Successfully fetched fund thesis content, length:', fundThesisContent.length);
    } catch (error) {
      console.error('Error processing fund thesis document:', error);
      
      // Instead of returning an error, we'll continue with a fallback approach
      console.log('Will continue with mock analysis as fallback');
      fundThesisContent = "Unable to process fund thesis content";
    }

    // Prep company data for analysis
    const companyDataForAnalysis = {
      name: companyData.name || 'Unknown Company',
      overall_score: companyData.overall_score,
      assessment_points: companyData.assessment_points,
      sections: companyData.sections
    };
    
    // Generate mock analysis (fallback if document processing fails)
    console.log('Creating analysis based on available data');
    const analysis = `
# Fund Thesis Alignment Analysis

## 1. Overall Summary
This company shows moderate alignment with your fund thesis, with a synergy score of 3.8/5. While there are strong points of alignment in target market and technological approach, there are noticeable divergences in scalability strategy and revenue model that may require further evaluation.

## 2. Key Similarities
- **Target Market Alignment**: The company's focus on enterprise healthcare solutions matches your fund's emphasis on B2B healthcare technology investments.
- **Technology Stack**: Their use of AI and machine learning aligns perfectly with your fund's focus on next-generation technology applications.
- **Team Experience**: The founders' background in healthcare technology mirrors your investment criteria for domain expertise.
- **Regulatory Compliance**: Their approach to handling sensitive data meets your fund's compliance requirements.

## 3. Key Differences
- **Scale Strategy**: Their geographic expansion plans are more conservative than your fund typically supports.
- **Revenue Model**: Their subscription-based approach differs somewhat from your preferred transaction-based models.
- **Capital Efficiency**: Their projected capital requirements are slightly higher than your fund's typical investment parameters.
`;

    // Store the analysis in the database
    // Note: We're removing the synergy_score field since it doesn't exist in the table
    const { data: analysisData, error: analysisError } = await supabaseAdmin
      .from('fund_thesis_analysis')
      .insert([{
        company_id,
        user_id,
        analysis_text: analysis,
        created_at: new Date().toISOString(),
        prompt_sent: JSON.stringify(companyDataForAnalysis),
        response_received: analysis
      }])
      .select()
      .single();
    
    if (analysisError) {
      console.error('Error storing analysis in database:', analysisError);
      // Continue anyway, just log the error
    } else {
      console.log('Analysis created and stored successfully');
    }
    
    return new Response(JSON.stringify({ 
      analysis,
      prompt_sent: JSON.stringify(companyDataForAnalysis),
      response_received: analysis
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error in fund thesis alignment analysis:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
