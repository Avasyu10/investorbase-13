
import { supabase } from "@/integrations/supabase/client";

export interface EurekaSubmissionData {
  form_slug: string;
  company_name: string;
  company_registration_type?: string;
  executive_summary?: string;
  company_type?: string;
  question_1?: string;
  question_2?: string;
  question_3?: string;
  question_4?: string;
  question_5?: string;
  submitter_email: string;
  founder_linkedin_urls?: string[];
  poc_name?: string;
  phoneno?: string;
  company_linkedin_url?: string;
  user_id?: string | null;
}

export const submitEurekaForm = async (data: EurekaSubmissionData) => {
  console.log('📤 Submitting Eureka form data:', data);
  
  // Check iframe and CORS context
  const isInIframe = window.self !== window.top;
  const currentOrigin = window.location.origin;
  
  console.log('🌐 Submission context:', {
    isInIframe,
    currentOrigin,
    protocol: window.location.protocol,
    userAgent: navigator.userAgent.substring(0, 50) + '...',
    cookiesEnabled: navigator.cookieEnabled,
    timestamp: new Date().toISOString()
  });
  
  try {
    // Test storage access first (Safari iframe issue detection)
    try {
      localStorage.setItem('cors-test', 'test');
      localStorage.removeItem('cors-test');
      console.log('✅ LocalStorage accessible');
    } catch (storageError) {
      console.warn('⚠️ LocalStorage blocked:', storageError);
    }

    // Get current user with enhanced error handling for iframe context
    let userId: string | null = null;
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.warn('⚠️ Auth error (continuing as anonymous):', authError.message);
      } else {
        userId = user?.id || null;
        console.log('👤 User context:', userId ? 'authenticated' : 'anonymous');
      }
    } catch (authException) {
      console.warn('⚠️ Auth service unavailable (continuing as anonymous):', authException);
    }
    
    // Prepare submission data with proper schema
    const submissionData = {
      form_slug: data.form_slug,
      company_name: data.company_name,
      company_registration_type: data.company_registration_type,
      executive_summary: data.executive_summary,
      company_type: data.company_type,
      question_1: data.question_1,
      question_2: data.question_2,
      question_3: data.question_3,
      question_4: data.question_4,
      question_5: data.question_5,
      submitter_email: data.submitter_email,
      founder_linkedin_urls: data.founder_linkedin_urls,
      poc_name: data.poc_name,
      phoneno: data.phoneno,
      company_linkedin_url: data.company_linkedin_url,
      user_id: userId, // This should now work with the fixed schema
      analysis_status: 'pending',
      // Add metadata for debugging iframe submissions
      submission_context: {
        is_iframe: isInIframe,
        origin: currentOrigin,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent
      }
    };
    
    console.log('📋 Submitting with fixed schema data:', submissionData);
    
    // Enhanced submission with better error reporting
    const { data: submission, error } = await supabase
      .from('eureka_form_submissions')
      .insert([submissionData])
      .select()
      .single();

    if (error) {
      console.error('❌ Database error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      // Provide specific error messages for common issues
      if (error.message?.includes('user_id') || error.message?.includes('invalid column')) {
        throw new Error('Database schema error: The user_id column is missing. Please contact support.');
      } else if (error.message?.includes('JWT')) {
        throw new Error('Authentication token invalid. This may be due to third-party cookie restrictions in iframe context.');
      } else if (error.message?.includes('CORS')) {
        throw new Error('Cross-origin request blocked. Please ensure the iframe is embedded correctly.');
      } else if (error.message?.includes('network')) {
        throw new Error('Network error occurred. Please check your connection and try again.');
      } else {
        throw new Error(`Submission failed: ${error.message}`);
      }
    }

    if (!submission) {
      throw new Error('No data returned from submission - this may indicate a network or configuration issue');
    }

    console.log('✅ Form submitted successfully:', submission);
    
    // Log successful iframe submission for monitoring
    if (isInIframe) {
      console.log('🖼️ Iframe submission completed successfully');
    }
    
    return submission;
    
  } catch (error: any) {
    console.error('❌ Submission error with full context:', {
      error: error.message,
      stack: error.stack,
      isInIframe,
      currentOrigin,
      timestamp: new Date().toISOString(),
      networkOnline: navigator.onLine
    });
    
    // Enhanced error handling for iframe-specific issues
    if (isInIframe) {
      if (error.message?.includes('cookie') || error.message?.includes('third-party')) {
        throw new Error('Third-party cookies are blocked. Please enable cookies for this site or open the form in a new tab.');
      } else if (error.message?.includes('CORS') || error.message?.includes('cross-origin')) {
        throw new Error('Cross-origin request blocked. The iframe may not be configured correctly.');
      } else if (error.message?.includes('CSP') || error.message?.includes('X-Frame-Options')) {
        throw new Error('Content Security Policy or frame options blocking this request.');
      }
    }
    
    throw new Error(error.message || 'Submission failed. Please try again.');
  }
};
