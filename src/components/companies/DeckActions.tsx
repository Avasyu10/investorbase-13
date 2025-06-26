
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, ArrowRight } from 'lucide-react';
import { useDeckUpload } from '@/hooks/useDeckUpload';

interface DeckActionsProps {
  companyId: string;
  deckUrl?: string;
  onDeckUpdated?: (deckUrl: string) => void;
}

export function DeckActions({ companyId, deckUrl, onDeckUpdated }: DeckActionsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadDeck, openDeck, isUploading } = useDeckUpload();

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const uploadedDeckUrl = await uploadDeck(file, companyId);
      if (uploadedDeckUrl && onDeckUpdated) {
        onDeckUpdated(uploadedDeckUrl);
      }
    }
    // Reset the input value to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenDeck = () => {
    if (deckUrl) {
      openDeck(deckUrl);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        className="hidden"
      />
      
      {/* Only show upload button if no deck exists */}
      {!deckUrl && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleUploadClick}
          disabled={isUploading}
          className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
          title="Upload deck"
        >
          <Upload className="h-4 w-4" />
        </Button>
      )}

      {/* Only show redirection button if deck exists */}
      {deckUrl && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenDeck}
          className="h-8 w-8 p-0 text-green-500 hover:text-green-700 hover:bg-green-50"
          title="Open deck"
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
