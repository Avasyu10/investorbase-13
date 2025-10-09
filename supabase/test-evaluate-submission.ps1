<#
Simple PowerShell script to POST sample_submission.json to the evaluate-submission function.
Set the following environment vars before running:
  $env:SUPABASE_FUNCTION_URL - base functions URL, e.g. https://<project>.functions.supabase.co
  $env:USER_ACCESS_TOKEN - a logged-in Supabase user access token (Bearer)
  $env:LOVABLE_API_KEY and service keys are required server-side in the deployed function.
#>

$functionRoot = $env:SUPABASE_FUNCTION_URL
if (-not $functionRoot) { Write-Error "Please set SUPABASE_FUNCTION_URL environment variable."; exit 1 }
$token = $env:USER_ACCESS_TOKEN
if (-not $token) { Write-Error "Please set USER_ACCESS_TOKEN environment variable."; exit 1 }

$functionUrl = "$functionRoot/evaluate-submission"
$body = Get-Content -Raw -Path "$(Split-Path -Path $MyInvocation.MyCommand.Path -Parent)\sample_submission.json"

Write-Host "Posting to $functionUrl ..."

try {
    $resp = Invoke-RestMethod -Method Post -Uri $functionUrl -Headers @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' } -Body $body -ErrorAction Stop
    Write-Host "Response:" -ForegroundColor Green
    $resp | ConvertTo-Json -Depth 5
}
catch {
    Write-Host "Error calling function:" -ForegroundColor Red
    $_ | Format-List -Force
}
