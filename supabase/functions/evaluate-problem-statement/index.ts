import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { startupName, problemStatement, scores } = await req.json();
    
    console.log('Received evaluation request:', { startupName, problemStatement, scores });

    // Get environment variables
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('Error getting user:', userError);
      throw new Error("Unauthorized");
    }

    console.log('User authenticated:', user.id);

    // Calculate average score
    const averageScore = (
      scores.existence + 
      scores.severity + 
      scores.frequency + 
      scores.unmetNeed
    ) / 4;

    console.log('Calculated average score:', averageScore);

    // Call Lovable AI Gateway with Gemini for analysis
    const systemPrompt = `You are an expert startup evaluator. Analyze the following problem statement based on the provided scores and provide:
1. A comprehensive analysis summary (2-3 paragraphs)
2. Specific recommendations for improvement (3-5 bullet points)

Be constructive, specific, and actionable in your feedback.`;

    const userPrompt = `Startup Name: ${startupName}

Problem Statement: ${problemStatement}

Evaluation Scores (out of 20):
- Existence in Market: ${scores.existence}/20
- Severity/Negative Consequences: ${scores.severity}/20
- Frequency/Pervasiveness: ${scores.frequency}/20
- Current Unmet Need/Gap: ${scores.unmetNeed}/20
- Average Score: ${averageScore.toFixed(1)}/20

Provide a detailed analysis and recommendations.`;

    console.log('Calling Lovable AI Gateway...');

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_evaluation",
              description: "Provide structured evaluation feedback",
              parameters: {
                type: "object",
                properties: {
                  analysis_summary: {
                    type: "string",
                    description: "2-3 paragraphs analyzing the problem statement quality based on scores"
                  },
                  recommendations: {
                    type: "string",
                    description: "3-5 specific, actionable recommendations as a formatted list"
                  }
                },
                required: ["analysis_summary", "recommendations"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "provide_evaluation" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limit exceeded. Please try again in a moment." 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ 
          error: "AI credits exhausted. Please add credits to continue." 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI Response received:', JSON.stringify(aiData, null, 2));

    // Extract the tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const functionArgs = toolCall ? JSON.parse(toolCall.function.arguments) : {};

    const analysisSummary = functionArgs.analysis_summary || "Analysis not available";
    const recommendations = functionArgs.recommendations || "Recommendations not available";

    console.log('Parsed AI response:', { analysisSummary, recommendations });

    // Store evaluation in database
    const { data: evaluation, error: dbError } = await supabase
      .from('problem_statement_evaluations')
      .insert({
        startup_name: startupName,
        problem_statement: problemStatement,
        evaluator_user_id: user.id,
        existence_score: scores.existence,
        severity_score: scores.severity,
        frequency_score: scores.frequency,
        unmet_need_score: scores.unmetNeed,
        average_score: averageScore,
        ai_analysis_summary: analysisSummary,
        ai_recommendations: recommendations
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log('Evaluation stored successfully:', evaluation.id);

    return new Response(JSON.stringify({
      success: true,
      evaluation
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in evaluate-problem-statement:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});