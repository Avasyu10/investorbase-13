
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useDeckUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const uploadDeck = async (file: File, companyId: string): Promise<string | null> => {
    if (!file || file.type !== 'application/pdf') {
      toast({
        title: "Invalid file",
        description: "Please select a PDF file.",
        variant: "destructive",
      });
      return null;
    }

    setIsUploading(true);

    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${companyId}_deck_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      console.log('Uploading deck to storage:', {
        bucket: 'report-pdfs',
        filePath,
        fileSize: file.size
      });

      // Upload the file to storage
      const { error: uploadError } = await supabase.storage
        .from('report-pdfs')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading deck to storage:', uploadError);
        throw uploadError;
      }

      // Update the companies table with the deck URL
      const { error: updateError } = await supabase
        .from('companies')
        .update({ deck_url: fileName })
        .eq('id', companyId);

      if (updateError) {
        console.error('Error updating company with deck URL:', updateError);
        throw updateError;
      }

      toast({
        title: "Deck uploaded",
        description: "The pitch deck has been uploaded successfully.",
      });

      return fileName;
    } catch (error) {
      console.error('Error uploading deck:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload the deck. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const openDeck = async (deckUrl: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const filePath = `${user.id}/${deckUrl}`;

      // Get the public URL for the file
      const { data } = supabase.storage
        .from('report-pdfs')
        .getPublicUrl(filePath);

      if (data?.publicUrl) {
        window.open(data.publicUrl, '_blank');
      } else {
        throw new Error('Could not generate public URL');
      }
    } catch (error) {
      console.error('Error opening deck:', error);
      toast({
        title: "Error opening deck",
        description: "Could not open the pitch deck. Please try again.",
        variant: "destructive",
      });
    }
  };

  return {
    uploadDeck,
    openDeck,
    isUploading
  };
}
