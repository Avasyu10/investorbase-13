# Insert sample submission_evaluation row into Supabase using the service role key
# Usage:
#   $env:SUPABASE_URL = 'https://<project>.supabase.co'
#   $env:SUPABASE_SERVICE_ROLE_KEY = '<service_role_key>'
#   pwsh supabase/insert_sample_evaluation.ps1

$SupabaseUrl = $env:SUPABASE_URL
$ServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $SupabaseUrl -or -not $ServiceRoleKey) {
    Write-Host "Please set environment variables SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running." -ForegroundColor Yellow
    exit 1
}

$endpoint = "$SupabaseUrl/rest/v1/submission_evaluations"

$body = @{
    id                                 = '00000000-0000-0000-0000-000000000100'
    startup_submission_id              = '00000000-0000-0000-0000-000000000001'
    startup_name                       = 'Acme Logistics'
    problem_statement                  = 'Small retailers have trouble getting same-day restock due to inefficient local courier networks and no real-time inventory syncing between suppliers and stores.'
    evaluator_user_id                  = '00000000-0000-0000-0000-000000000010'
    existence_score                    = 16
    severity_score                     = 14
    frequency_score                    = 15
    unmet_need_score                   = 14
    direct_fit_score                   = 15
    differentiation_score              = 13
    feasibility_score                  = 14
    effectiveness_score                = 14
    market_size_score                  = 16
    growth_trajectory_score            = 14
    timing_readiness_score             = 13
    external_catalysts_score           = 12
    first_customers_score              = 14
    accessibility_score                = 15
    acquisition_approach_score         = 13
    pain_recognition_score             = 14
    direct_competitors_score           = 12
    substitutes_score                  = 11
    differentiation_vs_players_score   = 13
    dynamics_score                     = 12
    usp_clarity_score                  = 15
    usp_differentiation_strength_score = 14
    usp_defensibility_score            = 12
    usp_alignment_score                = 14
    tech_vision_ambition_score         = 17
    tech_coherence_score               = 15
    tech_alignment_score               = 16
    tech_realism_score                 = 13
    tech_feasibility_score             = 14
    tech_components_score              = 13
    tech_complexity_awareness_score    = 12
    tech_roadmap_score                 = 13
    overall_average                    = 14.2
    ai_analysis_summary                = 'AI analysis: The problem is well-defined with clear market signals; routing and batching show promise but driver onboarding and supply-side integration are execution risks.'
    ai_recommendations                 = '1) Pilot with 10 high-volume retailers to validate reorder frequency;\n2) Build supplier adapters for the top 3 POS systems;\n3) Design incentives for drivers to accept micro-routing;\n4) Measure dead-mile reduction in pilots;\n5) Prepare for local regulatory considerations.'
    created_at                         = (Get-Date).ToString("o")
} | ConvertTo-Json -Depth 5

$headers = @{
    "apikey"        = $ServiceRoleKey
    "Authorization" = "Bearer $ServiceRoleKey"
    "Content-Type"  = "application/json"
    "Prefer"        = "return=representation"
}

try {
    $response = Invoke-RestMethod -Method Post -Uri $endpoint -Headers $headers -Body $body -ErrorAction Stop
    Write-Host "Inserted sample evaluation:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5
}
catch {
    Write-Host "Failed to insert sample evaluation:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $raw = $_.Exception.Response.GetResponseStream() | New-Object System.IO.StreamReader
        Write-Host $raw.ReadToEnd()
    }
    exit 1
}
