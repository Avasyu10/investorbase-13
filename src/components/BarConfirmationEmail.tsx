
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function BarcConfirmationEmail() {
  useEffect(() => {
    console.log('Initializing BARC confirmation email handler');
    
    // Call the edge function to initialize the subscription
    supabase.functions.invoke('barc_confirmation_email')
      .then(response => {
        console.log('BARC confirmation email handler response:', response);
        
        if (response.error) {
          console.error('Error from BARC confirmation email handler:', response.error);
          toast({
            title: 'Error initializing email confirmations',
            description: `Failed to initialize: ${response.error.message || 'Unknown error'}`,
            variant: "destructive"
          });
          return;
        }
        
        if (response.data?.success) {
          console.log('BARC confirmation email handler initialized successfully');
          toast({
            title: 'Email confirmations initialized',
            description: 'The system is now ready to send confirmation emails for new submissions.',
          });
        }
      })
      .catch(error => {
        console.error('Error initializing BARC confirmation email handler:', error);
        
        // Log detailed error information
        if (error.message) console.error('Error message:', error.message);
        if (error.stack) console.error('Error stack:', error.stack);
        console.error('Full error object:', JSON.stringify(error, null, 2));
        
        toast({
          title: 'Failed to initialize email confirmations',
          description: `Error: ${error.message || 'Unknown error occurred'}`,
          variant: "destructive"
        });
      });
      
  }, []);

  // This component doesn't render anything
  return null;
}
