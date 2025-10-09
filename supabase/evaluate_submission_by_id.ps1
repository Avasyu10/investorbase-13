<#
Evaluate a single submission by id or startup_name.
Usage:
  $env:SUPABASE_URL = 'https://<project>.supabase.co'
  $env:SUPABASE_SERVICE_ROLE_KEY = '<service_role_key>'
  $env:SUPABASE_ADMIN_EMAIL = 'test+evaluator@example.com'
  $env:SUPABASE_ADMIN_PASSWORD = 'password'
  pwsh supabase/evaluate_submission_by_id.ps1 -id <submission-id>

Or by name:
  pwsh supabase/evaluate_submission_by_id.ps1 -name 'LexBot AI'
#>
param(
  [string]$id,
  [string]$name,
  [string]$serviceRoleKey
)

# If a repo .env exists (resolve relative to the script path), try to load common variables from it
# so the user doesn't need to re-type them. This ensures the script works when run from other CWDs.
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
try {
  $repoRoot = Resolve-Path (Join-Path $scriptRoot '..') -ErrorAction Stop
  $envFile = Join-Path -Path $repoRoot -ChildPath '.env'
} catch {
  # fallback to script folder
  $envFile = Join-Path -Path $scriptRoot -ChildPath '..\.env'
}

if (Test-Path $envFile) {
  try {
    Get-Content $envFile | ForEach-Object {
      $line = $_.Trim()
      if ($line -and -not $line.StartsWith('#')) {
        $parts = $line -split '=' , 2
        if ($parts.Count -eq 2) {
          $k = $parts[0].Trim().Trim('"')
          $v = $parts[1].Trim().Trim('"')
          switch -Wildcard ($k) {
            'VITE_SUPABASE_URL' { if (-not $env:SUPABASE_URL) { $env:SUPABASE_URL = $v } }
            'SUPABASE_URL' { if (-not $env:SUPABASE_URL) { $env:SUPABASE_URL = $v } }
            'VITE_SUPABASE_PUBLISHABLE_KEY' { if (-not $env:SUPABASE_PUBLISHABLE_KEY) { $env:VITE_SUPABASE_PUBLISHABLE_KEY = $v } }
            default { }
          }
        }
      }
    }
  } catch {
    Write-Host "Warning: failed to parse .env file: $($_.Exception.Message)" -ForegroundColor Yellow
  }
}


$SupabaseUrl = $env:SUPABASE_URL
$ServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY
if ($serviceRoleKey) {
  # If the user passed the key as a CLI param, prefer it
  $ServiceRoleKey = $serviceRoleKey
}
$AdminEmail = $env:SUPABASE_ADMIN_EMAIL
$AdminPassword = $env:SUPABASE_ADMIN_PASSWORD

if (-not $SupabaseUrl) {
  Write-Host "Please set SUPABASE_URL in the environment. I attempted to read ./\.env but no SUPABASE_URL was found." -ForegroundColor Yellow
  exit 1
}

if (-not $ServiceRoleKey) {
  Write-Host "SUPABASE_SERVICE_ROLE_KEY is missing. This script needs the service role key to fetch submissions and call the evaluate function." -ForegroundColor Yellow
  Write-Host "You can provide it inline (quickest) or set it in your session. Example (replace <KEY> and <Startup Name>):" -ForegroundColor Yellow
  Write-Host "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \"$env:SUPABASE_SERVICE_ROLE_KEY='<KEY>'; .\\supabase\\evaluate_submission_by_id.ps1 -name 'LexBot AI'\"" -ForegroundColor Cyan
  Write-Host "Or set it in the current session and re-run:" -ForegroundColor Yellow
  Write-Host "    $env:SUPABASE_SERVICE_ROLE_KEY='<KEY>'" -ForegroundColor Cyan
  exit 1
}

