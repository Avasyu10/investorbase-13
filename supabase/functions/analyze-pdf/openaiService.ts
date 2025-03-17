
// Import the Gemini API
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.1.3';

export async function analyzeWithOpenAI(pdfBase64: string, apiKey: string) {
  try {
    if (!apiKey) {
      throw new Error('API key is missing');
    }

    console.log('Initializing Gemini API');
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Create a more structured prompt focused on extracting numerical data
    // Sections should include quantitative analysis, market size, financial projections, etc.
    const prompt = `Analyze this pitch deck PDF image and provide a detailed evaluation with the following elements:

1. An overall assessment with a score between 1-5 (1 decimal place precision) where 1 is poor and 5 is excellent
2. 4-6 key assessment points that include specific numbers, market data, and quantitative insights
3. Create detailed sections analyzing different aspects with these requirements:
   - Each section must have a descriptive title
   - Each section must include a score between 1-5 (1 decimal place precision)
   - Each section must have a thorough description with specific numbers and quantitative data
   - For each section, list 3-5 strengths with numerical support (e.g., "Strong market growth potential with 22% CAGR")
   - For each section, list 3-5 weaknesses with numerical support (e.g., "Revenue projection of $2M in Year 1 seems optimistic given average industry performance of $500K")

Sections MUST include:
1. Market Research (market size, growth rate, TAM/SAM/SOM figures, competitive landscape with market share data)
2. Business Model (pricing structure with specific tiers/numbers, revenue projections, unit economics, margins)
3. Team Assessment (team size, experience metrics, key role coverage percentage, leadership background)
4. Financial Projections (revenue targets, burn rate, fundraising details, valuation metrics)
5. Go-to-Market Strategy (customer acquisition cost, timeline metrics, channel performance data)
6. Product Innovation (R&D investment percentages, development timeline, feature metrics)

For EACH section and the overall assessment, include concrete, specific numbers from the deck. If precise numbers aren't available, provide reasonable estimates based on industry standards, but clearly label them as estimates.

IMPORTANT: Format your response as a JSON object with this exact structure:
{
  "overallScore": number,
  "assessmentPoints": string[],
  "sections": [
    {
      "title": string,
      "type": string,
      "score": number,
      "description": string,
      "strengths": string[],
      "weaknesses": string[]
    }
  ],
  "promptSent": string,
  "responseReceived": string
}`;

    console.log('Creating image parts from PDF');
    // Create a data part from the base64 string
    const base64EncodedImage = pdfBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
    
    // Configure the image part, specifying it's from a PDF
    const imageParts = [
      {
        inlineData: {
          data: base64EncodedImage,
          mimeType: "application/pdf"
        }
      }
    ];

    console.log('Generating content with Gemini API');
    // Generate content from the model
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }, ...imageParts] }],
      generationConfig: {
        temperature: 0.2,
        topK: 32,
        topP: 0.95,
        maxOutputTokens: 4096,
      },
    });

    console.log('Processing Gemini API response');
    const response = await result.response;
    const text = response.text();
    
    try {
      // Extract JSON from the response if it's wrapped in markdown code blocks
      let jsonText = text;
      // Handle if the response is wrapped in code blocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonText = jsonMatch[1];
      }
      
      // Parse the JSON
      const jsonData = JSON.parse(jsonText);
      
      // Add the original prompt and response for reference
      jsonData.promptSent = prompt;
      jsonData.responseReceived = text;
      
      console.log('Successfully parsed analysis JSON');
      return jsonData;
    } catch (jsonError) {
      console.error('Failed to parse JSON from Gemini response:', jsonError);
      console.log('Raw response text:', text);
      // Return a structured error with the raw text for debugging
      throw new Error(`Failed to parse JSON from response: ${jsonError.message}. Raw text: ${text.substring(0, 500)}...`);
    }
  } catch (error) {
    console.error('Error in analyzeWithOpenAI:', error);
    throw error;
  }
}
