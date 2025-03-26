
import { useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function RealtimeSubscriptions() {
  const [processingSubmissions, setProcessingSubmissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    console.log('Setting up realtime subscription for email_pitch_submissions');
    
    // Subscribe to email pitch submissions
    const channel = supabase
      .channel('email_pitch_submissions_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'email_pitch_submissions'
        },
        (payload) => {
          console.log('New email pitch submission detected:', payload);
          
          // Get the submission ID
          const submissionId = payload.new.id;
          console.log(`Submission ID: ${submissionId}`);
          
          // Prevent duplicate processing
          if (processingSubmissions[submissionId]) {
            console.log(`Already processing submission ${submissionId}, skipping`);
            return;
          }

          setProcessingSubmissions(prev => ({...prev, [submissionId]: true}));
          
          // Create a new report directly through the database instead of calling the edge function
          handleNewSubmission(submissionId, payload.new)
            .finally(() => {
              setProcessingSubmissions(prev => {
                const updated = {...prev};
                delete updated[submissionId];
                return updated;
              });
            });
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });
    
    // Return cleanup function
    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, []);

  // Process the submission directly without calling the edge function
  const handleNewSubmission = async (submissionId: string, submissionData: any) => {
    try {
      console.log(`Processing submission: ${submissionId}`);
      
      // First, check if this submission has already been processed
      const { data: existingSubmission, error: checkError } = await supabase
        .from('email_pitch_submissions')
        .select('report_id')
        .eq('id', submissionId)
        .single();
      
      if (checkError) {
        console.error('Error checking submission:', checkError);
        throw checkError;
      }
      
      if (existingSubmission.report_id) {
        console.log(`Submission ${submissionId} already has report_id ${existingSubmission.report_id}, skipping`);
        return;
      }
      
      if (!submissionData.attachment_url) {
        console.error('No attachment URL found for submission:', submissionId);
        toast({
          title: 'Missing attachment',
          description: `Email pitch submission ${submissionId} has no attachment.`,
          variant: "destructive"
        });
        return;
      }
      
      console.log(`Creating report for submission: ${submissionId}`);
      
      // 1. Create a new report directly
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .insert({
          title: `Email Pitch from ${submissionData.sender_email || 'unknown'}`,
          description: "Auto-generated from email pitch submission",
          pdf_url: submissionData.attachment_url,
          is_public_submission: true,
          analysis_status: 'pending'
        })
        .select()
        .single();
      
      if (reportError) {
        console.error('Error creating report:', reportError);
        toast({
          title: 'Error processing submission',
          description: `Failed to create report: ${reportError.message}`,
          variant: "destructive"
        });
        return;
      }
      
      console.log(`Report created with ID: ${report.id}`);
      
      // 2. Update the submission with the report ID
      const { error: updateError } = await supabase
        .from('email_pitch_submissions')
        .update({ report_id: report.id })
        .eq('id', submissionId);
      
      if (updateError) {
        console.error('Error updating submission with report ID:', updateError);
        // Continue despite this error
      }
      
      // 3. Now call the analyze-email-pitch-pdf function to process the report
      console.log(`Initiating analysis for report: ${report.id}`);
      
      // Use the invoke method which properly handles the URL formation
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        'analyze-email-pitch-pdf',
        {
          body: { reportId: report.id }
        }
      );
      
      if (analysisError) {
        console.error('Error analyzing report:', analysisError);
        toast({
          title: 'Analysis failed',
          description: `Failed to analyze submission: ${analysisError.message}`,
          variant: "destructive"
        });
        return;
      }
      
      console.log('Analysis completed:', analysisData);
      
      toast({
        title: 'New pitch submission',
        description: `Successfully processed submission from ${submissionData.sender_email || 'unknown'}`,
      });
      
    } catch (error) {
      console.error('Error processing submission:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      toast({
        title: 'Error processing submission',
        description: `Failed to process submission: ${errorMessage}`,
        variant: "destructive"
      });
    }
  };

  // This component doesn't render anything
  return null;
}
