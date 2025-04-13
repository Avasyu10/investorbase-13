
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ProspectData {
  name: string;
  industry?: string;
  stage?: string;
  score: number;
  created_at: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Get the API keys from environment variables
  const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
  const resendApiKey = Deno.env.get("RESEND_API_KEY") as string;

  if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
    console.error("Missing environment variables");
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
    const resend = new Resend(resendApiKey);

    // Process request
    const { alertType } = await req.json();

    if (alertType === "endOfDay") {
      // Get all users who have enabled end of day alerts
      const { data: alertUsers, error: alertError } = await supabase
        .from("end_of_day_alerts")
        .select("user_id")
        .eq("enabled", true);

      if (alertError) {
        throw new Error(`Error fetching alert users: ${alertError.message}`);
      }

      if (!alertUsers || alertUsers.length === 0) {
        return new Response(
          JSON.stringify({ message: "No users with end of day alerts enabled" }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // Process each user
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      for (const alertUser of alertUsers) {
        // Get user email
        const { data: userData, error: userError } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", alertUser.user_id)
          .single();

        if (userError || !userData?.email) {
          console.error(`Error fetching user ${alertUser.user_id}: ${userError?.message}`);
          continue;
        }

        // Get today's prospects for this user
        const { data: prospects, error: prospectsError } = await supabase
          .from("companies")
          .select("name, overall_score, created_at")
          .eq("user_id", alertUser.user_id)
          .gte("created_at", todayISO)
          .order("created_at", { ascending: false });

        if (prospectsError) {
          console.error(`Error fetching prospects: ${prospectsError.message}`);
          continue;
        }

        if (!prospects || prospects.length === 0) {
          console.log(`No new prospects today for user ${alertUser.user_id}`);
          continue;
        }

        // Get more details for each prospect
        const prospectsWithDetails: ProspectData[] = [];
        for (const prospect of prospects) {
          const { data: details } = await supabase
            .from("company_details")
            .select("industry, stage")
            .eq("company_id", prospect.id)
            .maybeSingle();

          prospectsWithDetails.push({
            name: prospect.name,
            industry: details?.industry || "Not specified",
            stage: details?.stage || "Not specified",
            score: prospect.overall_score,
            created_at: prospect.created_at,
          });
        }

        // Create HTML content for email
        const prospectsHtml = prospectsWithDetails
          .map(
            (p) => `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${p.name}</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${p.industry}</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${p.stage}</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${p.score}</td>
            </tr>
          `
          )
          .join("");

        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Your Daily Prospect Summary</h2>
            <p>Here are the new prospects added to your profile today:</p>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f2f2f2;">
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Company</th>
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Industry</th>
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Stage</th>
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Score</th>
                </tr>
              </thead>
              <tbody>
                ${prospectsHtml}
              </tbody>
            </table>
            <p style="margin-top: 20px;">Log in to your dashboard for more details.</p>
          </div>
        `;

        // Send email
        const emailResult = await resend.emails.send({
          from: "InvestorBase Alerts <alerts@investorbase.app>",
          to: [userData.email],
          subject: `Daily Prospect Summary - ${new Date().toLocaleDateString()}`,
          html: htmlContent,
        });

        console.log(`End of day email sent to ${userData.email}:`, emailResult);
      }

      return new Response(
        JSON.stringify({ success: true, message: "End of day alerts processed" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } else if (alertType === "custom") {
      // Get all custom alerts
      const { data: customAlerts, error: alertError } = await supabase
        .from("custom_alerts")
        .select("*");

      if (alertError) {
        throw new Error(`Error fetching custom alerts: ${alertError.message}`);
      }

      if (!customAlerts || customAlerts.length === 0) {
        return new Response(
          JSON.stringify({ message: "No custom alerts configured" }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // Get all companies added in the last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayISO = yesterday.toISOString();

      const { data: recentCompanies, error: companiesError } = await supabase
        .from("companies")
        .select("id, name, overall_score, user_id, created_at")
        .gte("created_at", yesterdayISO);

      if (companiesError) {
        throw new Error(`Error fetching recent companies: ${companiesError.message}`);
      }

      if (!recentCompanies || recentCompanies.length === 0) {
        return new Response(
          JSON.stringify({ message: "No recent companies to check" }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // Process each company to check against alerts
      for (const company of recentCompanies) {
        // Get company details
        const { data: companyDetails, error: detailsError } = await supabase
          .from("company_details")
          .select("industry, stage")
          .eq("company_id", company.id)
          .maybeSingle();

        if (detailsError) {
          console.error(`Error fetching company details: ${detailsError.message}`);
          continue;
        }

        const industry = companyDetails?.industry || "";
        const stage = companyDetails?.stage || "";
        const score = company.overall_score;

        // Check this company against all relevant alerts
        for (const alert of customAlerts) {
          if (alert.user_id === company.user_id) {
            continue; // Skip if the alert is set by the company's own user
          }

          let matchesConditions = true;

          // Check industry condition
          if (alert.industry && alert.industry !== industry) {
            matchesConditions = false;
          }

          // Check stage condition
          if (alert.stage && alert.stage !== stage) {
            matchesConditions = false;
          }

          // Check score condition
          if (
            alert.min_score !== null &&
            alert.min_score !== undefined &&
            score < alert.min_score
          ) {
            matchesConditions = false;
          }

          // If all conditions match, send an alert
          if (matchesConditions) {
            // Get user email
            const { data: userData, error: userError } = await supabase
              .from("profiles")
              .select("email")
              .eq("id", alert.user_id)
              .single();

            if (userError || !userData?.email) {
              console.error(`Error fetching user ${alert.user_id}: ${userError?.message}`);
              continue;
            }

            // Create email content
            const htmlContent = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Custom Alert: New Matching Prospect</h2>
                <p>A new company in our database matches your alert criteria:</p>
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                  <p><strong>Company Name:</strong> ${company.name}</p>
                  <p><strong>Industry:</strong> ${industry || "Not specified"}</p>
                  <p><strong>Stage:</strong> ${stage || "Not specified"}</p>
                  <p><strong>Assessment Score:</strong> ${score}</p>
                </div>
                <p>Log in to your dashboard to view more details about this company.</p>
              </div>
            `;

            // Send email
            const emailResult = await resend.emails.send({
              from: "InvestorBase Alerts <alerts@investorbase.app>",
              to: [userData.email],
              subject: `Alert: New Prospect Match - ${company.name}`,
              html: htmlContent,
            });

            console.log(`Custom alert email sent to ${userData.email}:`, emailResult);
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: "Custom alerts processed" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

    return new Response(
      JSON.stringify({ error: "Invalid alert type specified" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-alert-emails function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
