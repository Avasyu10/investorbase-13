
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function BarcConfirmationEmail() {
  useEffect(() => {
    console.log('Initializing BARC confirmation email handler');
    
    // Call the edge function to initialize the subscription
    supabase.functions.invoke('barc_confirmation_email')
      .then(response => {
        console.log('BARC confirmation email handler response:', response);
      })
      .catch(error => {
        console.error('Error initializing BARC confirmation email handler:', error);
      });
      
  }, []);

  // This component doesn't render anything
  return null;
}
