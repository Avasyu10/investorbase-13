
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { FileText, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileUploadZoneProps {
  onFileAccepted: (file: File) => void;
  onFileRejected?: (errorMessage: string) => void;
  description?: string;
  buttonText?: string;
  disabled?: boolean;
  required?: boolean;
}

export function FileUploadZone({
  onFileAccepted,
  onFileRejected,
  description = "Drag and drop a file here, or click to select",
  buttonText = "Select File",
  disabled = false,
  required = false
}: FileUploadZoneProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      const errorMessages = rejectedFiles.map(rejection => 
        rejection.errors.map((err: any) => err.message).join(', ')
      ).join('; ');
      
      setError(errorMessages);
      setFile(null);
      
      if (onFileRejected) {
        onFileRejected(errorMessages);
      }
      return;
    }
    
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      setError(null);
      onFileAccepted(selectedFile);
    }
  }, [onFileAccepted, onFileRejected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 1,
    disabled: disabled,
  });

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
  };

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
        isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50",
        disabled && "opacity-50 cursor-not-allowed",
        error && "border-destructive hover:border-destructive"
      )}
    >
      <input {...getInputProps()} required={required} />
      
      {file ? (
        <div className="flex items-center justify-center space-x-2">
          <FileText className="h-6 w-6 text-primary" />
          <span className="font-medium text-sm truncate max-w-[200px]">
            {file.name}
          </span>
          <span className="text-xs text-muted-foreground">
            ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 rounded-full"
            onClick={removeFile}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Remove file</span>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="rounded-full bg-primary/10 p-2">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-medium">
              {buttonText}
              {required && <span className="text-destructive ml-1">*</span>}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {description}
            </p>
          </div>
          {error && (
            <p className="text-sm text-destructive mt-2">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
