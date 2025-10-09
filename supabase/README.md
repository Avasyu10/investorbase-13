# Supabase evaluate-submission sample

This folder contains a sample submission payload, a PowerShell test script, and the migration/function used for automatic evaluation.

Files:

- `sample_submission.json` — sample submission payload to POST to the function
- `test-evaluate-submission.ps1` — PowerShell script that posts the sample payload to your deployed function
- `functions/evaluate-submission/index.ts` — edge function that calls Lovable/Gemini to evaluate and stores results
- `migrations/20251009060000_create_submission_evaluations.sql` — migration to create the `submission_evaluations` table

Quick test (PowerShell):

1. Deploy migration and function to your Supabase project (or use `supabase functions serve` to run locally).
2. Export a valid user access token and the functions base URL into environment variables:

```powershell
$env:SUPABASE_FUNCTION_URL = "https://<your-project>.functions.supabase.co"
$env:USER_ACCESS_TOKEN = "<user_session_access_token>"
```

3. Run the test script from the `supabase` folder:

```powershell
./test-evaluate-submission.ps1
```

Expected outcome: the function will return a JSON response containing `success: true` and an `evaluation` object. The `submission_evaluations` table will contain a row with detailed scores and AI analysis.

If you need help obtaining a user access token or deploying with the Supabase CLI, ask and I will provide exact commands.

## Testing locally: add a sample evaluation row

If you want to see a sample evaluation appear in the UI without calling the AI function, apply the migration that inserts a sample row:

1. Use the Supabase CLI or psql to run the migration file:

```powershell
# from project root
supabase db push --file supabase/migrations/20251009120000_insert_sample_submission_evaluation.sql
```

Or run the SQL directly against your DB:

```powershell
psql "<your database connection string>" -f supabase/migrations/20251009120000_insert_sample_submission_evaluation.sql
```

2. Open the app (dev server) and go to Startup Dashboard → Evaluation History. You should see the sample "Acme Logistics" evaluation.

If you still see the "No evaluations yet" message, ensure the migration applied and your authenticated session is active (the UI will fallback to service function if necessary).

## Batch-evaluate all submissions

You can evaluate all existing startup submissions by invoking the `evaluate-submission` edge function for each row. This is useful to backfill evaluations.

From PowerShell, set env vars and run:

```powershell
$env:SUPABASE_URL = 'https://<project>.supabase.co'
$env:SUPABASE_SERVICE_ROLE_KEY = '<service_role_key>'
pwsh supabase/evaluate_all_submissions.ps1
```

The script will:

- Fetch all rows from `startup_submissions` using the service role key
- For each submission, POST to the function endpoint `/functions/v1/evaluate-submission` with the full submission JSON
- Print success or error for each submission

Note: `evaluate-submission` calls the Lovable/Gemini gateway — you must configure `LOVABLE_API_KEY` in the deployed function environment for the AI calls to work. Locally using the service role key to call functions bypasses RLS but does not change the AI behavior.
