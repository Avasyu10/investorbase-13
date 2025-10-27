# Submit Startup Public API Documentation

## Overview
The `submit-startup-public` endpoint allows external systems to submit startup information programmatically using an API key for authentication.

## Authentication
All requests must include a valid API key in the `x-api-key` header.

### Creating an API Key
To create an API key, insert a record into the `api_keys` table:

```sql
INSERT INTO public.api_keys (key_name, api_key, user_id, is_active)
VALUES (
  'My Integration Key',
  'your-secure-random-api-key-here',
  'your-user-uuid',
  true
);
```

**Note:** Generate a secure random string for your API key (e.g., using UUID or a secure random generator).

## Endpoint

**URL:** `https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/submit-startup-public`

**Method:** `POST`

**Content-Type:** `multipart/form-data`

## Headers

| Header | Required | Description |
|--------|----------|-------------|
| `x-api-key` | Yes | Your API key for authentication |
| `Content-Type` | Yes | Must be `multipart/form-data` |

## Request Body (Form Data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `startup_name` | string | Yes | Name of the startup |
| `founder_email` | string | Yes | Founder's email address |
| `problem_statement` | string | Yes | Description of the problem being solved |
| `solution` | string | Yes | Description of the solution |
| `market_understanding` | string | Yes | Market analysis and understanding |
| `customer_understanding` | string | Yes | Target customer analysis |
| `competitive_understanding` | string | Yes | Competitive landscape analysis |
| `unique_selling_proposition` | string | Yes | Unique value proposition |
| `technical_understanding` | string | Yes | Technical approach and capabilities |
| `vision` | string | Yes | Long-term vision for the startup |
| `campus_affiliation` | boolean | No | Whether affiliated with a campus |
| `linkedin_profile_url` | string | No | LinkedIn profile URL |
| `pdfFile` | file | No | PDF file (pitch deck, business plan, etc.) |
| `pptFile` | file | No | PowerPoint presentation file |
| `user_id` | string | No | Associated user UUID (if applicable) |

## Example Requests

### Using cURL

```bash
curl -X POST \
  https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/submit-startup-public \
  -H "x-api-key: your-api-key-here" \
  -F "startup_name=TechStartup Inc" \
  -F "founder_email=founder@techstartup.com" \
  -F "problem_statement=Small businesses struggle with inventory management" \
  -F "solution=AI-powered inventory optimization platform" \
  -F "market_understanding=$5B market, growing at 15% annually" \
  -F "customer_understanding=SMBs with 10-100 employees in retail/e-commerce" \
  -F "competitive_understanding=Competing with legacy systems and manual processes" \
  -F "unique_selling_proposition=Real-time AI predictions with 95% accuracy" \
  -F "technical_understanding=Built on cloud-native architecture with ML models" \
  -F "vision=Become the leading inventory platform for SMBs globally" \
  -F "campus_affiliation=true" \
  -F "linkedin_profile_url=https://linkedin.com/in/founder" \
  -F "pdfFile=@/path/to/pitch-deck.pdf"
```

### Using JavaScript (Fetch API)

```javascript
const formData = new FormData();
formData.append('startup_name', 'TechStartup Inc');
formData.append('founder_email', 'founder@techstartup.com');
formData.append('problem_statement', 'Small businesses struggle with inventory management');
formData.append('solution', 'AI-powered inventory optimization platform');
formData.append('market_understanding', '$5B market, growing at 15% annually');
formData.append('customer_understanding', 'SMBs with 10-100 employees in retail/e-commerce');
formData.append('competitive_understanding', 'Competing with legacy systems and manual processes');
formData.append('unique_selling_proposition', 'Real-time AI predictions with 95% accuracy');
formData.append('technical_understanding', 'Built on cloud-native architecture with ML models');
formData.append('vision', 'Become the leading inventory platform for SMBs globally');
formData.append('campus_affiliation', 'true');
formData.append('linkedin_profile_url', 'https://linkedin.com/in/founder');

// Optional: Add files
const pdfFile = document.getElementById('pdfInput').files[0];
if (pdfFile) {
  formData.append('pdfFile', pdfFile);
}

fetch('https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/submit-startup-public', {
  method: 'POST',
  headers: {
    'x-api-key': 'your-api-key-here'
  },
  body: formData
})
.then(response => response.json())
.then(data => {
  console.log('Success:', data);
})
.catch(error => {
  console.error('Error:', error);
});
```

