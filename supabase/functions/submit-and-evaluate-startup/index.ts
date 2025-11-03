import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
interface StartupSubmissionInput {
  startup_name: string;
  founder_name?: string;
  founder_email?: string;
  problem_statement?: string;
  solution?: string;
  target_audience?: string;
  market_size?: string;
  competitors?: string;
  unique_value_proposition?: string;
  revenue_model?: string;
  team_members?: string;
  team_experience?: string;
  traction?: string;
  customer_validation?: string;
  growth_metrics?: string;
  funding_amount?: string;
  website?: string;
  stage?: string;
  industry?: string;
}

function validateSubmission(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Required fields
  if (!data.startup_name || typeof data.startup_name !== 'string' || data.startup_name.trim().length === 0) {
    errors.push('startup_name is required and must be a non-empty string');
  }
  if (data.startup_name && data.startup_name.length > 200) {
    errors.push('startup_name must be less than 200 characters');
  }
  
  // Optional field validations
  if (data.founder_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.founder_email)) {
    errors.push('founder_email must be a valid email address');
  }
  
  // String length validations
  const stringFields = [
    'founder_name', 'problem_statement', 'solution', 'target_audience',
    'market_size', 'competitors', 'unique_value_proposition', 'revenue_model',
    'team_members', 'team_experience', 'traction', 'customer_validation',
    'growth_metrics', 'website', 'stage', 'industry'
  ];
  
  stringFields.forEach(field => {
    if (data[field] && typeof data[field] !== 'string') {
      errors.push(`${field} must be a string`);
    }
    if (data[field] && data[field].length > 5000) {
      errors.push(`${field} must be less than 5000 characters`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse and validate input
    const submissionData: StartupSubmissionInput = await req.json();
    
    console.log('Received submission for:', submissionData.startup_name);
    
    // Validate input
    const validation = validateSubmission(submissionData);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ 
          error: 'Validation failed', 
          details: validation.errors 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Insert submission into database
    const { data: submission, error: insertError } = await supabase
      .from('startup_submissions')
      .insert({
        startup_name: submissionData.startup_name.trim(),
        founder_name: submissionData.founder_name?.trim(),
        founder_email: submissionData.founder_email?.trim(),
        problem_statement: submissionData.problem_statement?.trim(),
        solution: submissionData.solution?.trim(),
        target_audience: submissionData.target_audience?.trim(),
        market_size: submissionData.market_size?.trim(),
        competitors: submissionData.competitors?.trim(),
        unique_value_proposition: submissionData.unique_value_proposition?.trim(),
        revenue_model: submissionData.revenue_model?.trim(),
        team_members: submissionData.team_members?.trim(),
        team_experience: submissionData.team_experience?.trim(),
        traction: submissionData.traction?.trim(),
        customer_validation: submissionData.customer_validation?.trim(),
        growth_metrics: submissionData.growth_metrics?.trim(),
        funding_amount: submissionData.funding_amount?.trim(),
        website: submissionData.website?.trim(),
        stage: submissionData.stage?.trim() || 'Early Stage',
        industry: submissionData.industry?.trim(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting submission:', insertError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create submission', 
          details: insertError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Submission created with ID:', submission.id);

    // Trigger evaluation
    console.log('Triggering evaluation for submission:', submission.id);
    
    try {
      const { data: evaluationData, error: evalError } = await supabase.functions.invoke(
        'evaluate-submission',
        {
          body: {
            submissionId: submission.id,
            startupName: submission.startup_name,
          }
        }
      );

      if (evalError) {
        console.error('Error triggering evaluation:', evalError);
        // Don't fail the request, just log the error
        return new Response(
          JSON.stringify({
            success: true,
            submission_id: submission.id,
            message: 'Submission created successfully, but evaluation failed to start',
            evaluation_error: evalError.message
          }),
          { 
            status: 201, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('Evaluation triggered successfully');

      return new Response(
        JSON.stringify({
          success: true,
          submission_id: submission.id,
          startup_name: submission.startup_name,
          message: 'Submission created and evaluation started',
          evaluation_status: 'processing'
        }),
        { 
          status: 201, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (evalError) {
      console.error('Exception during evaluation trigger:', evalError);
      
      return new Response(
        JSON.stringify({
          success: true,
          submission_id: submission.id,
          message: 'Submission created successfully',
          note: 'Evaluation will be processed automatically'
        }),
        { 
          status: 201, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in submit-and-evaluate-startup:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
