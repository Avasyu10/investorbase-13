
// detailsExtraction.ts
// Extracts detailed company information from a PDF

export interface CompanyDetails {
  website?: string;
  industry?: string;
  stage?: string;
  introduction?: string;
}

export async function extractCompanyDetails(pdfBase64: string, apiKey: string): Promise<CompanyDetails> {
  try {
    console.log("Starting company details extraction...");
    
    const prompt = `
I need you to extract specific details about a company from this pitch deck. 
Please respond in JSON format with ONLY the following fields:

1. "website": Extract the company's website URL if found (just the domain, no http/www prefix)
2. "industry": Categorize the company into ONE of these industries (pick the most relevant):
   - SaaS
   - Fintech
   - Healthcare
   - E-commerce
   - AI/ML
   - Blockchain/Crypto
   - Gaming
   - Education
   - Real Estate
   - Green Tech/Sustainability
   - Consumer Products
   - Manufacturing
   - Transportation/Logistics
   - Food & Beverage
   - Media & Entertainment
   - Travel & Hospitality
   - MarTech
   - Biotech
   - Hardware
   - Cybersecurity
   - B2B Services
   - B2C Services
   - IoT
   - Legal Tech
   - Construction Tech
   - Agriculture Tech
   - Energy
   - Social Media
   - HR Tech
   - InsurTech
   - Other (only if nothing else fits)

3. "stage": Identify the company's funding stage using ONE of these terms:
   - Pre-Seed
   - Seed
   - Series A
   - Series B
   - Series C
   - Series D+
   - Growth
   - Public
   - Bootstrapped
   - Unknown

4. "introduction": Write one clear, concise paragraph introducing the company, its value proposition, and what problem it solves. Max 500 characters.

If a field cannot be determined from the pitch deck, use "Unknown" for that field (except for introduction, where you should make a best effort).
`;

    // Make a request to Google Gemini API
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + apiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const errorResponse = await response.json();
      console.error('Gemini API Error:', errorResponse);
      throw new Error(`Gemini API returned error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract the text from the response
    if (!data.candidates || data.candidates.length === 0) {
      console.warn("Empty response from Gemini API");
      return {
        website: "Unknown",
        industry: "Unknown",
        stage: "Unknown",
        introduction: "Could not extract company information."
      };
    }
    
    const responseText = data.candidates[0].content.parts[0].text;
    console.log("Raw Gemini response:", responseText);
    
    // Parse the JSON response
    try {
      // Extract JSON from the response text (in case it's wrapped in markdown code blocks)
      const jsonRegex = /{[\s\S]*}/;
      const jsonMatch = responseText.match(jsonRegex);
      
      let parsedResponse;
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        // If no JSON found, try to parse the whole response
        parsedResponse = JSON.parse(responseText);
      }
      
      // Process and return the details
      return {
        website: parsedResponse.website || "Unknown",
        industry: parsedResponse.industry || "Unknown",
        stage: parsedResponse.stage || "Unknown",
        introduction: parsedResponse.introduction || "No information available."
      };
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError, "Raw text:", responseText);
      
      // Attempt to extract information using regex as fallback
      const website = responseText.match(/website["']?\s*:\s*["']([^"']+)["']/i)?.[1] || "Unknown";
      const industry = responseText.match(/industry["']?\s*:\s*["']([^"']+)["']/i)?.[1] || "Unknown";
      const stage = responseText.match(/stage["']?\s*:\s*["']([^"']+)["']/i)?.[1] || "Unknown";
      
      // Extract introduction with a more flexible pattern
      let introduction = "No information available.";
      const introMatch = responseText.match(/introduction["']?\s*:\s*["']([^"']+)["']/i);
      if (introMatch && introMatch[1]) {
        introduction = introMatch[1].substring(0, 500);
      }
      
      return {
        website,
        industry,
        stage,
        introduction
      };
    }
  } catch (error) {
    console.error("Error extracting company details:", error);
    return {
      website: "Unknown",
      industry: "Unknown", 
      stage: "Unknown",
      introduction: "Error occurred during extraction."
    };
  }
}

export async function saveCompanyDetails(supabase: any, companyId: string, details: CompanyDetails): Promise<void> {
  try {
    console.log(`Saving company details for company ${companyId}:`, details);
    
    const { error } = await supabase
      .from('company_details')
      .insert([{
        company_id: companyId,
        website: details.website,
        industry: details.industry,
        stage: details.stage,
        introduction: details.introduction
      }]);
      
    if (error) {
      console.error("Error saving company details:", error);
      throw error;
    }
    
    console.log("Company details saved successfully");
  } catch (error) {
    console.error("Error in saveCompanyDetails:", error);
    throw error;
  }
}
