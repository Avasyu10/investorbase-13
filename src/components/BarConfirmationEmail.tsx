
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function BarcConfirmationEmail() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initializeHandler = async () => {
      console.log('Initializing BARC confirmation email handler');
      
      try {
        // Add a unique request identifier
        const requestId = Date.now().toString();
        console.log(`Request ID: ${requestId}`);
        
        // Call the edge function to initialize the subscription
        const response = await supabase.functions.invoke('barc_confirmation_email', {
          body: { 
            init: true,
            requestId 
          }
        });
        
        console.log(`BARC confirmation email handler response (${requestId}):`, response);
        
        if (response.error) {
          console.error(`Error from edge function (${requestId}):`, response.error);
          throw new Error(response.error.message || 'Unknown error');
        }
        
        setInitialized(true);
        console.log(`BARC confirmation email handler initialized successfully (${requestId})`);
      } catch (error) {
        console.error('Error initializing BARC confirmation email handler:', error);
        
        toast({
          title: "Email Handler Error",
          description: error instanceof Error ? error.message : "Could not initialize email handler",
          variant: "destructive"
        });
      }
    };
    
    initializeHandler();
  }, []);

  // This component doesn't render anything
  return null;
}
