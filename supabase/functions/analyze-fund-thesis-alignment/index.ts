
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "./cors.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the service role key (for admin access)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the user from the auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }
    
    // Get the request body
    const { companyId } = await req.json();
    
    if (!companyId) {
      throw new Error('Company ID is required');
    }
    
    console.log(`Processing fund thesis alignment for company ${companyId}`);
    
    // Get company details
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('name, assessment_points')
      .eq('id', companyId)
      .single();
      
    if (companyError || !company) {
      throw new Error(`Company not found: ${companyError?.message || 'Unknown error'}`);
    }
    
    // Get the user's fund thesis document
    const { data: fundThesisData, error: fundThesisError } = await supabase
      .from('vc_documents')
      .select('id, content')
      .eq('user_id', user.id)
      .eq('document_type', 'fund_thesis')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (fundThesisError || !fundThesisData) {
      throw new Error(`Fund thesis not found: ${fundThesisError?.message || 'No fund thesis document available'}`);
    }
    
    // Prepare the analysis data
    const analysisData = {
      company_id: companyId,
      user_id: user.id,
      thesis_document_id: fundThesisData.id,
      prompt_sent: `Analyze how well ${company.name} aligns with the following fund thesis: ${fundThesisData.content}. 
        Company assessment points: ${company.assessment_points ? JSON.stringify(company.assessment_points) : '[]'}`,
      analysis_text: '',
      alignment_score: 0,
      alignment_reasons: [],
      fund_perspective_strengths: [],
      fund_perspective_weaknesses: [],
      opportunity_fit: '',
      recommendation: ''
    };
    
    // Create a record in the fund_thesis_analysis table
    const { data: analysisRecord, error: analysisError } = await supabase
      .from('fund_thesis_analysis')
      .insert(analysisData)
      .select()
      .single();
      
    if (analysisError) {
      throw new Error(`Failed to create analysis record: ${analysisError.message}`);
    }
    
    // In a real implementation, you would call an AI service like OpenAI here
    // For now, let's create a mock response with a 3-second delay to simulate AI processing
    setTimeout(async () => {
      const mockAnalysis = {
        alignment_score: 3.8,
        alignment_reasons: [
          "The company's focus on AI-driven solutions aligns with your investment thesis on technological innovation.",
          "Their target market matches your focus on B2B enterprise software.",
          "Their current stage is appropriate for your investment strategy."
        ],
        fund_perspective_strengths: [
          "Strong technical team with domain expertise",
          "Solving a high-value problem in a growing market",
          "Scalable business model with recurring revenue potential"
        ],
        fund_perspective_weaknesses: [
          "Limited traction compared to competitors",
          "Higher capital requirements than typical investments",
          "Regulatory challenges in target markets"
        ],
        opportunity_fit: "Medium-High",
        recommendation: "Consider for further due diligence with focus on market adoption strategy and competitive positioning.",
        analysis_text: `After analyzing ${company.name} against your fund thesis, I've found several points of alignment and some potential concerns.

The company's focus on AI-driven enterprise solutions aligns well with your stated investment focus on technological innovation and B2B software. Their target market of mid to large enterprises also matches your preferred customer segment.

From a technology perspective, they demonstrate strong innovation and IP potential, which your thesis emphasizes as a key criterion. The founding team has relevant domain expertise and prior startup experience, checking another important box in your investment criteria.

However, their current traction metrics are somewhat below the benchmarks you typically look for in companies at this stage, and their capital efficiency metrics suggest higher ongoing investment needs than your typical portfolio company.

The regulatory landscape in their target markets presents some challenges that might extend their time to market, though these are navigable with proper resources and guidance.

Overall, this represents a medium to high fit with your investment thesis, with specific areas to explore further during due diligence.`
      };
      
      // Update the analysis record with the mock response
      await supabase
        .from('fund_thesis_analysis')
        .update({
          analysis_text: mockAnalysis.analysis_text,
          alignment_score: mockAnalysis.alignment_score,
          alignment_reasons: mockAnalysis.alignment_reasons,
          fund_perspective_strengths: mockAnalysis.fund_perspective_strengths,
          fund_perspective_weaknesses: mockAnalysis.fund_perspective_weaknesses,
          opportunity_fit: mockAnalysis.opportunity_fit,
          recommendation: mockAnalysis.recommendation,
          response_received: new Date().toISOString()
        })
        .eq('id', analysisRecord.id);
        
    }, 3000);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Fund thesis alignment analysis initiated',
        analysisId: analysisRecord.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in analyze-fund-thesis-alignment:', error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
