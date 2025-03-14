
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
}

export function FileUploadZone({
  id,
  label,
  file,
  onFileChange,
  accept = "*",
  description = "File max 10MB",
  buttonText = "Select File",
  disabled = false
}: FileUploadZoneProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="border-2 border-dashed rounded-md p-6 text-center hover:bg-muted/50 transition-colors">
        <div className="flex flex-col items-center space-y-2">
          <FileUp className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {file ? file.name : "Drag and drop or click to upload"}
          </p>
          <Input
            id={id}
            type="file"
            accept={accept}
            className="hidden"
            onChange={onFileChange}
            disabled={disabled}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById(id)?.click()}
            disabled={disabled}
          >
            {buttonText}
          </Button>
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
