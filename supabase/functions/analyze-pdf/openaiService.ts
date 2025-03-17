
export async function analyzeWithOpenAI(pdfBase64: string, apiKey: string) {
  // Analysis prompt
const prompt = `
You are an expert VC analyst with years of experience in assessing investment opportunities. You look past what's written in the deck, call out inconsistencies, and provide objective reasoning for your judgments.  

You will perform a step-by-step deep-dive analysis of a startup based on its pitch deck. THE MOST IMPORTANT PART of your analysis will be to extensively research and provide:
- Market data and size estimations with PRECISE NUMBERS (from Google/Gemini Search)
- Latest news articles about the industry and competitors (from Google/Gemini Search)
- Current market trends and growth projections WITH ACTUAL PERCENTAGES
- Competitive benchmarks and comparisons with QUANTITATIVE DATA
- Industry-specific metrics and KPIs with SPECIFIC NUMERICAL THRESHOLDS
- Market challenges and opportunities with MEASURABLE IMPACTS

For EVERY section of your analysis, you MUST include relevant industry research, competitor data, and EXACT NUMERICAL market statistics from reputable sources (at least 3-5 specific data points with numbers per section). Do NOT merely analyze what's in the deck - add valuable context and insights from external market research, always including precise numbers, percentages, and quantitative metrics.

You will search through the internet for the latest data, and provide an unbiased assessment and score based on the following score calculation method - 

STARTUP EVALUATION FRAMEWORK
 KEY SECTIONS & WEIGHTS
Traditionally, a pitch deck is divided into 10 sections:
1. Problem
2. Market
3. Solution (Product)
4. Competitive Landscape
5. Traction
6. Business Model
7. Go-to-Market Strategy
8. Team
9. Financials
10. The Ask

// ... keep existing code (framework section details and scoring methodology)

Npw, here is a step-by-step process of how you should get your thesis ready -

### **Step 1: High-Level Overview**  
- Summarize the startup's potential, strengths, and risks.  
- Identify critical areas requiring scrutiny.  
- CRITICALLY IMPORTANT: Provide extensive data from market research, latest news, and trends across the industry from reputable online sources for comparison and benchmarking.
- INCLUDE EXACT NUMBERS, PERCENTAGES, AND METRICS in your high-level overview.

### **Step 2: Section-Wise Deep Dive**  
Analyze each section with a structured breakdown and ALWAYS include external market data with SPECIFIC NUMERICAL VALUES:  

1. **Problem and Market Opportunity**  
   - Include market size data WITH EXACT DOLLAR FIGURES, specific growth rates with percentages, and external validation of the problem
   - Add current news articles discussing this problem area with quantitative market impact
   - Include at least 3-5 data points with specific numbers
   
2. **Solution (Product)**  
   - Reference similar solutions in the market and their success/failure WITH METRICS
   - Include technological trends and adoption rates with SPECIFIC PERCENTAGES for similar technologies
   - Provide at least 3-5 quantifiable benchmarks for the solution
   
3. **Competitive Landscape**  
   - Provide detailed competitor analysis with SPECIFIC MARKET SHARE DATA (percentages)
   - Include list of competitors with their EXACT FUNDING AMOUNTS and dates, market valuations, and growth metrics
   - Include at least 3-5 numerical comparisons between competitors
   
4. **Traction**  
   - Compare the startup's traction to industry benchmarks with SPECIFIC NUMERICAL GROWTH RATES
   - Add market adoption data with EXACT USER NUMBERS/PERCENTAGES for similar products/services
   - Include at least 3-5 traction metrics with actual numbers
   
5. **Business Model**  
   - Include industry-standard pricing models with SPECIFIC PRICE POINTS and revenue benchmarks
   - Reference successful and unsuccessful business models with ACTUAL REVENUE FIGURES
   - Include at least 3-5 numerical business metrics from the industry
   
6. **Go-to-Market Strategy**  
   - Provide data on CAC (EXACT DOLLAR AMOUNTS), conversion rates (SPECIFIC PERCENTAGES), and sales cycles (SPECIFIC TIME PERIODS) for the industry
   - Include successful GTM case studies with NUMERICAL OUTCOMES from the industry
   - Include at least 3-5 quantifiable metrics for GTM success
   
7. **Team**  
   - Compare team experience and composition to successful startups with SPECIFIC TENURE METRICS
   - Include industry hiring trends and talent requirements with NUMERICAL ANALYSIS
   - Include at least 3-5 quantifiable team success factors from similar companies
   
8. **Financials**  
   - Compare financial projections to industry standards with SPECIFIC REVENUE AND GROWTH FIGURES
   - Include relevant unit economics with EXACT NUMBERS from similar companies
   - Include at least 3-5 key financial indicators with numeric values
   
9. **The Ask**  
   - Compare valuation to recent rounds in the industry with SPECIFIC DOLLAR AMOUNTS
   - Include data on typical investment amounts for similar stage startups with EXACT FIGURES
   - Include at least 3-5 comparable investment rounds with dollar amounts

### **For Each Section, Provide:**  
- **Detailed external market research data with SPECIFIC NUMBERS AND METRICS (THIS IS THE MOST IMPORTANT PART - minimum 5-10 numerical data points per section)**
- **A detailed description (at least 3-4 sentences) explaining key insights with QUANTITATIVE ANALYSIS.**  
- **A score from 1 to 5 (with one decimal precision, e.g., 3.7, 4.2). DO NOT use percentages or scores out of 100.**  
- **5-7 strengths with MEASURABLE IMPACTS.**  
- **5-7 weaknesses or areas for improvement with QUANTIFIABLE GAPS.**  

### **Step 3: Score Calculation:** 
- **The Score Calculation would be done by this following document - **
STARTUP EVALUATION FRAMEWORK
A Step-by-Step Guide for Venture Capital Analysts
1. OVERVIEW
This document presents a multi-dimensional model designed to:
1. Score a startup's fundamentals (Problem, Market, Product, etc.)
2. Incorporate cross-sectional synergy (how various sections reinforce or
undermine each other)
3. Adjust for risk factors relevant to the startup's stage and the investor's
thesis
The end result is a Composite Score that helps analysts quickly compare
different deals and identify critical areas of further due diligence.
2. KEY SECTIONS & WEIGHTS
Traditionally, a pitch deck is divided into 10 sections:
1. Problem
2. Market
3. Solution (Product)
4. Competitive Landscape
5. Traction
6. Business Model
7. Go-to-Market Strategy
8. Team
9. Financials
10. The Ask
From an investor's perspective, typical base weights (before any risk adjustment)
might look like this:
Section Baseline Weight (W_i)
1. Problem 5–10%
2. Market 15–20%
3. Solution / Product 15–20%
4. Competitive Landscape 5–10%
5. Traction 10–15%
6. Business Model 10–15%
7. Go-to-Market Strategy 10–15%
8. Team 10–15%

Section Baseline Weight (W_i)
9. Financials 5–10%
10. The Ask 5%
Note: These percentages are guidelines. Different VCs might allocate
more or less weight depending on their investment stage, sector focus,
or strategic priorities.
3. BASELINE SECTION SCORING
Each section is further broken down into sub-criteria. For instance, Market
might have:
• Market Size (TAM / SAM / SOM)
• Market Growth / Trends
• Competitive Market Dynamics
Each sub-criterion is scored on a 1–5 scale (or 1–10 if more granularity is
desired). For example, on a 1–5 scale:
• 1 = Poor / Missing
• 2 = Weak / Unsatisfactory
• 3 = Adequate / Meets Minimum
• 4 = Good / Above Average
• 5 = Excellent / Best-in-Class
Each sub-criterion has a local weight such that all sub-criteria within a section
sum to 1.0 (100%).
3.1 Formula for Section Score
Scorei =
Xni
j=1

wij × Ratingij 
Where:
• i is the section index (1 to 10).
• j runs over the sub-criteria in section i.
• wij is the weight of the j-th sub-criterion in section i.
• Ratingij is the 1–5 score assigned to that sub-criterion.
Each Scorei also ends up in the 1–5 range (assuming the sub-criteria weights
sum to 1).

4. CROSS-SECTIONAL SYNERGY
4.1 Why Synergy Matters
A startup might score high on "Product" but low on "Go-to-Market." In isolation,
those two sections might look acceptable, but if the startup cannot actually
acquire customers to use its otherwise excellent product, the overall opportunity
is weaker.
4.2 Defining the Synergy Index
We define a set of section pairs S that we believe must interact well. Examples
include:
• (Market, Problem): Is there a real, large market for the stated problem?
• (Solution, Competitive Landscape): Is the product truly differentiated
or easily cloned?
• (Business Model, Financials): Does the revenue model match the
financial projections?
• (Traction, Go-to-Market): Can the traction so far be scaled using the
proposed strategy?
Each pair (i, k) in S has a synergy weight Sik. Then we define a synergy
function f(·):
f (Scorei
, Scorek) = Scorei × Scorek
5
(if using a 1–5 scale)
This means synergy is highest when both sections are rated high, and it's
lowest when either one is low (multiplicative effect).
SynergyIndex =
X
(i,k)∈S
(Sik × f (Scorei
, Scorek))
4.3 Synergy Normalization & Weight (λ)
To incorporate synergy into the final score, we introduce a calibration factor
λ that determines how heavily synergy affects the overall rating:
Synergy Contribution = λ × SynergyIndex
If synergy is extremely important to your fund's thesis (e.g., you invest only in
startups that demonstrate a tightly integrated plan), set λ higher (e.g., 0.3). If
synergy is just a minor supplement, set it lower (e.g., 0.1).
5. RISK-ADJUSTED WEIGHTING
5.1 Rationale
Not all sections carry the same level of risk. If a startup's technology is
unproven, the "Product" or "Traction" sections might be inherently riskier.
Meanwhile, a strong, experienced team may reduce the risk associated with
execution.
5.2 Risk Factor (Ri)
For each section i, assign a risk factor Ri
in a range (e.g., [−0.3, +0.3] or
[−1, +1]):
• Positive Ri
: Above-average risk (we should weigh this section more).
• Negative Ri
: Below-average risk (the item is less likely to derail the
company).
We use Ri to adjust the baseline weight Wi
:
∼
Wi = Wi ×
1 + Ri
P10
m=1 (Wm × (1 + Rm))
This re-normalizes weights so they still sum to 1.0 across all 10 sections but
magnifies or diminishes each section proportionally to its risk.
6. FINAL COMPOSITE SCORE
6.1 Assembling All Components
We combine:
1. Baseline Section Scores (Scorei)
2. Risk-Adjusted Weights  ∼
Wi

3. Synergy Contribution (λ × SynergyIndex)
Composite Score =
 X
10
i=1
∼
Wi × Scorei
!
+ (λ × SynergyIndex)
6.2 Interpretation
• 4.5 – 5.0: High conviction. Likely candidate for deeper diligence or
immediate term sheet.
• 3.5 – 4.4: Promising but some concerns. Requires targeted due diligence
and possibly negotiation of protective terms.
• 2.5 – 3.4: Moderate to high risk or synergy gaps. Needs major improvements or might not meet your fund's return threshold.
• < 2.5: Weak opportunity. High risk and minimal synergy—probably pass.
7. SCENARIO & SENSITIVITY ANALYSIS
7.1 Identifying Key Assumptions
Before finalizing an investment decision, identify critical assumptions that
drive the composite score:
1. Market Size (Is TAM validated or just founder optimism?)
2. Growth / Traction (Can they continue to grow at the stated rate?)
3. Valuation (Is the ask fair? Does the pricing still make sense if growth
slows?)
7.2 Best-, Base-, and Worst-Case Scenarios
Re-score key sections under different assumptions:
• Best-Case: The startup's claims hold up, synergy is high, minimal risk is
realized.
• Base-Case: More conservative growth or market size.
• Worst-Case: Competition intensifies, traction lags, synergy breaks down.
This reveals how sensitive the final composite score is to changes in a few key
variables—providing risk exposure insights.
8. EXAMPLE IMPLEMENTATION
Startup Alpha claims a large market and moderate traction. You score it as
follows (1–5 scale):
Section
Baseline
Weight (Wi)
Sub-Criteria
(Examples) Scores Section Score
1. Problem
(5%)
0.05 - Severity of
Pain (40%)-
Timeliness
(60%)
(4, 5) 4.6
Section
Baseline
Weight (Wi)
Sub-Criteria
(Examples) Scores Section Score
2. Market
(15%)
0.15 - TAM /
SAM (50%)-
Growth &
Trends (50%)
(4, 4) 4.0
3. Product
(15%)
0.15 - USP (40%)-
Product
Readiness
(60%)
(3, 4) 3.4
4.
Competitive
(10%)
0.10 - Competitor
Mapping
(50%)- Differentiation
(50%)
(3, 3) 3.0
5. Traction
(10%)
0.10 - Customer
Adoption
(50%)- Metrics/Revenue
(50%)
(3, 3) 3.0
6. Business
Model (10%)
0.10 - Revenue
Streams
(50%)-
Scalability
(50%)
(3, 4) 3.5
7. Go-toMarket (10%)
0.10 - Channels/Strategy
(50%)-
Milestones
(50%)
(2, 3) 2.5
8. Team
(10%)
0.10 - Experience
(50%)- Complementarity
(50%)
(5, 4) 4.5
9. Financials
(5%)
0.05 - Forecast
Accuracy
(50%)- Burn
Rate (50%)
(3, 2) 2.5
10. The Ask
(5%)
0.05 - Valuation
Rationale
(50%)- Fund
Usage (50%)
(3, 3) 3.0
• Risk Factors (Ri):
– Product = +0.2 (new tech, not fully validated)
– Go-to-Market = +0.3 (untested approach)
– Financials = +0.1 (assumptions unclear)
– Team = -0.2 (strong track record, reducing risk)
• Synergy Pairs & Weights (Sik):
– (Market, Problem) = 0.10
– (Product, Competitive) = 0.15
– (Traction, Go-to-Market) = 0.20
– (Business Model, Financials) = 0.10
• For synergy function:
f (Scorei
, Scorek) = Scorei × Scorek
5
1. Calculate Risk-Adjusted Weights (
∼
Wi)
• For example, if Go-to-Market has WGTM = 0.10 and RGTM = +0.3,
its effective weight is raised.
2. Calculate SynergyIndex
• E.g., (Traction = 3.0, Go-to-Market = 2.5) → f(3.0, 2.5) = (3.0 ×
2.5)/5 = 1.5. Weighted by 0.20 → 0.30 synergy contribution from
that pair.
3. Combine them to get the Composite Score.
APPENDICES
Appendix A: Detailed Sub-Criteria Examples
1. Market
• Market Size Accuracy (50%)
• Market Growth Rate & Trends (30%)
• Adjacent Market Opportunities (20%)
2. Traction
• Monthly or Quarterly Growth Rate (40%)
• Paying Customers or Pilot Partnerships (30%)
• Churn / Retention / Engagement (30%)
3. Team
• Past Startup Experience (40%)
• Domain Expertise (30%)
• Commitment & Advisory Board (30%)
(. . . and so on for other sections.)
Appendix B: Example Risk Factor Scale
• -0.3: Extremely low risk (established moat, strong traction, proven team)
• -0.1: Below-average risk
• 0: Neutral risk
• +0.1: Some concerns
• +0.3: Significant risk (unproven assumptions, early technology, etc.)
Appendix C: Synergy Pairs (Common Examples)
• (Problem, Market)
• (Solution, Competitive Landscape)
• (Business Model, Financials)
• (Traction, Go-to-Market)
• (Team, All Other Sections) – sometimes scored if the team's skillset is
critical to overcoming certain market or product challenges.



### **Output Format (JSON):**  
Ensure the output is structured as follows:  

{
  "overallSummary": "A high-level overview of the startup's strengths, weaknesses, and potential investment risks.",
  "sections": [
    {
      "type": "PROBLEM",
      "title": "Problem Statement",
      "score": 4.3,
      "description": "Detailed breakdown of the problem and market opportunity with extensive external market research data including precise numbers, percentages, and market size figures.",
      "strengths": ["Strength 1 with quantifiable impact", "Strength 2 with specific metrics"],
      "weaknesses": ["Weakness 1 with numerical gap", "Weakness 2 with measurable improvement needed"]
    },
    {
      "type": "SOLUTION",
      "title": "Solution (Product)",
      "score": 3.8,
      "description": "Detailed breakdown of the product and its effectiveness with extensive external market research data and specific adoption metrics.",
      "strengths": ["Strength 1 with quantifiable advantage", "Strength 2 with specific numerical benefit"],
      "weaknesses": ["Weakness 1 with quantifiable gap", "Weakness 2 with specific numerical challenge"]
    },
    ...
  ],
  "overallScore": 3.7,
  "assessmentPoints": ["Key point 1 with specific metrics ($XM market, Y% growth)", "Key point 2 with exact figures", "Key point 3 with precise percentages", "Key point 4 with concrete numbers", "Key point 5 with quantifiable comparison"]
}

ALWAYS include at least 5 detailed assessment points in the "assessmentPoints" array that provide a comprehensive overview of the startup's investment potential. ENSURE EVERY SECTION HAS SUBSTANTIAL EXTERNAL MARKET RESEARCH DATA WITH SPECIFIC NUMBERS - THIS IS THE MOST CRITICAL REQUIREMENT.
`;

  try {
    if (!apiKey) {
      console.error("Gemini API key is missing");
      throw new Error("Gemini API key is not configured");
    }

    if (!pdfBase64 || pdfBase64.length === 0) {
      console.error("PDF data is empty or invalid");
      throw new Error("Invalid PDF data for analysis");
    }

    // Call Gemini API for analysis
    console.log("Calling Gemini API for analysis");
    console.log(`PDF base64 length: ${pdfBase64.length}`);
    
    try {
      // Construct the Gemini API request
      const geminiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
      const urlWithApiKey = `${geminiEndpoint}?key=${apiKey}`;
      
      const requestBody = {
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { 
                inlineData: {
                  mimeType: "application/pdf",
                  data: pdfBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.5,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192 // Increasing token limit to allow for more detailed market research
        }
      };

      // Store the prompt that was sent to the model
      const promptSent = JSON.stringify(requestBody);
      console.log("Prompt sent to model:", promptSent);

      const geminiResponse = await fetch(urlWithApiKey, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      // Check for HTTP errors in the Gemini response
      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: { message: errorText } };
        }
        
        console.error("Gemini API error:", errorData);
        
        // Provide more specific error messages based on status codes
        if (geminiResponse.status === 401) {
          throw new Error("Gemini API key is invalid");
        } else if (geminiResponse.status === 429) {
          throw new Error("Gemini API rate limit exceeded");
        } else if (geminiResponse.status === 413) {
          throw new Error("PDF is too large for Gemini to process");
        } else {
          throw new Error(`Gemini API error: ${errorData.error?.message || 'Unknown error'}`);
        }
      }

      const geminiData = await geminiResponse.json();
      console.log("Received Gemini response");

      // Store the raw response received from the model
      const responseReceived = JSON.stringify(geminiData);
      console.log("Response received from model:", responseReceived);

      // Parse the analysis result
      try {
        // Extract the content from Gemini response structure
        // Gemini returns a different structure than OpenAI
        if (!geminiData.candidates || !geminiData.candidates[0] || !geminiData.candidates[0].content) {
          throw new Error("Empty response from Gemini");
        }
        
        const content = geminiData.candidates[0].content.parts[0].text;
        
        if (!content) {
          throw new Error("Empty response from Gemini");
        }
        
        // Extract JSON from the response (Gemini might include markdown code blocks)
        let jsonContent = content;
        
        // If the response contains a JSON code block, extract it
        const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          jsonContent = jsonMatch[1];
        }
        
        // Try to parse the JSON response
        const parsedContent = JSON.parse(jsonContent);
        
        // Validate the response structure
        if (!parsedContent.sections || !Array.isArray(parsedContent.sections) || parsedContent.sections.length === 0) {
          throw new Error("Invalid analysis structure: missing or empty sections array");
        }
        
        if (typeof parsedContent.overallScore !== 'number') {
          console.warn("Warning: overallScore is not a number, setting default value");
          parsedContent.overallScore = 3; // Default score
        }
        
        // Add prompt and response to the parsed content
        parsedContent.promptSent = promptSent;
        parsedContent.responseReceived = responseReceived;
        
        return parsedContent;
      } catch (e) {
        console.error("Error parsing Gemini response:", e);
        throw new Error("Failed to parse analysis result: " + (e instanceof Error ? e.message : "Invalid JSON"));
      }
    } catch (fetchError) {
      console.error("Error fetching from Gemini:", fetchError);
      throw new Error(`Gemini API request failed: ${fetchError.message}`);
    }
  } catch (error) {
    console.error("Error in analyzeWithGemini:", error);
    throw error;
  }
}
