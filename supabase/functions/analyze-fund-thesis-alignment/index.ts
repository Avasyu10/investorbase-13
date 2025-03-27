
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
    // Get request body
    const { companyId } = await req.json();
    
    if (!companyId) {
      return new Response(
        JSON.stringify({ success: false, error: "Company ID is required" }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Processing fund thesis alignment for company: ${companyId}`);
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get company data
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select(`
        id,
        name,
        overall_score,
        assessment_points,
        sections (
          id,
          type,
          title,
          description,
          score
        )
      `)
      .eq('id', companyId)
      .single();
      
    if (companyError || !company) {
      console.error('Error fetching company data:', companyError);
      return new Response(
        JSON.stringify({ success: false, error: "Company not found" }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }
    
    // Get current user's VC profile
    const { data: { user } } = await supabase.auth.getUser(req.headers.get('Authorization')?.split(' ')[1] || '');
    
    let vcProfile;
    
    if (user) {
      // Try to get VC profile
      const { data: profile, error: profileError } = await supabase
        .from('vc_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
        
      if (!profileError && profile) {
        vcProfile = profile;
      }
    }
    
    // Generate analysis text
    let analysisText = "";
    
    // Default analysis if no VC profile exists
    if (!vcProfile) {
      analysisText = generateDefaultAnalysis(company);
    } else {
      analysisText = generateThesisAnalysis(company, vcProfile);
    }
    
    // Save analysis to database
    const { data: analysis, error: analysisError } = await supabase
      .from('fund_thesis_analysis')
      .insert({
        company_id: companyId,
        user_id: user?.id || null,
        analysis_text: analysisText,
        prompt_sent: "Fund thesis alignment analysis",
        response_received: "Generated fund thesis alignment analysis"
      })
      .select()
      .single();
      
    if (analysisError) {
      console.error('Error saving analysis:', analysisError);
      return new Response(
        JSON.stringify({ 
          success: true, 
          analysisText, 
          error: "Analysis generated but could not be saved" 
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        analysisId: analysis.id,
        analysisText
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in analyze-fund-thesis-alignment function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Generate a default analysis without VC profile
function generateDefaultAnalysis(company: any): string {
  const companyName = company.name;
  const overallScore = parseFloat(company.overall_score);
  
  let analysisText = `# Fund Thesis Alignment Analysis for ${companyName}\n\n`;
  analysisText += `## Investment Overview\n\n`;
  
  // Overall assessment based on score
  analysisText += `${companyName} has an overall assessment score of ${overallScore.toFixed(1)}/5.0, which `;
  
  if (overallScore >= 4.5) {
    analysisText += `indicates an excellent potential investment opportunity.\n\n`;
  } else if (overallScore >= 3.5) {
    analysisText += `suggests a good potential investment opportunity.\n\n`;
  } else if (overallScore >= 2.5) {
    analysisText += `represents an average investment opportunity with some concerns.\n\n`;
  } else if (overallScore >= 1.5) {
    analysisText += `signals a below-average investment opportunity with significant concerns.\n\n`;
  } else {
    analysisText += `represents a high-risk investment with critical issues that need to be addressed.\n\n`;
  }
  
  // Section analysis
  analysisText += `## Section Analysis\n\n`;
  
  const sortedSections = [...company.sections].sort((a: any, b: any) => b.score - a.score);
  
  // Strengths - top scoring sections
  const strengths = sortedSections.filter((section: any) => section.score >= 3.5);
  if (strengths.length > 0) {
    analysisText += `### Strengths\n\n`;
    strengths.forEach((section: any) => {
      analysisText += `- **${section.title}** (${section.score.toFixed(1)}/5.0): ${section.description || 'No description available.'}\n`;
    });
    analysisText += `\n`;
  }
  
  // Concerns - low scoring sections
  const concerns = sortedSections.filter((section: any) => section.score < 2.5);
  if (concerns.length > 0) {
    analysisText += `### Concerns\n\n`;
    concerns.forEach((section: any) => {
      analysisText += `- **${section.title}** (${section.score.toFixed(1)}/5.0): ${section.description || 'No description available.'}\n`;
    });
    analysisText += `\n`;
  }
  
  // No VC profile note
  analysisText += `## Note on Fund Thesis Alignment\n\n`;
  analysisText += `This analysis does not include specific fund thesis alignment because no venture capital profile information is available. To see a personalized alignment analysis, please complete your VC profile with investment criteria.\n\n`;
  
  // Recommendations
  analysisText += `## Investment Recommendations\n\n`;
  
  if (overallScore >= 4.0) {
    analysisText += `Based on the company's strong performance metrics, this opportunity warrants serious consideration for investment, pending due diligence.\n\n`;
  } else if (overallScore >= 3.0) {
    analysisText += `This opportunity shows promise but requires more information in key areas before making an investment decision.\n\n`;
  } else {
    analysisText += `This opportunity has significant gaps that would need to be addressed before it could be considered a viable investment candidate.\n\n`;
  }
  
  return analysisText;
}

// Generate analysis with VC profile alignment
function generateThesisAnalysis(company: any, vcProfile: any): string {
  const companyName = company.name;
  const overallScore = parseFloat(company.overall_score);
  const fundName = vcProfile.fund_name || "Your fund";
  
  let analysisText = `# Fund Thesis Alignment Analysis for ${companyName}\n\n`;
  analysisText += `## Investment Overview\n\n`;
  
  // Overall assessment based on score
  analysisText += `${companyName} has an overall assessment score of ${overallScore.toFixed(1)}/5.0, which `;
  
  if (overallScore >= 4.5) {
    analysisText += `indicates an excellent potential investment opportunity.\n\n`;
  } else if (overallScore >= 3.5) {
    analysisText += `suggests a good potential investment opportunity.\n\n`;
  } else if (overallScore >= 2.5) {
    analysisText += `represents an average investment opportunity with some concerns.\n\n`;
  } else if (overallScore >= 1.5) {
    analysisText += `signals a below-average investment opportunity with significant concerns.\n\n`;
  } else {
    analysisText += `represents a high-risk investment with critical issues that need to be addressed.\n\n`;
  }
  
  // Section analysis
  analysisText += `## Section Analysis\n\n`;
  
  const sortedSections = [...company.sections].sort((a: any, b: any) => b.score - a.score);
  
  // Strengths - top scoring sections
  const strengths = sortedSections.filter((section: any) => section.score >= 3.5);
  if (strengths.length > 0) {
    analysisText += `### Strengths\n\n`;
    strengths.forEach((section: any) => {
      analysisText += `- **${section.title}** (${section.score.toFixed(1)}/5.0): ${section.description || 'No description available.'}\n`;
    });
    analysisText += `\n`;
  }
  
  // Concerns - low scoring sections
  const concerns = sortedSections.filter((section: any) => section.score < 2.5);
  if (concerns.length > 0) {
    analysisText += `### Concerns\n\n`;
    concerns.forEach((section: any) => {
      analysisText += `- **${section.title}** (${section.score.toFixed(1)}/5.0): ${section.description || 'No description available.'}\n`;
    });
    analysisText += `\n`;
  }
  
  // Fund thesis alignment
  analysisText += `## ${fundName} Thesis Alignment\n\n`;
  
  // Get company industry
  let companyIndustry = "Unknown";
  let companyStage = "Unknown";
  
  // Try to get company details
  const sectionTypes = company.sections.map((s: any) => s.type);
  
  // Check if there's a team section for a proxy of company stage
  const hasTeamSection = sectionTypes.includes('TEAM');
  const hasFinancials = sectionTypes.includes('FINANCIALS');
  const hasTraction = sectionTypes.includes('TRACTION');
  
  if (hasTeamSection && hasFinancials && hasTraction) {
    companyStage = "Growth";
  } else if (hasTeamSection && (hasFinancials || hasTraction)) {
    companyStage = "Early";
  } else {
    companyStage = "Seed";
  }
  
  // Check for problem section to get industry proxy
  const problemSection = company.sections.find((s: any) => s.type === 'PROBLEM');
  if (problemSection && problemSection.description) {
    // Extract potential industry based on problem description keywords
    const description = problemSection.description.toLowerCase();
    if (description.includes('health') || description.includes('medical') || description.includes('healthcare')) {
      companyIndustry = "Healthcare";
    } else if (description.includes('finance') || description.includes('banking') || description.includes('payment')) {
      companyIndustry = "Fintech";
    } else if (description.includes('ai') || description.includes('machine learning') || description.includes('data')) {
      companyIndustry = "AI/ML";
    } else if (description.includes('education') || description.includes('learning') || description.includes('student')) {
      companyIndustry = "Education";
    } else if (description.includes('climate') || description.includes('energy') || description.includes('sustainable')) {
      companyIndustry = "CleanTech";
    } else {
      companyIndustry = "Technology";
    }
  }
  
  // Alignment with fund's areas of interest
  if (vcProfile.areas_of_interest && vcProfile.areas_of_interest.length > 0) {
    analysisText += `### Industry Alignment\n\n`;
    const industryAligned = vcProfile.areas_of_interest.some((area: string) => 
      companyIndustry.toLowerCase().includes(area.toLowerCase()) || 
      area.toLowerCase().includes(companyIndustry.toLowerCase())
    );
    
    if (industryAligned) {
      analysisText += `✅ **Industry Match**: ${companyName}'s focus on ${companyIndustry} aligns with your fund's interest in ${vcProfile.areas_of_interest.join(', ')}.\n\n`;
    } else {
      analysisText += `❌ **Industry Mismatch**: ${companyName}'s focus on ${companyIndustry} does not clearly align with your fund's stated areas of interest: ${vcProfile.areas_of_interest.join(', ')}.\n\n`;
    }
  }
  
  // Alignment with investment stage
  if (vcProfile.investment_stage && vcProfile.investment_stage.length > 0) {
    analysisText += `### Investment Stage Alignment\n\n`;
    const stageAligned = vcProfile.investment_stage.some((stage: string) => 
      companyStage.toLowerCase().includes(stage.toLowerCase()) || 
      stage.toLowerCase().includes(companyStage.toLowerCase())
    );
    
    if (stageAligned) {
      analysisText += `✅ **Stage Match**: ${companyName} appears to be at the ${companyStage} stage, which aligns with your fund's focus on ${vcProfile.investment_stage.join(', ')} stage investments.\n\n`;
    } else {
      analysisText += `❌ **Stage Mismatch**: ${companyName} appears to be at the ${companyStage} stage, which may not align with your fund's focus on ${vcProfile.investment_stage.join(', ')} stage investments.\n\n`;
    }
  }
  
  // Overall alignment
  let alignmentScore = 0;
  let totalFactors = 0;
  
  if (vcProfile.areas_of_interest && vcProfile.areas_of_interest.length > 0) {
    totalFactors++;
    if (vcProfile.areas_of_interest.some((area: string) => 
      companyIndustry.toLowerCase().includes(area.toLowerCase()) || 
      area.toLowerCase().includes(companyIndustry.toLowerCase())
    )) {
      alignmentScore++;
    }
  }
  
  if (vcProfile.investment_stage && vcProfile.investment_stage.length > 0) {
    totalFactors++;
    if (vcProfile.investment_stage.some((stage: string) => 
      companyStage.toLowerCase().includes(stage.toLowerCase()) || 
      stage.toLowerCase().includes(companyStage.toLowerCase())
    )) {
      alignmentScore++;
    }
  }
  
  // Add company quality factor
  totalFactors++;
  if (overallScore >= 3.5) {
    alignmentScore++;
  }
  
  const alignmentPercentage = totalFactors > 0 ? (alignmentScore / totalFactors) * 100 : 0;
  
  analysisText += `### Overall Thesis Alignment\n\n`;
  
  if (alignmentPercentage >= 80) {
    analysisText += `🔍 **Strong Alignment (${alignmentPercentage.toFixed(0)}%)**: ${companyName} shows strong alignment with ${fundName}'s investment thesis in terms of industry focus, stage, and quality metrics.\n\n`;
  } else if (alignmentPercentage >= 50) {
    analysisText += `🔍 **Moderate Alignment (${alignmentPercentage.toFixed(0)}%)**: ${companyName} shows moderate alignment with ${fundName}'s investment thesis, with some factors matching and others requiring further consideration.\n\n`;
  } else {
    analysisText += `🔍 **Low Alignment (${alignmentPercentage.toFixed(0)}%)**: ${companyName} shows limited alignment with ${fundName}'s investment thesis. This opportunity may be outside your fund's core strategy.\n\n`;
  }
  
  // Recommendations
  analysisText += `## Investment Recommendations\n\n`;
  
  if (alignmentPercentage >= 70 && overallScore >= 3.5) {
    analysisText += `Based on the strong alignment with your investment thesis and the company's solid performance metrics, this opportunity warrants serious consideration for investment, pending due diligence.\n\n`;
  } else if (alignmentPercentage >= 50 || overallScore >= 3.0) {
    analysisText += `This opportunity shows promise but requires more information in key areas before making an investment decision. Consider requesting additional details on ${concerns.length > 0 ? concerns.map((c: any) => c.title).join(', ') : 'critical aspects'}.\n\n`;
  } else {
    analysisText += `This opportunity has significant gaps in alignment with your investment thesis and/or performance metrics. It would be outside your typical investment parameters.\n\n`;
  }
  
  return analysisText;
}
