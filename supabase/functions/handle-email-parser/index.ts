
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0"

type MailAttachment = {
  key_0: string; // filename
  key_1: string; // URL
};

type EmailWebhookPayload = {
  id: string;
  received_at: string;
  processed_at: string;
  company_name: string;
  mail_attachment: MailAttachment[];
  mail_sender: Array<{ name: string; address: string }>;
  // Other fields can be added as needed
};

serve(async (req) => {
  try {
    // Verify the webhook request
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const [scheme, token] = authHeader.split(' ');
    
    if (scheme !== 'Bearer' || !token) {
      console.error('Invalid authorization format');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid authorization format' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET');
    
    if (!WEBHOOK_SECRET || token !== WEBHOOK_SECRET) {
      console.error('Invalid webhook secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid webhook secret' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Get the request body
    const requestBody = await req.text();
    
    if (!requestBody) {
      console.error('Empty request body');
      return new Response(
        JSON.stringify({ error: 'Empty request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse the webhook payload
    let payload: EmailWebhookPayload;
    try {
      payload = JSON.parse(requestBody);
      console.log('Parsed webhook payload:', payload);
    } catch (e) {
      console.error('Error parsing webhook payload:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate required fields
    if (!payload.id || !payload.mail_sender || !payload.mail_attachment) {
      console.error('Missing required fields in payload');
      return new Response(
        JSON.stringify({ error: 'Missing required fields in payload' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const { mail_sender, mail_attachment, company_name, received_at } = payload;
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get all form owners (admin users) to assign the email to
    const { data: adminUsers, error: adminError } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_admin', true)
      .limit(1);
      
    let adminUserId;
    
    if (adminError) {
      console.error('Error fetching admin user:', adminError);
      return new Response(
        JSON.stringify({ error: 'Unable to process email: Database error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (!adminUsers || adminUsers.length === 0) {
      console.log('No admin user found, creating one...');
      
      // Get the first user from profiles as a fallback
      const { data: firstUser, error: firstUserError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
        
      if (firstUserError || !firstUser || firstUser.length === 0) {
        console.error('No users found in the system:', firstUserError);
        return new Response(
          JSON.stringify({ error: 'Unable to process email: No users found in the system' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // Set the first user as admin
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_admin: true })
        .eq('id', firstUser[0].id);
        
      if (updateError) {
        console.error('Error setting user as admin:', updateError);
        return new Response(
          JSON.stringify({ error: 'Unable to process email: Could not set admin user' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      adminUserId = firstUser[0].id;
      console.log(`Set user ${adminUserId} as admin`);
    } else {
      adminUserId = adminUsers[0].id;
      console.log(`Found existing admin user: ${adminUserId}`);
    }
    
    // Verify that the email-submission form exists
    const { data: emailForm, error: formError } = await supabase
      .from('public_submission_forms')
      .select('id')
      .eq('form_slug', 'email-submission')
      .single();
      
    if (formError) {
      console.error('Error finding email submission form:', formError);
      console.log('Attempting to create the email submission form...');
      
      // Create the email submission form if it doesn't exist
      const { data: newForm, error: createFormError } = await supabase
        .from('public_submission_forms')
        .insert([{
          form_name: 'Email Submissions',
          form_slug: 'email-submission',
          is_active: true,
          user_id: adminUserId,
          auto_analyze: false
        }])
        .select()
        .single();
        
      if (createFormError) {
        console.error('Error creating email submission form:', createFormError);
      } else {
        console.log('Created email submission form with ID:', newForm.id);
      }
    } else {
      console.log('Found existing email submission form with ID:', emailForm.id);
    }
    
    // Create a new report entry for the email submission
    const reportTitle = company_name || 'Email submission';
    const senderName = mail_sender[0]?.name || '';
    const senderEmail = mail_sender[0]?.address || '';
    const description = `Email from: ${senderName} <${senderEmail}>`;
    
    // Process each attachment in a separate background task
    const processingPromises = mail_attachment.map(async (attachment) => {
      try {
        const attachmentUrl = attachment.key_1;
        const fileName = attachment.key_0;
        
        if (!attachmentUrl) {
          console.error('Attachment URL is missing');
          return null;
        }
        
        console.log(`Processing attachment: ${fileName} from URL: ${attachmentUrl}`);
        
        // Create a new report record
        const { data: report, error: reportError } = await supabase
          .from('reports')
          .insert([
            {
              title: reportTitle,
              description,
              submitter_email: senderEmail,
              pdf_url: `email_attachments/${fileName}`, // Store in the new email_attachments bucket
              user_id: adminUserId,
              is_public_submission: true,
              analysis_status: 'pending'
            }
          ])
          .select()
          .single();
        
        if (reportError) {
          console.error('Error creating report:', reportError);
          throw reportError;
        }
        
        console.log(`Created report with ID: ${report.id}`);
        
        // Create an email_submissions record
        const { data: emailSubmission, error: submissionError } = await supabase
          .from('email_submissions')
          .insert([
            {
              from_email: senderEmail,
              to_email: 'youremail@example.com', // Replace with actual recipient
              subject: reportTitle,
              email_body: description,
              has_attachments: true,
              report_id: report.id,
              attachment_url: fileName
            }
          ])
          .select()
          .single();
          
        if (submissionError) {
          console.error('Error creating email submission:', submissionError);
          throw submissionError;
        }
        
        console.log(`Created email submission with ID: ${emailSubmission.id}`);
        
        // Create a public_form_submissions record to make it appear in the Public Submissions list
        const { data: publicSubmission, error: publicSubmissionError } = await supabase
          .from('public_form_submissions')
          .insert([
            {
              title: reportTitle,
              description,
              form_slug: 'email-submission',
              pdf_url: `email_attachments/${fileName}`,
              report_id: report.id,
              website_url: null,
              industry: null,
              company_stage: null
            }
          ])
          .select()
          .single();
          
        if (publicSubmissionError) {
          console.error('Error creating public form submission:', publicSubmissionError, publicSubmissionError.details);
          throw publicSubmissionError;
        }
        
        console.log(`Created public form submission with ID: ${publicSubmission.id}`);
        
        // Download the attachment from the URL (retry up to 3 times)
        const maxRetries = 3;
        let retryCount = 0;
        let fileData = null;
        
        while (retryCount < maxRetries && !fileData) {
          try {
            console.log(`Downloading file, attempt ${retryCount + 1}...`);
            
            // Fetch the file with a timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // Increase timeout to 30 seconds
            
            const fileResponse = await fetch(attachmentUrl, { 
              signal: controller.signal,
              headers: {
                'Cache-Control': 'no-cache'
              }
            });
            
            clearTimeout(timeoutId);
            
            if (!fileResponse.ok) {
              throw new Error(`Failed to download file: ${fileResponse.status} ${fileResponse.statusText}`);
            }
            
            fileData = await fileResponse.arrayBuffer();
            console.log(`Successfully downloaded file, size: ${fileData.byteLength} bytes`);
          } catch (downloadError) {
            console.error(`Download attempt ${retryCount + 1} failed:`, downloadError);
            retryCount++;
            
            if (retryCount >= maxRetries) {
              throw new Error(`Failed to download file after ${maxRetries} attempts: ${downloadError.message}`);
            }
            
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, retryCount - 1)));
          }
        }
        
        if (!fileData) {
          throw new Error('Failed to download file: No file data received');
        }
        
        // Upload the file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('email_attachments')
          .upload(fileName, fileData, {
            contentType: 'application/pdf',
            cacheControl: '3600',
            upsert: true // Overwrite if file already exists
          });
          
        if (uploadError) {
          console.error('Error uploading file to storage:', uploadError);
          throw uploadError;
        }
        
        console.log(`Successfully uploaded file to storage: ${uploadData.path}`);
        
        return {
          reportId: report.id,
          emailSubmissionId: emailSubmission.id,
          publicSubmissionId: publicSubmission.id,
          fileName
        };
      } catch (processingError) {
        console.error('Error processing attachment:', processingError);
        return {
          error: processingError.message
        };
      }
    });
    
    // Process in parallel but return before it's all done
    // This prevents timeout issues with the edge function
    const processingStarted = processingPromises.map(p => p.catch(e => ({ error: e.message })));
    
    // Start processing but don't wait for it to complete
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(Promise.all(processingPromises));
    } else {
      // Just kick off the processing
      Promise.all(processingPromises).catch(err => {
        console.error('Background processing error:', err);
      });
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email processing started',
        emailId: payload.id,
        attachmentCount: mail_attachment.length 
      }),
      { status: 202, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Unhandled error in webhook handler:', error);
    
    return new Response(
      JSON.stringify({ error: `Server error: ${error.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