if (-not $AdminEmail -or -not $AdminPassword) {
  Write-Host "Admin signin credentials not found in the environment. The script will attempt to use the service role key directly to invoke the function and query evaluations." -ForegroundColor Yellow
  Write-Host "If you need the script to sign in as a user instead, set SUPABASE_ADMIN_EMAIL and SUPABASE_ADMIN_PASSWORD in the environment before running." -ForegroundColor Yellow
}

$headersService = @{ apikey = $ServiceRoleKey; Authorization = "Bearer $ServiceRoleKey" }

# Fetch submission
if ($id) {
  $subEndpoint = "$SupabaseUrl/rest/v1/startup_submissions?id=eq.$id&select=*"
} elseif ($name) {
  $encoded = [uri]::EscapeDataString($name)
  $subEndpoint = "$SupabaseUrl/rest/v1/startup_submissions?select=*&startup_name=eq.$encoded"
} else {
  Write-Host "Either -id or -name must be provided." -ForegroundColor Yellow
  exit 1
}

try {
  $subs = Invoke-RestMethod -Method Get -Uri $subEndpoint -Headers $headersService -ErrorAction Stop
  if (-not $subs -or $subs.Count -eq 0) {
    Write-Host "No submission found for the given identifier." -ForegroundColor Yellow
    exit 1
  }
  $submission = $subs[0]
  Write-Host "Found submission: $($submission.id) - $($submission.startup_name)" -ForegroundColor Green
} catch {
  Write-Host "Failed to fetch submission:" -ForegroundColor Red
  Write-Host $_.Exception.Message
  exit 1
}

# Sign in as admin to get user token
$authEndpoint = "$SupabaseUrl/auth/v1/token?grant_type=password"
try {
  $authBody = @{ email = $AdminEmail; password = $AdminPassword } | ConvertTo-Json
  $authHeaders = @{ 'Content-Type' = 'application/json'; apikey = $ServiceRoleKey }
  $authResp = Invoke-RestMethod -Method Post -Uri $authEndpoint -Headers $authHeaders -Body $authBody -ErrorAction Stop
  $accessToken = $authResp.access_token
  if (-not $accessToken) { Write-Host "Failed to get access token" -ForegroundColor Red; exit 1 }
  Write-Host "Acquired access token for $AdminEmail" -ForegroundColor Green
} catch {
  Write-Host "Auth failed:" -ForegroundColor Red
  Write-Host $_.Exception.Message
  exit 1
}

# Call evaluate-submission function
$functionEndpoint = "$SupabaseUrl/functions/v1/evaluate-submission"
$fnHeaders = @{ Authorization = "Bearer $accessToken"; 'Content-Type' = 'application/json' }
$payload = @{ submission = $submission } | ConvertTo-Json -Depth 10

try {
  Write-Host "Invoking evaluate-submission for $($submission.id)..."
  $resp = Invoke-RestMethod -Method Post -Uri $functionEndpoint -Headers $fnHeaders -Body $payload -ErrorAction Stop
  Write-Host "Function response:" -ForegroundColor Green
  $resp | ConvertTo-Json -Depth 5
} catch {
  Write-Host "Function invocation failed:" -ForegroundColor Red
  Write-Host $_.Exception.Message
  if ($_.Exception.Response) {
    $raw = $_.Exception.Response.GetResponseStream() | New-Object System.IO.StreamReader
    Write-Host $raw.ReadToEnd()
  }
  exit 1
}

# Optionally fetch the inserted evaluation row
try {
  $evalsEndpoint = "$SupabaseUrl/rest/v1/submission_evaluations?select=*&startup_submission_id=eq.$($submission.id)"
  $evals = Invoke-RestMethod -Method Get -Uri $evalsEndpoint -Headers $headersService -ErrorAction Stop
  if ($evals) {
    Write-Host "Found evaluations for submission:" -ForegroundColor Green
    $evals | ConvertTo-Json -Depth 10
  } else {
    Write-Host "No evaluations found after function call." -ForegroundColor Yellow
  }
} catch {
  Write-Host "Failed to query submission_evaluations:" -ForegroundColor Yellow
  Write-Host $_.Exception.Message
}
