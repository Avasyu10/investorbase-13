
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function BarcConfirmationEmail() {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeHandler = async () => {
      console.log('Initializing BARC confirmation email handler');
      
      try {
        // Add a unique request identifier
        const requestId = Date.now().toString();
        console.log(`Request ID: ${requestId}`);
        
        // Check if the RESEND_API_KEY is configured
        const { data: secrets } = await supabase.functions.listSecrets();
        const hasResendApiKey = secrets?.some(secret => secret.name === 'RESEND_API_KEY');
        
        if (!hasResendApiKey) {
          throw new Error('RESEND_API_KEY is not configured in Supabase Edge Functions');
        }
        
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
          setError(response.error.message || 'Unknown error');
          throw new Error(response.error.message || 'Unknown error');
        }
        
        setInitialized(true);
        setError(null);
        console.log(`BARC confirmation email handler initialized successfully (${requestId})`);
      } catch (error) {
        console.error('Error initializing BARC confirmation email handler:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
        
        toast({
          title: "Email Handler Error",
          description: error instanceof Error ? error.message : "Could not initialize email handler",
          variant: "destructive"
        });
      }
    };
    
    initializeHandler();
  }, []);

  // For debugging purposes, render some information
  if (process.env.NODE_ENV === 'development') {
    return (
      <div style={{ display: 'none' }}>
        {/* Hidden div with debug info */}
        <div data-handler-initialized={initialized} data-handler-error={error}></div>
      </div>
    );
  }

  // In production, don't render anything
  return null;
}