### Using Python (requests)

```python
import requests

url = 'https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/submit-startup-public'

headers = {
    'x-api-key': 'your-api-key-here'
}

data = {
    'startup_name': 'TechStartup Inc',
    'founder_email': 'founder@techstartup.com',
    'problem_statement': 'Small businesses struggle with inventory management',
    'solution': 'AI-powered inventory optimization platform',
    'market_understanding': '$5B market, growing at 15% annually',
    'customer_understanding': 'SMBs with 10-100 employees in retail/e-commerce',
    'competitive_understanding': 'Competing with legacy systems and manual processes',
    'unique_selling_proposition': 'Real-time AI predictions with 95% accuracy',
    'technical_understanding': 'Built on cloud-native architecture with ML models',
    'vision': 'Become the leading inventory platform for SMBs globally',
    'campus_affiliation': 'true',
    'linkedin_profile_url': 'https://linkedin.com/in/founder'
}

files = {
    'pdfFile': open('/path/to/pitch-deck.pdf', 'rb')
}

response = requests.post(url, headers=headers, data=data, files=files)
print(response.json())
```

### Using Node.js (form-data)

```javascript
const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

const form = new FormData();
form.append('startup_name', 'TechStartup Inc');
form.append('founder_email', 'founder@techstartup.com');
form.append('problem_statement', 'Small businesses struggle with inventory management');
form.append('solution', 'AI-powered inventory optimization platform');
form.append('market_understanding', '$5B market, growing at 15% annually');
form.append('customer_understanding', 'SMBs with 10-100 employees in retail/e-commerce');
form.append('competitive_understanding', 'Competing with legacy systems and manual processes');
form.append('unique_selling_proposition', 'Real-time AI predictions with 95% accuracy');
form.append('technical_understanding', 'Built on cloud-native architecture with ML models');
form.append('vision', 'Become the leading inventory platform for SMBs globally');
form.append('campus_affiliation', 'true');
form.append('linkedin_profile_url', 'https://linkedin.com/in/founder');

// Optional: Add file
form.append('pdfFile', fs.createReadStream('/path/to/pitch-deck.pdf'));

fetch('https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/submit-startup-public', {
  method: 'POST',
  headers: {
    'x-api-key': 'your-api-key-here',
    ...form.getHeaders()
  },
  body: form
})
.then(res => res.json())
.then(data => console.log('Success:', data))
.catch(err => console.error('Error:', err));
```

## Response Format

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "id": "uuid-of-submission",
    "startup_name": "TechStartup Inc",
    "founder_email": "founder@techstartup.com",
    "created_at": "2025-01-01T12:00:00Z",
    ...
  },
  "message": "Startup details submitted successfully"
}
```

### Error Responses

#### Missing API Key (401)
```json
{
  "success": false,
  "error": "API key is required. Please include x-api-key header."
}
```

#### Invalid API Key (401)
```json
{
  "success": false,
  "error": "Invalid or inactive API key."
}
```

#### Validation Error (400)
```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

## Rate Limiting
The API tracks usage count for each API key. Monitor your usage through the `api_keys` table:

```sql
SELECT key_name, usage_count, last_used_at 
FROM public.api_keys 
WHERE user_id = 'your-user-uuid';
```

## Security Best Practices

1. **Keep API keys secure**: Never commit API keys to version control or expose them in client-side code
2. **Rotate keys regularly**: Generate new API keys periodically and deactivate old ones
3. **Use environment variables**: Store API keys in environment variables, not in code
4. **Monitor usage**: Regularly check the `usage_count` to detect unusual activity
5. **Deactivate compromised keys**: If a key is compromised, immediately set `is_active = false`

## Managing API Keys

### List all your API keys
```sql
SELECT id, key_name, is_active, usage_count, last_used_at, created_at
FROM public.api_keys
WHERE user_id = 'your-user-uuid';
```

### Deactivate an API key
```sql
UPDATE public.api_keys
SET is_active = false
WHERE id = 'api-key-uuid' AND user_id = 'your-user-uuid';
```

### Check usage statistics
```sql
SELECT 
  key_name,
  usage_count,
  last_used_at,
  created_at
FROM public.api_keys
WHERE user_id = 'your-user-uuid'
ORDER BY last_used_at DESC;
```
