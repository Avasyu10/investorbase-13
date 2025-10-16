import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubmissionEvaluation {
  id: string;
  startup_name: string;
  overall_average: number | null;
  ai_analysis_summary: string | null;
  ai_recommendations: string | null;
  [key: string]: any;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { companyId } = await req.json();

    if (!companyId) {
      throw new Error('Company ID is required');
    }

    console.log('Enriching company data for:', companyId);

    // Get company data
    const { data: company, error: companyError } = await supabaseClient
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (companyError) throw companyError;

    console.log('Company found:', company.name);

    // Check if already enriched
    if (company.response_received && company.response_received !== 'null') {
      console.log('Company already enriched');
      return new Response(
        JSON.stringify({ message: 'Company already enriched', company }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find related startup submission
    const { data: submissions } = await supabaseClient
      .from('startup_submissions')
      .select('*')
      .eq('startup_name', company.name)
      .eq('user_id', company.user_id);

    let submission = submissions?.[0];

    // Also try by email if no submission found by name
    if (!submission && company.email) {
      const { data: emailSubmissions } = await supabaseClient
        .from('startup_submissions')
        .select('*')
        .eq('founder_email', company.email)
        .eq('user_id', company.user_id);
      
      submission = emailSubmissions?.[0];
    }

    if (!submission) {
      console.log('No submission found for company');
      return new Response(
        JSON.stringify({ message: 'No submission found', company }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Submission found:', submission.id);

    // Find evaluation
    const { data: evaluations } = await supabaseClient
      .from('submission_evaluations')
      .select('*')
      .eq('startup_name', company.name);

    const evaluation = evaluations?.[0] as SubmissionEvaluation | undefined;

    console.log('Evaluation found:', evaluation?.id || 'none');

    // Prepare enriched data
    const assessmentPoints: string[] = [];
    
    if (submission.problem_statement) {
      assessmentPoints.push(`Problem: ${submission.problem_statement}`);
    }
    if (submission.solution) {
      assessmentPoints.push(`Solution: ${submission.solution}`);
    }
    if (submission.market_understanding) {
      assessmentPoints.push(`Market: ${submission.market_understanding}`);
    }
    if (evaluation?.ai_analysis_summary) {
      assessmentPoints.push(`AI Analysis: ${evaluation.ai_analysis_summary}`);
    }

    const responseData = {
      submission: submission,
      evaluation: evaluation || null,
      source: 'startup_submission',
      submission_id: submission.id,
      enriched_at: new Date().toISOString(),
    };

    // Update company with enriched data
    const { data: updatedCompany, error: updateError } = await supabaseClient
      .from('companies')
      .update({
        response_received: JSON.stringify(responseData),
        assessment_points: assessmentPoints,
        overall_score: evaluation?.overall_average || company.overall_score,
      })
      .eq('id', companyId)
      .select()
      .single();

    if (updateError) throw updateError;

    console.log('Company enriched successfully');

    return new Response(
      JSON.stringify({ 
        message: 'Company enriched successfully', 
        company: updatedCompany 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error enriching company:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});