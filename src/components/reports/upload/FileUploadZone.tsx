
import { ChangeEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { UploadCloud } from "lucide-react";

interface FileUploadZoneProps {
  id: string;
  label: string;
  file: File | null;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  accept: string;
  description?: string;
  buttonText?: string;
  disabled?: boolean;
  required?: boolean;
  isRequired?: boolean;
}

export function FileUploadZone({
  id,
  label,
  file,
  onFileChange,
  accept,
  description,
  buttonText = "Select File",
  disabled = false,
  required = false,
  isRequired = false
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const inputEvent = {
        target: {
          files: e.dataTransfer.files
        }
      } as unknown as ChangeEvent<HTMLInputElement>;
      onFileChange(inputEvent);
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        {label} {isRequired && <span className="text-red-500">*</span>}
      </label>
      
      <div
        className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled) {
            document.getElementById(id)?.click();
          }
        }}
      >
        <input
          id={id}
          type="file"
          onChange={onFileChange}
          accept={accept}
          className="hidden"
          disabled={disabled}
          required={required}
        />
        
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          {file ? (
            <>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  const fileInput = document.getElementById(id) as HTMLInputElement;
                  if (fileInput) {
                    fileInput.value = '';
                    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                }}
              >
                Change File
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">Drag & drop your file here</p>
                <p className="text-sm text-muted-foreground">
                  {description || `Upload a file in ${accept} format`}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={(e) => e.stopPropagation()}
              >
                {buttonText}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
