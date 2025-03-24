
import { FileUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface FileUploadZoneProps {
  id: string;
  label: string;
  file: File | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  accept?: string;
  description?: string;
  buttonText?: string;
  disabled?: boolean;
  required?: boolean;
}

export function FileUploadZone({
  id,
  label,
  file,
  onFileChange,
  accept = "*",
  description = "File max 10MB",
  buttonText = "Select File",
  disabled = false,
  required = false
}: FileUploadZoneProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <div className={`border-2 border-dashed rounded-md p-6 text-center hover:bg-muted/50 transition-colors ${required && !file ? 'border-red-300' : ''}`}>
        <div className="flex flex-col items-center space-y-2">
          <FileUp className={`h-8 w-8 ${required && !file ? 'text-red-400' : 'text-muted-foreground'}`} />
          <p className={`text-sm ${required && !file ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
            {file ? file.name : required ? "File Required - Click to Upload" : "Click to Upload"}
          </p>
          <Input
            id={id}
            type="file"
            accept={accept}
            className="hidden"
            onChange={onFileChange}
            disabled={disabled}
            required={required}
          />
          <Button
            type="button"
            variant={required && !file ? "destructive" : "outline"}
            size="sm"
            onClick={() => document.getElementById(id)?.click()}
            disabled={disabled}
          >
            {buttonText}
          </Button>
          <p className="text-xs text-muted-foreground mt-1">
            {description}
            {required && !file && <span className="block text-red-500 mt-1">This field is required</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
