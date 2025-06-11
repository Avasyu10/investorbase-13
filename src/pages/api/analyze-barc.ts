
import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/integrations/supabase/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('BARC analysis request received:', req.body);

    const { submissionId } = req.body;

    if (!submissionId) {
      return res.status(400).json({ error: 'Missing submissionId' });
    }

    console.log('Triggering analysis for BARC submission:', submissionId);

    // Call the existing Supabase edge function for BARC analysis
    const { data, error } = await supabase.functions.invoke('analyze-barc-submission', {
      body: { submissionId }
    });

    if (error) {
      console.error('Analysis function error:', error);
      return res.status(500).json({ 
        error: 'Failed to start analysis', 
        details: error.message 
      });
    }

    console.log('Analysis triggered successfully:', data);

    return res.status(200).json({ 
      success: true, 
      message: 'Analysis started successfully',
      data 
    });

  } catch (error) {
    console.error('Analysis API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
