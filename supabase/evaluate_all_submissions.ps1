# Evaluate all startup submissions by invoking the evaluate-submission edge function for each submission.
# Usage:
#   $env:SUPABASE_URL = 'https://<project>.supabase.co'
#   $env:SUPABASE_SERVICE_ROLE_KEY = '<service_role_key>'
#   pwsh supabase/evaluate_all_submissions.ps1

$SupabaseUrl = $env:SUPABASE_URL
$ServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY
# Credentials for a real user to act as evaluator (provide a test/admin account)
$AdminEmail = $env:SUPABASE_ADMIN_EMAIL
$AdminPassword = $env:SUPABASE_ADMIN_PASSWORD

if (-not $SupabaseUrl -or -not $ServiceRoleKey) {
    Write-Host "Please set environment variables SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running." -ForegroundColor Yellow
    exit 1
}

if (-not $AdminEmail -or -not $AdminPassword) {
    Write-Host "Please also set SUPABASE_ADMIN_EMAIL and SUPABASE_ADMIN_PASSWORD to sign in a user for evaluation (env vars)." -ForegroundColor Yellow
    Write-Host "If you prefer to use the service role as evaluator, rerun with those vars unset and modify the function accordingly." -ForegroundColor Yellow
    exit 1
}

# Fetch all submissions
$subsEndpoint = "$SupabaseUrl/rest/v1/startup_submissions?select=*"
$headers = @{
    "apikey"        = $ServiceRoleKey
    "Authorization" = "Bearer $ServiceRoleKey"
}

try {
    Write-Host "Fetching submissions..."
    $submissions = Invoke-RestMethod -Method Get -Uri $subsEndpoint -Headers $headers -ErrorAction Stop
}
catch {
    Write-Host "Failed to fetch submissions:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

if (-not $submissions -or $submissions.Count -eq 0) {
    Write-Host "No submissions found." -ForegroundColor Yellow
    exit 0
}

# Sign in as the admin/test user to obtain an access token
$authEndpoint = "$SupabaseUrl/auth/v1/token?grant_type=password"
try {
    Write-Host "Signing in as $AdminEmail to obtain access token..."
    $authBody = @{ email = $AdminEmail; password = $AdminPassword } | ConvertTo-Json
    $authHeaders = @{ 'Content-Type' = 'application/json'; 'apikey' = $ServiceRoleKey }
    $authResp = Invoke-RestMethod -Method Post -Uri $authEndpoint -Headers $authHeaders -Body $authBody -ErrorAction Stop
    $accessToken = $authResp.access_token
    if (-not $accessToken) {
        Write-Host "Failed to acquire access token from Supabase Auth response." -ForegroundColor Red
        $authResp | ConvertTo-Json -Depth 5
        exit 1
    }
    Write-Host "Acquired access token for user." -ForegroundColor Green
}
catch {
    Write-Host "Auth sign-in failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $raw = $_.Exception.Response.GetResponseStream() | New-Object System.IO.StreamReader
        Write-Host $raw.ReadToEnd()
    }
    exit 1
}

# For each submission, invoke evaluate-submission function using the user's access token
$functionEndpoint = "$SupabaseUrl/functions/v1/evaluate-submission"

foreach ($s in $submissions) {
    Write-Host "Evaluating submission id:$($s.id) startup:$($s.startup_name) as user $AdminEmail" -ForegroundColor Cyan

    $payload = @{ submission = $s } | ConvertTo-Json -Depth 10
    $fnHeaders = @{
        "Authorization" = "Bearer $accessToken"
        "Content-Type"  = "application/json"
    }

    try {
        $resp = Invoke-RestMethod -Method Post -Uri $functionEndpoint -Headers $fnHeaders -Body $payload -ErrorAction Stop
        Write-Host "Success for submission $($s.id):" -ForegroundColor Green
        $resp | ConvertTo-Json -Depth 5
    }
    catch {
        Write-Host "Function call failed for submission $($s.id):" -ForegroundColor Red
        Write-Host $_.Exception.Message
        if ($_.Exception.Response) {
            $raw = $_.Exception.Response.GetResponseStream() | New-Object System.IO.StreamReader
            Write-Host $raw.ReadToEnd()
        }
    }
}

Write-Host "Done." -ForegroundColor Green
