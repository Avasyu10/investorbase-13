
import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/integrations/supabase/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('BARC API submission received:', req.body);

    const {
      form_slug,
      company_name,
      company_registration_type,
      executive_summary,
      company_type,
      question_1,
      question_2,
      question_3,
      question_4,
      question_5,
      submitter_email,
    } = req.body;

    // Validate required fields
    if (!form_slug || !company_name || !submitter_email) {
      return res.status(400).json({ 
        error: 'Missing required fields: form_slug, company_name, and submitter_email are required' 
      });
    }

    // Prepare submission data
    const submissionData = {
      form_slug,
      company_name,
      company_registration_type: company_registration_type || null,
      executive_summary: executive_summary || null,
      company_type: company_type || null,
      question_1: question_1 || null,
      question_2: question_2 || null,
      question_3: question_3 || null,
      question_4: question_4 || null,
      question_5: question_5 || null,
      submitter_email,
      analysis_status: 'pending'
    };

    console.log('Inserting BARC submission into database:', submissionData);

    // Insert into barc_form_submissions table
    const { data, error } = await supabase
      .from('barc_form_submissions')
      .insert(submissionData)
      .select()
      .single();

    if (error) {
      console.error('Database insertion error:', error);
      return res.status(500).json({ 
        error: 'Failed to save submission', 
        details: error.message 
      });
    }

    console.log('BARC submission saved successfully:', data);

    return res.status(200).json({ 
      success: true, 
      submissionId: data.id,
      message: 'BARC application submitted successfully' 
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
