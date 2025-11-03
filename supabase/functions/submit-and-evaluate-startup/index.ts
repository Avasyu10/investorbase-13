import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema matching the startup submission form exactly
interface StartupSubmissionInput {
  startup_name: string;
  founder_email: string;
  linkedin_profile_url?: string;
  problem_statement: string;
  solution: string;
  market_understanding: string;
  customer_understanding: string;
  competitive_understanding: string;
  unique_selling_proposition: string;
  technical_understanding: string;
  vision: string;
  campus_affiliation?: boolean;
}

function validateSubmission(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Required fields
  if (!data.startup_name || typeof data.startup_name !== 'string' || data.startup_name.trim().length === 0) {
    errors.push('startup_name is required and must be a non-empty string');
  }
  
  if (!data.founder_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.founder_email)) {
    errors.push('founder_email is required and must be a valid email address');
  }
  
  const requiredFields = [
    'problem_statement',
    'solution',
    'market_understanding',
    'customer_understanding',
    'competitive_understanding',
    'unique_selling_proposition',
    'technical_understanding',
    'vision'
  ];
  
  requiredFields.forEach(field => {
    if (!data[field] || typeof data[field] !== 'string' || data[field].trim().length === 0) {
      errors.push(`${field} is required and must be a non-empty string`);
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

    // Insert submission into database with exact form field names
    const { data: submission, error: insertError } = await supabase
      .from('startup_submissions')
      .insert({
        startup_name: submissionData.startup_name?.trim() || '',
        founder_email: submissionData.founder_email?.trim() || '',
        linkedin_profile_url: submissionData.linkedin_profile_url?.trim() || null,
        problem_statement: submissionData.problem_statement?.trim() || '',
        solution: submissionData.solution?.trim() || '',
        market_understanding: submissionData.market_understanding?.trim() || '',
        customer_understanding: submissionData.customer_understanding?.trim() || '',
        competitive_understanding: submissionData.competitive_understanding?.trim() || '',
        unique_selling_proposition: submissionData.unique_selling_proposition?.trim() || '',
        technical_understanding: submissionData.technical_understanding?.trim() || '',
        vision: submissionData.vision?.trim() || '',
        campus_affiliation: submissionData.campus_affiliation || false,
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

    // Trigger evaluation using the same edge function as the form
    console.log('Triggering evaluation for submission:', submission.id);
    
    try {
      const { data: evaluationData, error: evalError } = await supabase.functions.invoke(
        'evaluate-submission',
        {
          body: {
            submissionId: submission.id,
            submission: submission
          }
        }
      );

      if (evalError) {
        console.error('Error triggering evaluation:', evalError);
        return new Response(
          JSON.stringify({
            success: true,
            submission_id: submission.id,
            startup_name: submission.startup_name,
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
          startup_name: submission.startup_name,
          message: 'Submission created successfully, evaluation will be processed automatically'
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